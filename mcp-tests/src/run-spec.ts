import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import process from "node:process";

import { chromium } from "@playwright/test";

import { buildPhasePrompt } from "./prompt-builder.js";
import { loadSpec } from "./spec-loader.js";
import type { ExecutionContext, ExecutionResult, RuntimeVariables, SpecPhase } from "./types.js";
import { createContext } from "../tools/browser/sessions.js";
import { startTrace, stopTrace } from "../tools/browser/tracing.js";

const DEFAULT_SPEC_PATH = resolve(process.cwd(), "mcp-tests/specs/invite-and-accept-invitation.md");
const ARTIFACTS_ROOT = resolve(process.cwd(), "mcp-tests/artifacts");

async function main(): Promise<void> {
  const specPath = resolve(process.argv[2] ?? DEFAULT_SPEC_PATH);
  const spec = await loadSpec(specPath);
  const specArtifactsDir = join(ARTIFACTS_ROOT, slugify(basename(specPath, extname(specPath))));

  await mkdir(specArtifactsDir, { recursive: true });

  for (const phase of spec.phases) {
    const runtime = extractRuntimeVariables(spec.rawContent, phase);
    const result = await runPhase(specPath, spec, phase, runtime, specArtifactsDir);

    await writeFile(result.artifacts.summaryPath, JSON.stringify(result, null, 2), "utf8");
  }
}

async function runPhase(
  specPath: string,
  spec: Awaited<ReturnType<typeof loadSpec>>,
  phase: SpecPhase,
  runtime: RuntimeVariables,
  specArtifactsDir: string,
): Promise<ExecutionResult> {
  const phaseArtifactsDir = join(specArtifactsDir, phase.key);
  const tracePath = join(phaseArtifactsDir, "trace.zip");
  const summaryPath = join(phaseArtifactsDir, "execution-summary.json");
  const screenshotPath = join(phaseArtifactsDir, "page.png");
  const startedAt = new Date().toISOString();

  await mkdir(phaseArtifactsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const playwrightContext = await createContext(browser, runtime.selectedSessionPath);
  const page = await playwrightContext.newPage();
  const prompt = buildPhasePrompt(phase, runtime);

  let success = false;
  const issues: string[] = [];
  let modelResponse: Record<string, unknown> | undefined;

  try {
    await startTrace(playwrightContext);

    if (runtime.applicationUrl) {
      await page.goto(runtime.applicationUrl, { waitUntil: "domcontentloaded" });
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } else {
      issues.push("Application URL was not found in the spec.");
    }

    modelResponse = await executePhaseWithAgent({
      spec,
      phase,
      runtime,
      artifactsDir: phaseArtifactsDir,
      browser,
      playwrightContext,
      page,
    });
    success = Boolean(modelResponse.success ?? false);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Unknown execution error");
  } finally {
    await stopTrace(playwrightContext, tracePath);
    await playwrightContext.close();
    await browser.close();
  }

  return {
    phaseKey: phase.key,
    phaseTitle: phase.title,
    success,
    startedAt,
    completedAt: new Date().toISOString(),
    summary: success
      ? `Completed ${phase.title}.`
      : `Phase ${phase.title} is scaffolded. Live agent execution still needs OpenAI SDK wiring.`,
    issues,
    artifacts: {
      tracePath,
      screenshotPaths: runtime.applicationUrl ? [screenshotPath] : [],
      summaryPath,
    },
    prompts: prompt,
    modelResponse,
  };
}

async function executePhaseWithAgent(context: ExecutionContext): Promise<Record<string, unknown>> {
  const prompt = buildPhasePrompt(context.phase, context.runtime);

  // TODO: Replace this placeholder with an OpenAI SDK call that submits the
  // prompt and routes tool calls into the Playwright runtime for this phase.
  return {
    success: false,
    summary: "OpenAI SDK integration is not implemented yet.",
    issues: [],
    evidence: {
      promptPreview: prompt.user.slice(0, 200),
      artifactsDir: context.artifactsDir,
    },
  };
}

function extractRuntimeVariables(markdown: string, phase: SpecPhase): RuntimeVariables {
  const availableSessionPaths = Array.from(
    new Set(markdown.match(/\/[^\s]+\.json/g) ?? []),
  );
  const applicationUrl = markdown.match(/https?:\/\/\S+/)?.[0];
  const targetSpaceName = matchSectionValue(markdown, "Target space");
  const selectedSessionPath = selectSessionPath(phase, availableSessionPaths);

  return {
    applicationUrl,
    availableSessionPaths,
    selectedSessionPath,
    targetSpaceName,
  };
}

function selectSessionPath(phase: SpecPhase, sessionPaths: string[]): string | undefined {
  const phaseSessions = Array.from(new Set(phase.content.match(/\/[^\s]+\.json/g) ?? []));

  if (phaseSessions.length > 0) {
    return phaseSessions[0];
  }

  const normalizedTitle = phase.title.toLowerCase();
  if (normalizedTitle.includes("invited user")) {
    return sessionPaths.find((sessionPath) => sessionPath.toLowerCase().includes("playwright-tasks"));
  }
  if (normalizedTitle.includes("admin")) {
    return sessionPaths.find((sessionPath) => sessionPath.toLowerCase().includes("mustafa"));
  }

  return sessionPaths[0];
}

function matchSectionValue(markdown: string, heading: string): string | undefined {
  const sectionPattern = new RegExp(`##\\s+${escapeRegExp(heading)}\\s+\\n\\n([^\\n]+)`, "m");
  return markdown.match(sectionPattern)?.[1]?.trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

void main().catch((error: unknown) => {
  process.exitCode = 1;

  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Failed to run spec in ${dirname(DEFAULT_SPEC_PATH)}\n${message}`);
});
