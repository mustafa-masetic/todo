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
  "Apollo Launch Ops", "Beacon Design Studio", "Catalyst Growth Lab", "Delta Platform Core", "Echo Customer Success",
  "Flux Marketing Guild", "Glacier Data Engineering", "Harbor Security Response", "Ion Mobile Experience", "Juno Sales Enablement",
  "Kepler Analytics Board", "Lumen Content Pipeline", "Meridian Partner Network", "Nimbus QA Collective", "Orion Billing Systems",
  "Pulse People Operations", "Quantum Research Pod", "Rift DevEx Squad", "Summit Finance Control", "Tango Release Train"
];

const spaceDescriptions = [
  "Coordinate launch milestones, risks, and rollout readiness across product teams.",
  "Own visual design systems, experiments, and product UX polish initiatives.",
  "Drive growth loops, campaign experiments, and activation performance goals.",
  "Maintain shared platform services, APIs, and reliability standards.",
  "Manage onboarding quality, churn interventions, and customer health playbooks.",
  "Plan channel strategy, launch assets, and weekly performance analysis.",
  "Build ETL flows, warehouse models, and reporting reliability foundations.",
  "Triage incidents, harden posture, and improve response playbooks.",
  "Ship mobile feature sets and improve cross-platform interaction quality.",
  "Create collateral, playbooks, and enablement sessions for account teams.",
  "Define KPI governance, attribution rules, and leadership dashboards.",
  "Publish educational content and automate internal content operations.",
  "Expand partner onboarding, integrations, and co-marketing workflows.",
  "Own quality strategy, regression safety nets, and release confidence.",
  "Run invoicing, collections workflows, and payment reliability projects.",
  "Improve hiring process operations, onboarding, and retention programs.",
  "Explore prototypes, validate product hypotheses, and technical feasibility.",
  "Upgrade internal developer workflows, tooling, and pipeline speed.",
  "Track budgets, approvals, and monthly close controls.",
  "Coordinate release sequencing, communication, and rollout checklists."
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
    description: spaceDescriptions[i],
    ownerUserId: owner.id,
    ownerEmail: owner.email,
    members,
    createdAt: new Date(Date.UTC(2026, 1, 1 + i)).toISOString()
  };
});

const taskPrefixes = ["Design", "Build", "Review", "Document", "Audit", "Refactor", "Plan", "Ship", "Validate", "Optimize"];
const taskObjects = ["dashboard", "onboarding flow", "notification system", "API contract", "release checklist", "billing report", "incident playbook", "search relevance", "mobile layout", "analytics query"];
const taskDetails = [
  "Include acceptance criteria and rollout notes.",
  "Coordinate with stakeholders and capture dependencies.",
  "Track blockers and provide weekly updates.",
  "Ensure observability and alerts are in place.",
  "Document assumptions and unresolved questions."
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
    const description = `${taskDetails[(taskId + space.id) % taskDetails.length]} Space focus: ${space.name}.`;

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
