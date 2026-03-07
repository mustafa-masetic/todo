import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import { createAuthToken, requireAuth, type AuthedRequest } from "./auth.js";
import {
  adminQueries,
  inviteQueries,
  spaceQueries,
  todoQueries,
  type Gender,
  type PreferredTheme,
  type Space,
  type SpaceInvite,
  type SpaceMember,
  type TaskListResponse,
  type TaskSearchResult,
  type Todo,
  type UserLookupResult,
  userQueries,
  type User,
  type UserWithPassword
} from "./db.js";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

const allowedGenders = new Set<Gender>([
  "female",
  "male",
  "other",
  "prefer_not_to_say"
]);
const allowedThemes = new Set<PreferredTheme>(["light", "dark", "system"]);
const allowedTaskStatuses = new Set(["created", "in_progress", "done"]);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function normalizeEmail(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseProfile(payload: Record<string, unknown>) {
  const firstName = String(payload.firstName || "").trim();
  const lastName = String(payload.lastName || "").trim();
  const gender = String(payload.gender || "") as Gender;
  const email = normalizeEmail(payload.email);

  if (firstName.length < 2) {
    return { error: "First name must be at least 2 characters." };
  }

  if (lastName.length < 2) {
    return { error: "Last name must be at least 2 characters." };
  }

  if (!allowedGenders.has(gender)) {
    return { error: "Gender is invalid." };
  }

  if (!email || !email.includes("@")) {
    return { error: "Valid email is required." };
  }

  return { firstName, lastName, gender, email };
}

function parseSettings(payload: Record<string, unknown>) {
  const avatarUrl = String(payload.avatarUrl || "").trim();
  const preferredTheme = String(payload.preferredTheme || "") as PreferredTheme;
  const searchVisible =
    typeof payload.searchVisible === "boolean" ? payload.searchVisible : null;

  if (searchVisible === null) {
    return { error: "Search visibility value is required." };
  }

  if (!allowedThemes.has(preferredTheme)) {
    return { error: "Preferred theme is invalid." };
  }

  return { avatarUrl, preferredTheme, searchVisible };
}

function requireSpaceMember(spaceId: number, userId: number): "owner" | "member" | null {
  const membership = spaceQueries.getMembership.get(spaceId, userId) as
    | { role: "owner" | "member" }
    | undefined;

  return membership?.role ?? null;
}

function getAuthedUserOrReply(authReq: AuthedRequest, res: express.Response): User | null {
  const user = userQueries.getById.get(authReq.authUser.userId) as User | undefined;
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return null;
  }
  return user;
}

function requireAdminUser(authReq: AuthedRequest, res: express.Response): User | null {
  const user = getAuthedUserOrReply(authReq, res);
  if (!user) {
    return null;
  }

  if (user.isAdmin !== 1) {
    res.status(403).json({ message: "Admin access required." });
    return null;
  }

  return user;
}

app.post("/api/auth/register", (req, res) => {
  const payload = req.body || {};
  const parsed = parseProfile(payload);
  const password = String(payload.password || "");

  if ("error" in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters." });
    return;
  }

  const existingUser = userQueries.getByEmail.get(parsed.email) as UserWithPassword | undefined;
  if (existingUser) {
    res.status(409).json({ message: "Email is already registered." });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  try {
    const result = userQueries.create.run(
      parsed.firstName,
      parsed.lastName,
      parsed.gender,
      parsed.email,
      "",
      1,
      "system",
      0,
      passwordHash
    );
    const userId = Number(result.lastInsertRowid);

    const adminCount = userQueries.countAdmins.get() as { count: number };
    if ((adminCount?.count ?? 0) === 0) {
      userQueries.updateAdminById.run(1, userId);
    }

    const user = userQueries.getById.get(userId) as User | undefined;

    if (!user) {
      res.status(500).json({ message: "Failed to create user." });
      return;
    }

    const token = createAuthToken({ id: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch {
    res.status(500).json({ message: "Failed to create user." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const user = userQueries.getByEmail.get(email) as UserWithPassword | undefined;
  if (!user) {
    res.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    res.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const token = createAuthToken({ id: user.id, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      email: user.email,
      avatarUrl: user.avatarUrl,
      searchVisible: user.searchVisible,
      preferredTheme: user.preferredTheme,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    }
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const user = getAuthedUserOrReply(authReq, res);
  if (!user) {
    return;
  }

  res.json(user);
});

app.put("/api/auth/me", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const payload = req.body || {};
  const parsed = parseProfile(payload);

  if ("error" in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  try {
    userQueries.updateProfile.run(
      parsed.firstName,
      parsed.lastName,
      parsed.gender,
      parsed.email,
      authReq.authUser.userId
    );
  } catch {
    res.status(409).json({ message: "Email is already used by another account." });
    return;
  }

  const updated = userQueries.getById.get(authReq.authUser.userId) as User | undefined;

  if (!updated) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json(updated);
});

app.put("/api/auth/settings", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const payload = req.body || {};
  const parsed = parseSettings(payload);

  if ("error" in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  userQueries.updateSettings.run(
    parsed.avatarUrl,
    parsed.searchVisible ? 1 : 0,
    parsed.preferredTheme,
    authReq.authUser.userId
  );

  const updated = userQueries.getById.get(authReq.authUser.userId) as User | undefined;
  if (!updated) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json(updated);
});

app.put("/api/auth/password", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "Current and new password are required." });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ message: "New password must be at least 8 characters." });
    return;
  }

  const user = getAuthedUserOrReply(authReq, res);
  if (!user) {
    return;
  }

  const userWithPassword = userQueries.getByEmail.get(user.email) as
    | UserWithPassword
    | undefined;
  if (!userWithPassword) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const validPassword = bcrypt.compareSync(currentPassword, userWithPassword.passwordHash);
  if (!validPassword) {
    res.status(401).json({ message: "Current password is incorrect." });
    return;
  }

  const passwordHash = bcrypt.hashSync(newPassword, 12);
  userQueries.updatePasswordHash.run(passwordHash, authReq.authUser.userId);
  res.json({ ok: true });
});

app.get("/api/tasks/search", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const q = String(req.query.q || "").trim();

  if (q.length < 1) {
    res.json([]);
    return;
  }

  const searchTerm = `%${q}%`;
  const items = todoQueries.searchForUser.all(
    authReq.authUser.userId,
    searchTerm
  ) as TaskSearchResult[];

  res.json(items);
});

app.get("/api/users/search", requireAuth, (req, res) => {
  const rawQ = String(req.query.q || "").trim();

  if (rawQ.length < 3) {
    res.json([]);
    return;
  }

  const like = `%${rawQ}%`;
  const users = userQueries.searchByDirectory.all(like, like, like, 20) as UserLookupResult[];
  res.json(users);
});

app.get("/api/tasks", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const rawQ = String(req.query.q || "").trim();
  const q = rawQ.length >= 3 ? rawQ : "";
  const rawSpaceId = String(req.query.spaceId || "").trim();
  const parsedSpaceId = rawSpaceId ? Number(rawSpaceId) : null;
  const spaceId =
    parsedSpaceId !== null && !Number.isNaN(parsedSpaceId) ? parsedSpaceId : null;

  const rawPage = Number(req.query.page || 1);
  const rawPageSize = Number(req.query.pageSize || 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(50, Math.max(1, rawPageSize))
    : 10;
  const offset = (page - 1) * pageSize;
  const like = q ? `%${q}%` : "";

  const items = todoQueries.getTasksForUser.all(
    authReq.authUser.userId,
    spaceId,
    spaceId,
    like,
    like,
    pageSize,
    offset
  ) as TaskSearchResult[];

  const countRow = todoQueries.countTasksForUser.get(
    authReq.authUser.userId,
    spaceId,
    spaceId,
    like,
    like
  ) as { count: number };

  const response: TaskListResponse = {
    items,
    total: countRow?.count ?? 0,
    page,
    pageSize
  };

  res.json(response);
});

app.get("/api/tasks/:taskId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const taskId = Number(req.params.taskId);

  if (Number.isNaN(taskId)) {
    res.status(400).json({ message: "Invalid task id." });
    return;
  }

  const task = todoQueries.getTaskByIdForUser.get(
    taskId,
    authReq.authUser.userId
  ) as TaskSearchResult | undefined;

  if (!task) {
    res.status(404).json({ message: "Task not found." });
    return;
  }

  res.json(task);
});

app.patch("/api/tasks/:taskId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const taskId = Number(req.params.taskId);
  const { title, description, status, assigneeUserId } = req.body || {};

  if (Number.isNaN(taskId)) {
    res.status(400).json({ message: "Invalid task id." });
    return;
  }

  const currentTask = todoQueries.getTaskByIdForUser.get(
    taskId,
    authReq.authUser.userId
  ) as TaskSearchResult | undefined;

  if (!currentTask) {
    res.status(404).json({ message: "Task not found." });
    return;
  }

  const role = requireSpaceMember(currentTask.spaceId, authReq.authUser.userId);
  if (!role) {
    res.status(403).json({ message: "Not a member of this space." });
    return;
  }

  if (typeof title === "string") {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      res.status(400).json({ message: "Title cannot be empty." });
      return;
    }
    todoQueries.updateTitle.run(cleanTitle, taskId, currentTask.spaceId);
  }

  if (typeof description === "string") {
    todoQueries.updateDescription.run(description.trim(), taskId, currentTask.spaceId);
  }

  if (typeof status === "string") {
    if (!allowedTaskStatuses.has(status)) {
      res.status(400).json({ message: "Invalid task status." });
      return;
    }
    todoQueries.updateStatus.run(status, status, taskId, currentTask.spaceId);
  }

  if (assigneeUserId === null) {
    todoQueries.updateAssignee.run(null, taskId, currentTask.spaceId);
  } else if (typeof assigneeUserId === "number") {
    const assigneeRole = requireSpaceMember(currentTask.spaceId, assigneeUserId);
    if (!assigneeRole) {
      res.status(400).json({ message: "Assignee must be a member of this space." });
      return;
    }
    todoQueries.updateAssignee.run(assigneeUserId, taskId, currentTask.spaceId);
  }

  const updatedTask = todoQueries.getTaskByIdForUser.get(
    taskId,
    authReq.authUser.userId
  ) as TaskSearchResult | undefined;

  if (!updatedTask) {
    res.status(404).json({ message: "Task not found." });
    return;
  }

  res.json(updatedTask);
});

app.get("/api/spaces", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaces = spaceQueries.getSpacesForUser.all(authReq.authUser.userId) as Space[];
  res.json(spaces);
});

app.post("/api/spaces", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();

  if (name.length < 2) {
    res.status(400).json({ message: "Space name must be at least 2 characters." });
    return;
  }

  const result = spaceQueries.createSpace.run(name, description, authReq.authUser.userId);
  const spaceId = Number(result.lastInsertRowid);
  spaceQueries.addMember.run(spaceId, authReq.authUser.userId, "owner");

  const spaces = spaceQueries.getSpacesForUser.all(authReq.authUser.userId) as Space[];
  const created = spaces.find((space) => space.id === spaceId);
  if (!created) {
    res.status(500).json({ message: "Failed to create space." });
    return;
  }

  res.status(201).json(created);
});

app.delete("/api/spaces/:spaceId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);

  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (role !== "owner") {
    res.status(403).json({ message: "Only space owners can delete spaces." });
    return;
  }

  spaceQueries.removeSpace.run(spaceId);
  res.status(204).send();
});

app.get("/api/spaces/:spaceId/members", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);

  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (!role) {
    res.status(403).json({ message: "Not a member of this space." });
    return;
  }

  const members = spaceQueries.getMembers.all(spaceId) as SpaceMember[];
  res.json(members);
});

app.post("/api/spaces/:spaceId/invites", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);
  const email = normalizeEmail(req.body?.email);

  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (role !== "owner") {
    res.status(403).json({ message: "Only space owners can invite members." });
    return;
  }

  if (!email || !email.includes("@")) {
    res.status(400).json({ message: "Valid email is required." });
    return;
  }

  const existingPending = inviteQueries.getPendingInviteForSpaceEmail.get(
    spaceId,
    email
  ) as { id: number } | undefined;

  if (existingPending) {
    res.status(409).json({ message: "Pending invite already exists for this email." });
    return;
  }

  const alreadyMember = userQueries.getByEmail.get(email) as UserWithPassword | undefined;
  if (!alreadyMember) {
    res.status(404).json({ message: "User with this email does not exist." });
    return;
  }

  const membership = requireSpaceMember(spaceId, alreadyMember.id);
  if (membership) {
    res.status(409).json({ message: "User is already in this space." });
    return;
  }

  inviteQueries.createInvite.run(spaceId, email, authReq.authUser.userId);
  res.status(201).json({
    ok: true,
    invitedFirstName: alreadyMember.firstName,
    invitedLastName: alreadyMember.lastName,
    email: alreadyMember.email
  });
});

app.get("/api/spaces/:spaceId/invites", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);

  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (!role) {
    res.status(403).json({ message: "Not a member of this space." });
    return;
  }

  const invites = inviteQueries.getInvitesForSpace.all(spaceId) as SpaceInvite[];
  res.json(invites);
});

app.get("/api/invites", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const user = userQueries.getById.get(authReq.authUser.userId) as User | undefined;
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const invites = inviteQueries.getPendingInvitesForEmail.all(
    user.email
  ) as SpaceInvite[];
  res.json(invites);
});

app.post("/api/invites/:inviteId/accept", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const inviteId = Number(req.params.inviteId);

  if (Number.isNaN(inviteId)) {
    res.status(400).json({ message: "Invalid invite id." });
    return;
  }

  const invite = inviteQueries.getInviteById.get(inviteId) as
    | { id: number; spaceId: number; email: string; status: "pending" | "accepted" }
    | undefined;

  if (!invite) {
    res.status(404).json({ message: "Invite not found." });
    return;
  }

  const user = userQueries.getById.get(authReq.authUser.userId) as User | undefined;
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  if (invite.email !== user.email) {
    res.status(403).json({ message: "This invite is not for your account." });
    return;
  }

  if (invite.status !== "pending") {
    res.status(409).json({ message: "Invite has already been handled." });
    return;
  }

  spaceQueries.addMember.run(invite.spaceId, authReq.authUser.userId, "member");
  inviteQueries.acceptInvite.run(invite.id);
  res.json({ ok: true });
});

app.get("/api/spaces/:spaceId/todos", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);

  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (!role) {
    res.status(403).json({ message: "Not a member of this space." });
    return;
  }

  const todos = todoQueries.getAllBySpace.all(spaceId) as Todo[];
  res.json(todos);
});

app.post("/api/spaces/:spaceId/todos", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const status = String(req.body?.status || "created").trim();
  const rawAssigneeUserId = req.body?.assigneeUserId;

  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (!role) {
    res.status(403).json({ message: "Not a member of this space." });
    return;
  }

  if (!title) {
    res.status(400).json({ message: "Title is required." });
    return;
  }

  if (!allowedTaskStatuses.has(status)) {
    res.status(400).json({ message: "Invalid task status." });
    return;
  }

  let assigneeUserId: number | null = null;
  if (rawAssigneeUserId === null || typeof rawAssigneeUserId === "undefined") {
    assigneeUserId = null;
  } else if (typeof rawAssigneeUserId === "number") {
    const assigneeRole = requireSpaceMember(spaceId, rawAssigneeUserId);
    if (!assigneeRole) {
      res.status(400).json({ message: "Assignee must be a member of this space." });
      return;
    }
    assigneeUserId = rawAssigneeUserId;
  } else {
    res.status(400).json({ message: "Assignee must be null or a valid user id." });
    return;
  }

  const result = todoQueries.create.run(
    authReq.authUser.userId,
    spaceId,
    assigneeUserId,
    title,
    description,
    status,
    status
  );
  const todo = todoQueries.getByIdForSpace.get(Number(result.lastInsertRowid), spaceId) as
    | Todo
    | undefined;

  res.status(201).json(todo);
});

app.patch("/api/spaces/:spaceId/todos/:id", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);
  const id = Number(req.params.id);
  const { completed, title, description, status, assigneeUserId } = req.body || {};

  if (Number.isNaN(spaceId) || Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (!role) {
    res.status(403).json({ message: "Not a member of this space." });
    return;
  }

  if (typeof completed === "boolean") {
    todoQueries.updateCompleted.run(completed ? 1 : 0, completed ? 1 : 0, id, spaceId);
  }

  if (typeof title === "string") {
    const clean = title.trim();
    if (!clean) {
      res.status(400).json({ message: "Title cannot be empty." });
      return;
    }
    todoQueries.updateTitle.run(clean, id, spaceId);
  }

  if (typeof description === "string") {
    todoQueries.updateDescription.run(description.trim(), id, spaceId);
  }

  if (typeof status === "string") {
    if (!allowedTaskStatuses.has(status)) {
      res.status(400).json({ message: "Invalid task status." });
      return;
    }
    todoQueries.updateStatus.run(status, status, id, spaceId);
  }

  if (assigneeUserId === null) {
    todoQueries.updateAssignee.run(null, id, spaceId);
  } else if (typeof assigneeUserId === "number") {
    const assigneeRole = requireSpaceMember(spaceId, assigneeUserId);
    if (!assigneeRole) {
      res.status(400).json({ message: "Assignee must be a member of this space." });
      return;
    }
    todoQueries.updateAssignee.run(assigneeUserId, id, spaceId);
  }

  const todo = todoQueries.getByIdForSpace.get(id, spaceId) as Todo | undefined;

  if (!todo) {
    res.status(404).json({ message: "Todo not found." });
    return;
  }

  res.json(todo);
});

app.delete("/api/spaces/:spaceId/todos/:id", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const spaceId = Number(req.params.spaceId);
  const id = Number(req.params.id);

  if (Number.isNaN(spaceId) || Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid id." });
    return;
  }

  const role = requireSpaceMember(spaceId, authReq.authUser.userId);
  if (!role) {
    res.status(403).json({ message: "Not a member of this space." });
    return;
  }

  if (role !== "owner") {
    res.status(403).json({ message: "Only space owners can delete tasks." });
    return;
  }

  todoQueries.remove.run(id, spaceId);
  res.status(204).send();
});

app.get("/api/admin/overview", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const overview = adminQueries.getOverview.get() as {
    users: number;
    spaces: number;
    tasks: number;
  };
  res.json({
    ...overview,
    adminEmail: adminUser.email
  });
});

app.get("/api/admin/users", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const rows = userQueries.listAllForAdmin.all() as Array<
    User & { ownedSpaceCount: number; createdTaskCount: number }
  >;
  res.json(rows);
});

app.patch("/api/admin/users/:userId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ message: "Invalid user id." });
    return;
  }

  const target = userQueries.getById.get(userId) as User | undefined;
  if (!target) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const payload = req.body || {};
  if (typeof payload.firstName === "string") {
    const value = payload.firstName.trim();
    if (value.length < 2) {
      res.status(400).json({ message: "First name must be at least 2 characters." });
      return;
    }
    userQueries.updateProfile.run(
      value,
      target.lastName,
      target.gender,
      target.email,
      target.id
    );
  }
  if (typeof payload.lastName === "string") {
    const value = payload.lastName.trim();
    if (value.length < 2) {
      res.status(400).json({ message: "Last name must be at least 2 characters." });
      return;
    }
    const latest = userQueries.getById.get(target.id) as User;
    userQueries.updateProfile.run(
      latest.firstName,
      value,
      latest.gender,
      latest.email,
      latest.id
    );
  }
  if (typeof payload.gender === "string") {
    if (!allowedGenders.has(payload.gender as Gender)) {
      res.status(400).json({ message: "Gender is invalid." });
      return;
    }
    const latest = userQueries.getById.get(target.id) as User;
    userQueries.updateProfile.run(
      latest.firstName,
      latest.lastName,
      payload.gender as Gender,
      latest.email,
      latest.id
    );
  }
  if (typeof payload.searchVisible === "boolean" || typeof payload.preferredTheme === "string") {
    if (
      typeof payload.preferredTheme === "string" &&
      !allowedThemes.has(payload.preferredTheme as PreferredTheme)
    ) {
      res.status(400).json({ message: "Preferred theme is invalid." });
      return;
    }
    const latest = userQueries.getById.get(target.id) as User;
    userQueries.updateSettings.run(
      latest.avatarUrl,
      typeof payload.searchVisible === "boolean"
        ? payload.searchVisible
          ? 1
          : 0
        : latest.searchVisible,
      typeof payload.preferredTheme === "string"
        ? (payload.preferredTheme as PreferredTheme)
        : latest.preferredTheme,
      latest.id
    );
  }
  if (typeof payload.isAdmin === "boolean") {
    if (adminUser.id === target.id && payload.isAdmin === false) {
      const row = userQueries.countAdmins.get() as { count: number };
      if ((row?.count ?? 0) <= 1) {
        res.status(400).json({ message: "Cannot remove the last admin." });
        return;
      }
    }
    userQueries.updateAdminById.run(payload.isAdmin ? 1 : 0, target.id);
  }

  const updated = userQueries.getById.get(target.id) as User | undefined;
  if (!updated) {
    res.status(404).json({ message: "User not found." });
    return;
  }
  res.json(updated);
});

app.post("/api/admin/users/:userId/reset-password", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const userId = Number(req.params.userId);
  const newPassword = String(req.body?.newPassword || "");
  if (Number.isNaN(userId)) {
    res.status(400).json({ message: "Invalid user id." });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ message: "New password must be at least 8 characters." });
    return;
  }

  const target = userQueries.getById.get(userId) as User | undefined;
  if (!target) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const passwordHash = bcrypt.hashSync(newPassword, 12);
  userQueries.updatePasswordHash.run(passwordHash, userId);
  res.json({ ok: true });
});

app.post("/api/admin/users/bulk", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const action = String(req.body?.action || "");
  const userIds = Array.isArray(req.body?.userIds)
    ? req.body.userIds.filter((id: unknown) => typeof id === "number")
    : [];
  if (userIds.length === 0) {
    res.status(400).json({ message: "No users selected." });
    return;
  }

  if (action === "delete") {
    userIds.forEach((id: number) => {
      if (id !== adminUser.id) {
        userQueries.removeById.run(id);
      }
    });
    res.json({ ok: true });
    return;
  }
  if (action === "set-admin" || action === "unset-admin") {
    const nextValue = action === "set-admin" ? 1 : 0;
    userIds.forEach((id: number) => {
      if (id === adminUser.id && nextValue === 0) {
        return;
      }
      userQueries.updateAdminById.run(nextValue, id);
    });
    res.json({ ok: true });
    return;
  }

  res.status(400).json({ message: "Unsupported bulk user action." });
});

app.get("/api/admin/spaces", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const rows = spaceQueries.listAllForAdmin.all() as Array<
    Space & { ownerEmail: string }
  >;
  res.json(rows);
});

app.patch("/api/admin/spaces/:spaceId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const spaceId = Number(req.params.spaceId);
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();
  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }
  if (name.length < 2) {
    res.status(400).json({ message: "Space name must be at least 2 characters." });
    return;
  }

  spaceQueries.updateById.run(name, description, spaceId);
  const updated = spaceQueries.getById.get(spaceId) as Space | undefined;
  if (!updated) {
    res.status(404).json({ message: "Space not found." });
    return;
  }
  res.json(updated);
});

app.delete("/api/admin/spaces/:spaceId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const spaceId = Number(req.params.spaceId);
  if (Number.isNaN(spaceId)) {
    res.status(400).json({ message: "Invalid space id." });
    return;
  }
  spaceQueries.removeSpace.run(spaceId);
  res.status(204).send();
});

app.post("/api/admin/spaces/bulk", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const action = String(req.body?.action || "");
  const spaceIds = Array.isArray(req.body?.spaceIds)
    ? req.body.spaceIds.filter((id: unknown) => typeof id === "number")
    : [];
  if (spaceIds.length === 0) {
    res.status(400).json({ message: "No spaces selected." });
    return;
  }
  if (action !== "delete") {
    res.status(400).json({ message: "Unsupported bulk space action." });
    return;
  }
  spaceIds.forEach((id: number) => {
    spaceQueries.removeSpace.run(id);
  });
  res.json({ ok: true });
});

app.get("/api/admin/tasks", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const rows = todoQueries.getAllForAdmin.all() as TaskSearchResult[];
  res.json(rows);
});

app.patch("/api/admin/tasks/:taskId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const taskId = Number(req.params.taskId);
  const { title, description, status, assigneeUserId } = req.body || {};
  if (Number.isNaN(taskId)) {
    res.status(400).json({ message: "Invalid task id." });
    return;
  }

  const task = todoQueries.getTaskByIdAdmin.get(taskId) as
    | (TaskSearchResult & { creatorEmail?: string })
    | undefined;
  if (!task) {
    res.status(404).json({ message: "Task not found." });
    return;
  }

  if (typeof title === "string") {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      res.status(400).json({ message: "Title cannot be empty." });
      return;
    }
    todoQueries.updateTitle.run(cleanTitle, taskId, task.spaceId);
  }
  if (typeof description === "string") {
    todoQueries.updateDescription.run(description.trim(), taskId, task.spaceId);
  }
  if (typeof status === "string") {
    if (!allowedTaskStatuses.has(status)) {
      res.status(400).json({ message: "Invalid task status." });
      return;
    }
    todoQueries.updateStatus.run(status, status, taskId, task.spaceId);
  }
  if (assigneeUserId === null) {
    todoQueries.updateAssignee.run(null, taskId, task.spaceId);
  } else if (typeof assigneeUserId === "number") {
    todoQueries.updateAssignee.run(assigneeUserId, taskId, task.spaceId);
  }

  const updated = todoQueries.getTaskByIdAdmin.get(taskId) as TaskSearchResult | undefined;
  if (!updated) {
    res.status(404).json({ message: "Task not found." });
    return;
  }
  res.json(updated);
});

app.delete("/api/admin/tasks/:taskId", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const taskId = Number(req.params.taskId);
  if (Number.isNaN(taskId)) {
    res.status(400).json({ message: "Invalid task id." });
    return;
  }
  todoQueries.removeById.run(taskId);
  res.status(204).send();
});

app.post("/api/admin/tasks/bulk", requireAuth, (req, res) => {
  const authReq = req as AuthedRequest;
  const adminUser = requireAdminUser(authReq, res);
  if (!adminUser) {
    return;
  }

  const action = String(req.body?.action || "");
  const taskIds = Array.isArray(req.body?.taskIds)
    ? req.body.taskIds.filter((id: unknown) => typeof id === "number")
    : [];
  if (taskIds.length === 0) {
    res.status(400).json({ message: "No tasks selected." });
    return;
  }

  if (action === "delete") {
    taskIds.forEach((id: number) => {
      todoQueries.removeById.run(id);
    });
    res.json({ ok: true });
    return;
  }
  if (action === "set-status") {
    const status = String(req.body?.status || "");
    if (!allowedTaskStatuses.has(status)) {
      res.status(400).json({ message: "Invalid task status." });
      return;
    }
    taskIds.forEach((id: number) => {
      const task = todoQueries.getTaskByIdAdmin.get(id) as TaskSearchResult | undefined;
      if (task) {
        todoQueries.updateStatus.run(status, status, id, task.spaceId);
      }
    });
    res.json({ ok: true });
    return;
  }

  res.status(400).json({ message: "Unsupported bulk task action." });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
