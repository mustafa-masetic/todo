import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const testDataDir = path.join(rootDir, "test-data");
const dbDir = path.join(rootDir, "server", "data");
const dbBase = path.join(dbDir, "todo.db");

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
    return true;
  }
  return false;
}

function normalizePathForFs(p) {
  if (process.platform === "win32" && p.startsWith("/")) {
    return p.slice(1);
  }
  return p;
}

const normalizedRoot = normalizePathForFs(rootDir);
const normalizedTestDataDir = normalizePathForFs(testDataDir);
const normalizedDbDir = normalizePathForFs(dbDir);
const normalizedDbBase = normalizePathForFs(dbBase);

fs.mkdirSync(normalizedTestDataDir, { recursive: true });
fs.mkdirSync(normalizedDbDir, { recursive: true });

const removedDb = [
  normalizedDbBase,
  `${normalizedDbBase}-shm`,
  `${normalizedDbBase}-wal`
].filter(removeIfExists);

const firstNames = [
  "Mustafa",
  "Lena",
  "Marcus",
  "Priya",
  "Noah",
  "Iris",
  "Mateo",
  "Amina",
  "Jonah",
  "Sofia"
];
const lastNames = [
  "Masetic",
  "Kovac",
  "Reed",
  "Patel",
  "Nolan",
  "Berg",
  "Alvarez",
  "Hassan",
  "Frost",
  "Silva"
];
const genders = ["female", "male", "other", "prefer_not_to_say"];

const users = Array.from({ length: 10 }, (_, i) => {
  const id = i + 1;
  const firstName = firstNames[i];
  const lastName = lastNames[i];
  return {
    id,
    firstName,
    lastName,
    gender:
      firstName === "Mustafa" && lastName === "Masetic"
        ? "male"
        : genders[i % genders.length],
    email:
      firstName === "Mustafa" && lastName === "Masetic"
        ? "mustafa.masetic@example.com"
        : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(firstName + " " + lastName)}`,
    searchVisible: 1,
    preferredTheme: ["light", "dark", "system"][i % 3],
    isAdmin: firstName === "Mustafa" && lastName === "Masetic" ? 1 : 0,
    password: "TestPass123!",
    createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString()
  };
});

const spaceNames = [
  "Platform Reliability & Incident Management",
  "CI/CD Optimization & Test Automation",
  "Project Delivery & Sprint Planning",
  "QA Strategy & Regression Coverage",
  "Release Readiness & Change Control",
  "Developer Experience Improvements",
  "Frontend Architecture & Design Systems",
  "Backend APIs & Integration Contracts",
  "Mobile App Quality & Release Safety",
  "Test Data Management Strategy",
  "Observability & Monitoring",
  "Security Hardening & Access Reviews",
  "Performance Engineering & Load Testing",
  "Automation Framework Evolution",
  "Cross-Team Technical Roadmap",
  "Bug Triage & Defect Prevention",
  "Product Discovery & Technical Validation",
  "Documentation & Engineering Standards",
  "Infrastructure & Environment Provisioning",
  "Program Management & Stakeholder Reporting"
];

const spaceDescriptions = [
  "🚨 Improve incident readiness across the platform.\n\nFocus areas:\n- service ownership and escalation paths\n- on-call handoff quality\n- postmortem follow-through\n\nThe goal is to reduce noisy response patterns and make recovery work feel structured instead of improvised.",
  "⚙️ Modernize CI/CD so releases are faster and less stressful.\n\nThis space covers pipeline bottlenecks, flaky quality gates, build parallelization, and safer deployment checks.\n\nExpected outcome:\nshorter feedback loops, fewer broken mainline builds, and more confidence before shipping.",
  "📅 Keep project delivery visible and executable.\n\nWork here is centered around sprint planning, milestone tracking, dependency management, and unblocker follow-up.\n\nIt should help engineering and product stay aligned without turning status tracking into overhead.",
  "🧪 Define a real QA strategy instead of relying on ad hoc regression.\n\nThis includes test layers, release criteria, smoke coverage, exploratory testing boundaries, and ownership of critical scenarios.\n\nThe intent is to make quality work deliberate, repeatable, and easier to explain to stakeholders.",
  "🚀 Prepare changes for production in a disciplined way.\n\nThis space is for release checklists, communication plans, rollback expectations, and change approval flow.\n\nIt should answer one question clearly:\nare we actually ready to ship this safely?",
  "🛠️ Make daily developer work less painful.\n\nTypical themes:\n- local environment setup\n- tooling friction\n- slow feedback loops\n- internal platform rough edges\n\nSmall improvements here should compound into much faster engineering throughput.",
  "🎨 Maintain a frontend foundation that stays consistent as the product grows.\n\nThat means shared components, accessibility rules, UI implementation patterns, and visual system decisions all live here.\n\nThe space should reduce repeated design debt and keep feature teams moving in the same direction.",
  "🔌 Keep backend integrations predictable.\n\nTopics include API contracts, versioning rules, integration failure handling, and service-to-service expectations.\n\nThis is where teams should align before shipping interface changes that could break downstream consumers.",
  "📱 Improve mobile delivery quality across devices and releases.\n\nThe work spans crash monitoring, platform-specific bugs, rollout safety, and regression areas that frequently break on mobile.\n\nThe objective is not just fewer bugs, but more confidence in each release train.",
  "🧬 Build a cleaner strategy for test data.\n\nThis space covers seeded fixtures, isolated datasets, cleanup routines, and environment-safe data generation.\n\nIt should make tests easier to trust and reduce time wasted debugging state pollution.",
  "📊 Strengthen observability so issues are visible before customers report them.\n\nThis includes logs, traces, dashboards, SLO signals, and alert tuning.\n\nA good outcome here is faster diagnosis, calmer incident handling, and better production intuition.",
  "🔐 Review security posture with practical engineering follow-through.\n\nWork includes permission audits, secret handling, access reviews, and baseline hardening.\n\nThe emphasis is on useful safeguards that teams will actually keep up to date.",
  "🏎️ Measure and improve system performance under realistic load.\n\nUse this space for response-time analysis, bottleneck discovery, scalability planning, and load-test execution.\n\nThe aim is to move from vague concerns about performance to concrete, testable engineering actions.",
  "🤖 Evolve the automation framework without letting it collapse under its own weight.\n\nThat means better abstractions, shared helpers, fixture design, reporting quality, and cleanup of brittle patterns.\n\nThis space should make automation easier to maintain as product complexity grows.",
  "🗺️ Turn technical priorities into a roadmap teams can actually execute.\n\nThis is where cross-team sequencing, ownership, dependency management, and delivery tradeoffs are made visible.\n\nIt should connect strategy to practical implementation, not just presentation slides.",
  "🐞 Reduce defect churn by improving triage and prevention loops.\n\nUse this space for bug taxonomy, recurring issue analysis, fix validation, and process changes that prevent reintroduction.\n\nThe outcome should be fewer repeated classes of bugs and better learning from failure.",
  "🔍 Explore product and engineering ideas before they become commitments.\n\nTechnical spikes, proof-of-concept work, unknown-risk mapping, and early validation all fit here.\n\nThe point is to learn quickly and make better investment decisions before full execution starts.",
  "📚 Keep engineering knowledge visible and usable.\n\nThis space covers standards, playbooks, onboarding references, and decision records.\n\nIt should help new contributors ramp faster and reduce the amount of tribal knowledge hidden in chats or calls.",
  "☁️ Stabilize environments and provisioning workflows.\n\nTopics include infrastructure setup, ephemeral environments, deployment dependencies, and repeatable configuration.\n\nThe goal is to reduce manual setup and make delivery less dependent on individual engineers remembering hidden steps.",
  "📈 Provide program-level visibility without losing technical detail.\n\nUse this space for risk tracking, milestone reporting, dependency summaries, and stakeholder communication.\n\nIt should help translate engineering progress into something leadership can understand without flattening the real work."
];

const spaceDescriptionExtensions = [
  "\n\nCurrent priorities:\n- define service boundaries more clearly\n- reduce repeated coordination gaps during incidents\n- create a tighter loop between operational issues and engineering backlog\n\nSuccess here should be visible in calmer incident handling, clearer ownership, and fewer unresolved follow-up items after production events.",
  "\n\nCurrent priorities:\n- identify the slowest pipeline stages\n- standardize pre-merge validation expectations\n- make release automation easier to trust across teams\n\nA strong result would mean engineers spend less time waiting on feedback and less time investigating broken delivery paths.",
  "\n\nCurrent priorities:\n- surface blocked work earlier\n- keep sprint goals stable once work begins\n- improve cross-functional communication when scope shifts\n\nThis space should feel like the operational center for predictable execution rather than another passive reporting layer.",
  "\n\nCurrent priorities:\n- document critical user journeys that always need protection\n- separate smoke, regression, and exploratory responsibilities\n- align release decisions with actual evidence instead of intuition\n\nIf this space works well, teams should be able to explain quality coverage with much more precision.",
  "\n\nCurrent priorities:\n- make go/no-go decisions easier to justify\n- ensure rollback expectations exist before launch day\n- reduce confusion around who communicates what and when\n\nThe broader purpose is to turn releases into a repeatable practice instead of a last-minute coordination scramble.",
  "\n\nCurrent priorities:\n- remove unnecessary local setup complexity\n- fix the internal pain points engineers repeatedly work around\n- improve the ergonomics of common development tasks\n\nThe value here comes from small friction cuts that save time every single week.",
  "\n\nCurrent priorities:\n- reduce one-off UI implementations\n- clarify the default approach for accessibility and responsive behavior\n- make the shared component layer easier to adopt correctly\n\nThis space should help teams ship faster without fragmenting the frontend experience.",
  "\n\nCurrent priorities:\n- make interface changes safer to introduce\n- document expectations for consumers before releases happen\n- reduce ambiguity in error handling and version compatibility\n\nThe desired outcome is fewer integration surprises and cleaner collaboration across backend boundaries.",
  "\n\nCurrent priorities:\n- define a reliable mobile regression surface\n- reduce release risk from device-specific issues\n- connect crash patterns back to actionable engineering work\n\nThe long-term goal is to make mobile quality feel measurable and actively managed.",
  "\n\nCurrent priorities:\n- reduce the cost of preparing valid test data\n- make fixture setup more predictable across local and CI environments\n- isolate test state so failures are easier to trust and diagnose\n\nThis space should make automated tests less fragile and much easier to reason about.",
  "\n\nCurrent priorities:\n- remove noisy signals from dashboards and alerts\n- improve traceability across important user flows\n- ensure system behavior is explainable during incidents\n\nWhen this work is healthy, teams should spend less time guessing and more time validating facts quickly.",
  "\n\nCurrent priorities:\n- tighten access rules where ownership is unclear\n- make security review work actionable for engineering teams\n- reduce the number of silent risky defaults in day-to-day workflows\n\nThis space should balance practical delivery needs with a more mature baseline for platform security.",
  "\n\nCurrent priorities:\n- make performance conversations based on data rather than anecdote\n- identify the most meaningful bottlenecks first\n- connect performance improvements to actual user or system impact\n\nThe purpose is not abstract optimization, but clearer technical decisions backed by evidence.",
  "\n\nCurrent priorities:\n- simplify automation maintenance as the suite grows\n- remove brittle patterns that slow down future changes\n- make shared tooling easier to understand for new contributors\n\nA healthier framework here should mean faster test authoring and fewer failures caused by the framework itself.",
  "\n\nCurrent priorities:\n- clarify what should happen now versus later\n- expose hidden sequencing risks between teams\n- connect technical investments to visible product or platform outcomes\n\nThis space should help roadmap discussions stay grounded in execution reality.",
  "\n\nCurrent priorities:\n- identify bug classes that recur too often\n- improve how issues are categorized and revisited\n- make prevention work as visible as fix work\n\nThe best outcome would be less repeated firefighting and stronger confidence that lessons are actually retained.",
  "\n\nCurrent priorities:\n- validate technical assumptions before delivery planning locks in\n- reduce uncertainty around implementation complexity\n- surface feasibility concerns early while options are still open\n\nThis space should support sharper decision-making before full project commitment begins.",
  "\n\nCurrent priorities:\n- keep standards easy to find and easier to follow\n- improve onboarding quality for engineers joining existing systems\n- preserve key technical decisions in a durable, searchable form\n\nThis space becomes more valuable as the team grows and shared context becomes harder to maintain informally.",
  "\n\nCurrent priorities:\n- remove environment drift between teams and stages\n- simplify provisioning paths for development and testing\n- reduce manual intervention during setup and deployment work\n\nThe point is to make environments feel dependable enough that teams can focus on delivery rather than setup recovery.",
  "\n\nCurrent priorities:\n- make progress and risk legible to non-engineering partners\n- keep reporting anchored in actual delivery state\n- improve the quality of coordination across product, engineering, and leadership\n\nThis space should make communication clearer without disconnecting it from the technical realities underneath."
];

const spaces = Array.from({ length: 20 }, (_, i) => {
  const id = i + 1;
  const owner = users[i % users.length];
  const memberIds = new Set([owner.id]);
  const desiredMembers = 3 + (i % 3);

  let cursor = i;
  while (memberIds.size < desiredMembers) {
    memberIds.add(users[cursor % users.length].id);
    cursor += 2;
  }

  const members = Array.from(memberIds).map((userId) => ({
    userId,
    role: userId === owner.id ? "owner" : "member"
  }));

  return {
    id,
    name: spaceNames[i],
    description: `${spaceDescriptions[i]}${spaceDescriptionExtensions[i]}`,
    ownerUserId: owner.id,
    ownerEmail: owner.email,
    members,
    createdAt: new Date(Date.UTC(2026, 1, 1 + i)).toISOString()
  };
});

const taskPrefixes = [
  "Define",
  "Implement",
  "Review",
  "Document",
  "Audit",
  "Refactor",
  "Plan",
  "Stabilize",
  "Validate",
  "Optimize"
];
const taskObjects = [
  "test suite segmentation strategy",
  "incident response workflow",
  "release readiness checklist",
  "API contract validation",
  "cross-team delivery dashboard",
  "flaky test investigation process",
  "monitoring alert review",
  "environment provisioning flow",
  "test data cleanup strategy",
  "deployment rollback procedure"
];
const taskDetails = [
  "🧩 Include clear acceptance criteria, named owners, and rollout notes so the work is actionable from the start.",
  "🤝 Capture dependencies, delivery risks, and any cross-team coordination needed before implementation begins.",
  "🛑 Track blockers, assumptions, and the next concrete step so the task keeps moving instead of waiting silently.",
  "📈 Make sure observability, validation, and rollback paths are considered before this is treated as complete.",
  "📝 Document unresolved questions, open decisions, and what evidence is still needed to move forward confidently."
];

const taskDescriptionExtensions = [
  "\n\nRecommended structure:\n- clarify the problem being solved\n- identify the systems or flows touched\n- define the evidence that will prove the work is done\n\nThis task should leave behind enough context that another engineer can continue without guessing intent.",
  "\n\nThings to watch closely:\n- hidden integration dependencies\n- outdated assumptions in existing docs\n- implementation shortcuts that increase follow-up work later\n\nIf scope changes, note why and keep the decision trail visible in the task.",
  "\n\nValidation checklist:\n- expected behavior is observable\n- failure paths are understood\n- release impact is reviewed with the right people\n\nThe result should be practical and reviewable, not just technically complete on paper.",
  "\n\nCollaboration notes:\n- involve the owning engineer early\n- flag UX or product implications before handoff\n- capture edge cases that are likely to be forgotten during implementation\n\nA good outcome here is shared clarity, not just individual task completion.",
  "\n\nDefinition of success:\n- the task reduces uncertainty or risk\n- the change can be explained simply to the team\n- future follow-up work is smaller because this was done carefully\n\nTreat this as a quality checkpoint, not just a box to tick."
];

const statuses = ["created", "in_progress", "done"];
let taskId = 1;
const tasks = [];

for (const space of spaces) {
  const countForSpace = 5 + (space.id % 4);
  const memberIds = space.members.map((m) => m.userId);

  for (let j = 0; j < countForSpace; j++) {
    const creatorUserId = memberIds[j % memberIds.length];
    const assigneeUserId = j % 5 === 0 ? null : memberIds[(j + 1) % memberIds.length];
    const status = statuses[(space.id + j) % statuses.length];

    const title = `${taskPrefixes[(taskId + j) % taskPrefixes.length]} ${taskObjects[(space.id + j) % taskObjects.length]}`;
    const detail = taskDetails[(taskId + space.id) % taskDetails.length];
    const extension =
      taskDescriptionExtensions[(taskId + j + space.id) % taskDescriptionExtensions.length];
    const description =
      `${detail}\n\n` +
      `📍 Space focus: ${space.name}\n` +
      `🎯 Expected impact: improve delivery confidence, reduce ambiguity, and make follow-up work easier to manage.\n` +
      `🧠 Context: this task supports broader engineering goals around quality, predictability, and cross-team execution.` +
      `${extension}`;

    tasks.push({
      id: taskId,
      spaceId: space.id,
      spaceName: space.name,
      createdByUserId: creatorUserId,
      createdByEmail: users.find((u) => u.id === creatorUserId).email,
      assigneeUserId,
      assigneeEmail: assigneeUserId ? users.find((u) => u.id === assigneeUserId).email : null,
      title,
      description,
      status,
      completed: status === "done" ? 1 : 0,
      createdAt: new Date(Date.UTC(2026, 1, Math.min(28, ((taskId + j) % 28) + 1))).toISOString()
    });

    taskId += 1;
  }
}

const meta = {
  generatedAt: new Date().toISOString(),
  counts: {
    users: users.length,
    spaces: spaces.length,
    tasks: tasks.length
  },
  cleanedDatabaseFiles: removedDb.map((p) => path.relative(normalizedRoot, p)),
  notes: [
    "Passwords are plain-text fixture values intended only for local test seeding.",
    "Use email fields as stable keys when importing via API.",
    "Space membership is included to support assignment validation."
  ]
};

fs.writeFileSync(path.join(normalizedTestDataDir, "users.json"), JSON.stringify(users, null, 2));
fs.writeFileSync(path.join(normalizedTestDataDir, "spaces.json"), JSON.stringify(spaces, null, 2));
fs.writeFileSync(path.join(normalizedTestDataDir, "tasks.json"), JSON.stringify(tasks, null, 2));
fs.writeFileSync(path.join(normalizedTestDataDir, "meta.json"), JSON.stringify(meta, null, 2));

console.log("Test data created in ./test-data");
console.log(JSON.stringify(meta, null, 2));
