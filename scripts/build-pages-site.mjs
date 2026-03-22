import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const outputDir = path.join(repoRoot, "pages-site");
const reportSourceDir = path.join(repoRoot, "playwright-report");
const reportTargetDir = path.join(outputDir, "playwright-report", "latest");

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "todo";
const repoUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
    : "https://github.com/mustafa-masetic/todo";
const actionsUrl = `${repoUrl}/actions`;
const reportRelativeUrl = "./playwright-report/latest/";

mkdirSync(outputDir, { recursive: true });
mkdirSync(reportTargetDir, { recursive: true });

const homepage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${repoName} Pages</title>
    <style>
      :root {
        --bg: #07111f;
        --panel: #111b2f;
        --panel-2: #16233b;
        --border: rgba(111, 140, 182, 0.28);
        --text: #e9eef8;
        --muted: #9fb0cb;
        --accent: #35c7ff;
        --accent-soft: rgba(53, 199, 255, 0.16);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(53, 199, 255, 0.16), transparent 28%),
          linear-gradient(180deg, #091425 0%, var(--bg) 100%);
        color: var(--text);
      }

      main {
        width: min(1040px, calc(100% - 48px));
        margin: 56px auto;
      }

      .hero,
      .section {
        background: linear-gradient(180deg, rgba(17, 27, 47, 0.95), rgba(12, 21, 38, 0.95));
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
      }

      .hero {
        padding: 36px;
        margin-bottom: 24px;
      }

      h1, h2 {
        margin: 0;
        line-height: 1.05;
      }

      h1 {
        font-size: clamp(40px, 6vw, 68px);
        letter-spacing: -0.04em;
      }

      h2 {
        font-size: 24px;
        margin-bottom: 16px;
      }

      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
        font-size: 18px;
      }

      .hero p {
        max-width: 760px;
        margin-top: 16px;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 28px;
      }

      .button,
      .ghost {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 20px;
        border-radius: 18px;
        text-decoration: none;
        font-weight: 700;
        letter-spacing: -0.01em;
      }

      .button {
        color: #062033;
        background: linear-gradient(135deg, #52e0ff, #24b7ff);
        box-shadow: 0 12px 32px rgba(36, 183, 255, 0.22);
      }

      .ghost {
        color: var(--text);
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.03);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 18px;
      }

      .section {
        padding: 28px;
        margin-bottom: 24px;
      }

      .card {
        padding: 22px;
        border-radius: 22px;
        border: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(22, 35, 59, 0.9), rgba(14, 24, 42, 0.95));
      }

      .eyebrow {
        display: inline-block;
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .card h3 {
        margin: 0 0 10px;
        font-size: 20px;
      }

      .card p {
        font-size: 15px;
      }

      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.95em;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <span class="eyebrow">GitHub Pages</span>
        <h1>Todo Project Hub</h1>
        <p>
          This Pages site keeps the default project landing page at the root and
          publishes the latest Playwright HTML report under a stable subpath.
          Use this as the entry point for the repo, staging verification, and
          the freshest end-to-end results.
        </p>
        <div class="actions">
          <a class="button" href="${reportRelativeUrl}">Open Latest Playwright Report</a>
          <a class="ghost" href="${repoUrl}">Open Repository</a>
          <a class="ghost" href="${actionsUrl}">Open Actions</a>
        </div>
      </section>

      <section class="section">
        <h2>Published Paths</h2>
        <div class="grid">
          <article class="card">
            <h3>Home</h3>
            <p><code>/</code> keeps the default landing page for the repository.</p>
          </article>
          <article class="card">
            <h3>Playwright Report</h3>
            <p><code>/playwright-report/latest/</code> always points to the latest uploaded HTML report.</p>
          </article>
          <article class="card">
            <h3>Workflow Source</h3>
            <p>The Pages artifact is built by GitHub Actions, not by the default branch-based Pages build.</p>
          </article>
        </div>
      </section>
    </main>
  </body>
</html>
`;

writeFileSync(path.join(outputDir, "index.html"), homepage);
writeFileSync(path.join(outputDir, ".nojekyll"), "");

if (existsSync(reportSourceDir)) {
  cpSync(reportSourceDir, reportTargetDir, { recursive: true });
} else {
  writeFileSync(
    path.join(reportTargetDir, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Playwright Report Unavailable</title>
  </head>
  <body style="font-family: sans-serif; padding: 32px;">
    <h1>Playwright report not available</h1>
    <p>The test run finished without generating an HTML report.</p>
    <p><a href="../../">Back to homepage</a></p>
  </body>
</html>`,
  );
}

console.log(`Built Pages site in ${outputDir}`);
