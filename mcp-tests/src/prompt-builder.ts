import type { RuntimeVariables, SpecPhase } from "./types.js";

export interface AgentPrompt {
  system: string;
  user: string;
}

export function buildPhasePrompt(phase: SpecPhase, runtime: RuntimeVariables): AgentPrompt {
  const sessionList = runtime.availableSessionPaths.length > 0
    ? runtime.availableSessionPaths.map((sessionPath) => `- ${sessionPath}`).join("\n")
    : "- none";

  const sessionHint = runtime.selectedSessionPath
    ? `Use this stored Playwright session for the phase: ${runtime.selectedSessionPath}`
    : "No specific session was selected for this phase.";

  return {
    system: [
      "You are executing a live browser workflow.",
      "Use browser automation tools against the running application.",
      "Do not generate code or Playwright test files.",
      "Interact with the UI directly and return structured execution results.",
      "Prefer visible elements and report issues clearly if the UI differs from the spec.",
    ].join("\n"),
    user: [
      `Phase: ${phase.title}`,
      runtime.applicationUrl ? `Application URL: ${runtime.applicationUrl}` : "Application URL: not provided",
      runtime.targetSpaceName ? `Target space: ${runtime.targetSpaceName}` : "Target space: not provided",
      sessionHint,
      "Available sessions:",
      sessionList,
      "Return JSON with keys: success, summary, issues, evidence.",
      "Phase instructions:",
      phase.content,
    ].join("\n\n"),
  };
}
