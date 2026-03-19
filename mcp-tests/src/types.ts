import type { Browser, BrowserContext, Page } from "@playwright/test";

export interface SpecPhase {
  index: number;
  key: string;
  title: string;
  content: string;
}

export interface SpecDocument {
  title: string;
  rawContent: string;
  phases: SpecPhase[];
}

export interface RuntimeVariables {
  applicationUrl?: string;
  availableSessionPaths: string[];
  selectedSessionPath?: string;
  targetSpaceName?: string;
}

export interface ExecutionContext {
  spec: SpecDocument;
  phase: SpecPhase;
  runtime: RuntimeVariables;
  artifactsDir: string;
  browser: Browser;
  playwrightContext: BrowserContext;
  page: Page;
}

export interface ExecutionResult {
  phaseKey: string;
  phaseTitle: string;
  success: boolean;
  startedAt: string;
  completedAt: string;
  summary: string;
  issues: string[];
  artifacts: {
    tracePath?: string;
    screenshotPaths: string[];
    summaryPath: string;
  };
  prompts: {
    system: string;
    user: string;
  };
  modelResponse?: Record<string, unknown>;
}
