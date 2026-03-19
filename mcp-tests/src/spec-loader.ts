import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import type { SpecDocument, SpecPhase } from "./types.js";

const PHASE_HEADING_PATTERN = /^##\s+(Phase[^\n]*)$/gm;
const TITLE_PATTERN = /^#\s+(.+)$/m;

export async function loadSpec(specPath: string): Promise<SpecDocument> {
  const rawContent = await readFile(specPath, "utf8");
  const title = extractTitle(rawContent, specPath);
  const phases = extractPhases(rawContent);

  return {
    title,
    rawContent,
    phases,
  };
}

function extractTitle(markdown: string, specPath: string): string {
  const headingMatch = markdown.match(TITLE_PATTERN);

  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  return basename(specPath, extname(specPath));
}

function extractPhases(markdown: string): SpecPhase[] {
  const matches = [...markdown.matchAll(PHASE_HEADING_PATTERN)];

  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const title = match[1].trim();
    const startIndex = match.index ?? 0;
    const contentStart = startIndex + match[0].length;
    const nextMatch = matches[index + 1];
    const contentEnd = nextMatch?.index ?? markdown.length;
    const content = markdown.slice(contentStart, contentEnd).trim();

    return {
      index: index + 1,
      key: `phase-${index + 1}`,
      title,
      content,
    };
  });
}
