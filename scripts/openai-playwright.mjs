import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const rawArgs = process.argv.slice(2);
const mcpUrl = process.env.PLAYWRIGHT_MCP_URL || "http://localhost:8931/mcp";
const debug = process.env.OPENAI_PLAYWRIGHT_DEBUG === "true";
const keepSessionOpen = process.env.OPENAI_PLAYWRIGHT_KEEP_BROWSER_OPEN === "true";
const maxToolRounds = Number(process.env.OPENAI_PLAYWRIGHT_MAX_TOOL_ROUNDS || "40");
const allowedToolNames = new Set([
  "browser_navigate",
  "browser_snapshot",
  "browser_click",
  "browser_type",
  "browser_select_option",
  "browser_press_key",
  "browser_wait_for",
  "browser_hover",
  "browser_evaluate",
]);
const localToolNames = new Set(["login_with_env_credentials"]);
const runId = `pw-mcp-${new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d+Z$/, "Z")
  .replace("T", "-")
  .replace("Z", "")}-${randomUUID().slice(0, 8)}`;

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY.");
  console.error('Example: export OPENAI_API_KEY="sk-..."');
  process.exit(1);
}

function loadPrompt(args) {
  const joined = args.join(" ").trim();

  if (!joined) {
    return { text: "", source: "inline" };
  }

  if (args.length === 1) {
    const candidatePath = resolve(args[0]);

    if (existsSync(candidatePath) && statSync(candidatePath).isFile()) {
      return {
        text: readFileSync(candidatePath, "utf8"),
        source: candidatePath,
      };
    }
  }

  return { text: joined, source: "inline" };
}

const promptInput = loadPrompt(rawArgs);
const prompt = promptInput.text.trim();

if (!prompt) {
  console.error('Usage: pnpm openai:playwright "Open example.com and tell me the page title."');
  console.error("   or: pnpm openai:playwright ./mcp-tests/create-space-tasks.md");
  process.exit(1);
}

function logDebug(message, payload) {
  if (!debug) {
    return;
  }

  if (payload === undefined) {
    console.error(`[debug] ${message}`);
    return;
  }

  console.error(`[debug] ${message}`, payload);
}

function isExpectedShutdownError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("SSE stream disconnected: AbortError") || message.includes("This operation was aborted");
}

function logRun(message, payload) {
  if (payload === undefined) {
    console.error(`[${runId}] ${message}`);
    return;
  }

  console.error(`[${runId}] ${message}`, payload);
}

function logResponseMeta(label, response) {
  const usage = response?.usage
    ? {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.total_tokens,
      }
    : null;

  logRun(label, {
    response_id: response?.id,
    status: response?.status,
    usage,
    output_types: (response?.output || []).map((item) => item.type),
  });
}

function toOpenAiTool(tool) {
  return {
    type: "function",
    name: tool.name,
    description: tool.description || `Call MCP tool ${tool.name}`,
    parameters: tool.inputSchema || {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
  };
}

function getLocalTools() {
  return [
    {
      type: "function",
      name: "login_with_env_credentials",
      description:
        "Fill the login form using the provided email and the local E2E_PASSWORD environment variable, then submit it. Use this instead of typing the password directly.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "The email address to use for login.",
          },
          emailSelector: {
            type: "string",
            description: "Optional selector for the email field.",
          },
          passwordSelector: {
            type: "string",
            description: "Optional selector for the password field.",
          },
          submitSelector: {
            type: "string",
            description: "Optional selector for the submit button.",
          },
        },
        required: ["email"],
        additionalProperties: false,
      },
    },
  ];
}

function stringifyToolResult(result) {
  if (!result) {
    return "";
  }

  if (Array.isArray(result.content)) {
    return result.content
      .map((item) => {
        if (item.type === "text") {
          return item.text;
        }

        return JSON.stringify(item);
      })
      .join("\n\n");
  }

  return JSON.stringify(result);
}

async function callMcpTool(name, args) {
  return mcpClient.callTool({
    name,
    arguments: args,
  });
}

async function callLocalTool(name, args) {
  switch (name) {
    case "login_with_env_credentials": {
      const password = process.env.E2E_PASSWORD;

      if (!password) {
        throw new Error("Missing E2E_PASSWORD in the local environment.");
      }

      const emailSelector =
        args.emailSelector ||
        '[data-test-id="auth-email-input"], input[type="email"], input[name="email"], input[autocomplete="email"]';
      const passwordSelector =
        args.passwordSelector ||
        '[data-test-id="auth-password-input"], input[type="password"], input[name="password"], input[autocomplete="current-password"]';

      await callMcpTool("browser_click", {
        selector: emailSelector,
      }).catch(() => {});

      await callMcpTool("browser_evaluate", {
        function: `() => {
          const fill = (selector, value) => {
            const element = document.querySelector(selector);
            if (!element) {
              return { ok: false, selector, reason: "not_found" };
            }

            const prototype = Object.getPrototypeOf(element);
            const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
            const setValue = descriptor && descriptor.set;

            element.focus();
            if (setValue) {
              setValue.call(element, value);
            } else {
              element.value = value;
            }
            element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "a" }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
            element.dispatchEvent(new Event("blur", { bubbles: true }));
            return { ok: true, selector };
          };

          const emailResult = fill(${JSON.stringify(emailSelector.split(",")[0].trim())}, ${JSON.stringify(args.email)});
          const passwordResult = fill(${JSON.stringify(passwordSelector.split(",")[0].trim())}, ${JSON.stringify(password)});

          return {
            emailResult,
            passwordResult
          };
        }`,
      });

      await callMcpTool("browser_press_key", {
        key: "Tab",
      });

      await callMcpTool("browser_wait_for", {
        seconds: 0.3,
      });

      await callMcpTool("browser_press_key", {
        key: "Enter",
      });

      return {
        ok: true,
        email: args.email,
        passwordSource: "E2E_PASSWORD",
        submitted: true,
        submitMethod: "Enter",
      };
    }
    default:
      throw new Error(`Unsupported local tool: ${name}`);
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const mcpClient = new Client(
  {
    name: `todo-app-openai-playwright-${runId}`,
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

let shuttingDown = false;

transport.onerror = (error) => {
  if (shuttingDown && isExpectedShutdownError(error)) {
    logDebug("Ignoring expected MCP transport shutdown", error instanceof Error ? error.message : String(error));
    return;
  }

  console.error("MCP transport error:", error instanceof Error ? error.message : String(error));
};

transport.onclose = () => {
  logDebug("MCP transport closed");
};

mcpClient.onerror = (error) => {
  if (shuttingDown && isExpectedShutdownError(error)) {
    logDebug("Ignoring expected MCP client shutdown", error instanceof Error ? error.message : String(error));
    return;
  }

  console.error("MCP client error:", error instanceof Error ? error.message : String(error));
};

try {
  logRun("Starting run", {
    prompt_source: promptInput.source,
    mcp_url: mcpUrl,
    keep_session_open: keepSessionOpen,
  });
  await mcpClient.connect(transport);
  logDebug("MCP connected", {
    sessionId: transport.sessionId,
    protocolVersion: transport.protocolVersion,
    serverVersion: mcpClient.getServerVersion(),
  });
  logRun("MCP connected", {
    session_id: transport.sessionId,
    protocol_version: transport.protocolVersion,
    server_version: mcpClient.getServerVersion(),
  });

  const toolsResult = await mcpClient.listTools();
  const mcpTools = (toolsResult.tools || []).filter((tool) => allowedToolNames.has(tool.name));
  const localTools = getLocalTools();

  if (mcpTools.length === 0) {
    console.error(`No usable Playwright MCP tools were returned by ${mcpUrl}`);
    process.exit(1);
  }

  console.error(
    `[${runId}] Loaded ${mcpTools.length} MCP tools from ${mcpUrl} using session ${transport.sessionId ?? "<none>"}:`
  );
  for (const tool of mcpTools) {
    const description = tool.description ? ` - ${tool.description}` : "";
    console.error(`- ${tool.name}${description}`);
  }

  for (const tool of localTools) {
    console.error(`- ${tool.name} - local client-side credential helper`);
  }

  const openAiTools = [...mcpTools.map(toOpenAiTool), ...localTools];

  let response = await openai.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text:
              "You are controlling a local Playwright MCP server through client-provided function tools. Prefer browser_navigate, browser_snapshot, browser_click, browser_type, browser_select_option, browser_press_key, and browser_wait_for. Use login_with_env_credentials for login flows instead of typing or inventing a password. After navigating, use browser_snapshot before interacting so you can inspect the current page state. Be concise in your final answer.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: prompt,
          },
        ],
      },
    ],
    tools: openAiTools,
  });

  logResponseMeta("Initial OpenAI response", response);
  logDebug("Initial response received", {
    id: response.id,
    outputTypes: (response.output || []).map((item) => item.type),
  });

  for (let i = 0; i < maxToolRounds; i += 1) {
    logRun(`Tool round ${i + 1}/${maxToolRounds}`);
    const toolCalls = (response.output || []).filter((item) => item.type === "function_call");

    if (toolCalls.length === 0) {
      console.log(response.output_text);
      break;
    }

    const toolOutputs = [];

    for (const call of toolCalls) {
      const args = JSON.parse(call.arguments || "{}");
      logRun(`Tool call: ${call.name}`);
      logDebug(`Calling tool: ${call.name}`, localToolNames.has(call.name) ? { ...args, password: "<redacted>" } : args);

      try {
        const result = localToolNames.has(call.name)
          ? await callLocalTool(call.name, args)
          : await callMcpTool(call.name, args);

        logRun(`Tool result: ${call.name}`);
        logDebug(`Tool result: ${call.name}`, result);

        toolOutputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: stringifyToolResult(result),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logRun(`Tool error: ${call.name}`, { message });
        logDebug(`Tool error: ${call.name}`, message);
        throw error;
      }
    }

    response = await openai.responses.create({
      model: "gpt-5",
      previous_response_id: response.id,
      input: toolOutputs,
      tools: openAiTools,
    });

    logResponseMeta("Follow-up OpenAI response", response);
    logDebug("Follow-up response received", {
      id: response.id,
      outputTypes: (response.output || []).map((item) => item.type),
    });
  }

  throw new Error(`Tool loop limit reached (${maxToolRounds} rounds) before the model produced a final answer.`);

  if (keepSessionOpen) {
    logRun("Keeping MCP session open because OPENAI_PLAYWRIGHT_KEEP_BROWSER_OPEN=true. Press Ctrl+C to exit.");
    await new Promise(() => {});
  }
} finally {
  if (!keepSessionOpen) {
    shuttingDown = true;
    logRun("Closing MCP transport");
    await transport.close().catch(() => {});
  }
}
