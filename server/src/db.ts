import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

export type Gender = "female" | "male" | "other" | "prefer_not_to_say";
export type PreferredTheme = "light" | "dark" | "system";
export type TaskStatus = "created" | "in_progress" | "done";

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  gender: Gender;
  email: string;
  avatarUrl: string;
  searchVisible: number;
  preferredTheme: PreferredTheme;
  isAdmin: number;
  createdAt: string;
};

export type UserWithPassword = User & {
  passwordHash: string;
};

export type UserLookupResult = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type Space = {
  id: number;
  name: string;
  description: string;
  ownerUserId: number;
  role: "owner" | "member";
  memberCount: number;
  totalTaskCount: number;
  doneTaskCount: number;
  openTaskCount: number;
  createdAt: string;
};

export type SpaceMember = {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "owner" | "member";
  joinedAt: string;
};

export type SpaceInvite = {
  id: number;
  spaceId: number;
  spaceName: string;
  email: string;
  invitedFirstName: string;
  invitedLastName: string;
  invitedByUserId: number;
  invitedByEmail: string;
  status: "pending" | "accepted";
  createdAt: string;
};

export type Todo = {
  id: number;
  spaceId: number;
  userId: number;
  assigneeUserId: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  completed: number;
  createdAt: string;
};

export type TaskSearchResult = {
  id: number;
  spaceId: number;
  spaceName: string;
  userId: number;
  assigneeUserId: number | null;
  assigneeFirstName: string;
  assigneeLastName: string;
  assigneeEmail: string;
  title: string;
  description: string;
  status: TaskStatus;
  completed: number;
  createdAt: string;
};

export type TaskListResponse = {
  items: TaskSearchResult[];
  total: number;
  page: number;
  pageSize: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "todo.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT 'prefer_not_to_say',
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT NOT NULL DEFAULT '',
    search_visible INTEGER NOT NULL DEFAULT 1,
    preferred_theme TEXT NOT NULL DEFAULT 'system',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const userColumns = db
  .prepare("PRAGMA table_info(users)")
  .all() as Array<{ name: string }>;

if (!userColumns.some((column) => column.name === "first_name")) {
  db.exec("ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT ''");
}

if (!userColumns.some((column) => column.name === "last_name")) {
  db.exec("ALTER TABLE users ADD COLUMN last_name TEXT NOT NULL DEFAULT ''");
}

if (!userColumns.some((column) => column.name === "gender")) {
  db.exec(
    "ALTER TABLE users ADD COLUMN gender TEXT NOT NULL DEFAULT 'prefer_not_to_say'"
  );
}

if (!userColumns.some((column) => column.name === "avatar_url")) {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''");
}

if (!userColumns.some((column) => column.name === "search_visible")) {
  db.exec("ALTER TABLE users ADD COLUMN search_visible INTEGER NOT NULL DEFAULT 1");
}

if (!userColumns.some((column) => column.name === "preferred_theme")) {
  db.exec(
    "ALTER TABLE users ADD COLUMN preferred_theme TEXT NOT NULL DEFAULT 'system'"
  );
}

if (!userColumns.some((column) => column.name === "is_admin")) {
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
}

// Normalize legacy rows created before stricter defaults/validation.
db.exec(`
  UPDATE users
  SET
    first_name = COALESCE(first_name, ''),
    last_name = COALESCE(last_name, ''),
    gender = CASE
      WHEN gender IN ('female', 'male', 'other', 'prefer_not_to_say')
      THEN gender
      ELSE 'prefer_not_to_say'
    END
`);

// Bootstrap: ensure there is always at least one admin.
const adminCountRow = db
  .prepare("SELECT COUNT(*) as count FROM users WHERE is_admin = 1")
  .get() as { count: number };
if ((adminCountRow?.count ?? 0) === 0) {
  db.exec(`
    UPDATE users
    SET is_admin = 1
    WHERE id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    owner_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const spaceColumns = db
  .prepare("PRAGMA table_info(spaces)")
  .all() as Array<{ name: string }>;

if (!spaceColumns.some((column) => column.name === "description")) {
  db.exec("ALTER TABLE spaces ADD COLUMN description TEXT NOT NULL DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS space_members (
    space_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'member')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (space_id, user_id),
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS space_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    invited_by_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at TEXT,
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite ON space_invites (space_id, email, status)"
);

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    space_id INTEGER,
    assignee_user_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'created',
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

const todoColumns = db
  .prepare("PRAGMA table_info(todos)")
  .all() as Array<{ name: string }>;

if (!todoColumns.some((column) => column.name === "user_id")) {
  db.exec("ALTER TABLE todos ADD COLUMN user_id INTEGER");
}

if (!todoColumns.some((column) => column.name === "space_id")) {
  db.exec("ALTER TABLE todos ADD COLUMN space_id INTEGER");
}

if (!todoColumns.some((column) => column.name === "assignee_user_id")) {
  db.exec("ALTER TABLE todos ADD COLUMN assignee_user_id INTEGER");
}

if (!todoColumns.some((column) => column.name === "status")) {
  db.exec("ALTER TABLE todos ADD COLUMN status TEXT NOT NULL DEFAULT 'created'");
}

if (!todoColumns.some((column) => column.name === "description")) {
  db.exec("ALTER TABLE todos ADD COLUMN description TEXT NOT NULL DEFAULT ''");
}

export const userQueries = {
  getByEmail: db.prepare(
    `SELECT
      id,
      first_name as firstName,
      last_name as lastName,
      gender,
      email,
      avatar_url as avatarUrl,
      search_visible as searchVisible,
      preferred_theme as preferredTheme,
      is_admin as isAdmin,
      password_hash as passwordHash,
      created_at as createdAt
     FROM users
     WHERE email = ?`
  ),
  getById: db.prepare(
    `SELECT
      id,
      first_name as firstName,
      last_name as lastName,
      gender,
      email,
      avatar_url as avatarUrl,
      search_visible as searchVisible,
      preferred_theme as preferredTheme,
      is_admin as isAdmin,
      created_at as createdAt
     FROM users
     WHERE id = ?`
  ),
  create: db.prepare(
    `INSERT INTO users (
      first_name,
      last_name,
      gender,
      email,
      avatar_url,
      search_visible,
      preferred_theme,
      is_admin,
      password_hash
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  updateProfile: db.prepare(
    `UPDATE users
     SET first_name = ?, last_name = ?, gender = ?, email = ?
     WHERE id = ?`
  ),
  updateSettings: db.prepare(
    `UPDATE users
     SET avatar_url = ?, search_visible = ?, preferred_theme = ?
     WHERE id = ?`
  ),
  updatePasswordHash: db.prepare(
    `UPDATE users
     SET password_hash = ?
     WHERE id = ?`
  ),
  updateAdminById: db.prepare(
    `UPDATE users
     SET is_admin = ?
     WHERE id = ?`
  ),
  removeById: db.prepare(`DELETE FROM users WHERE id = ?`),
  listAllForAdmin: db.prepare(
    `SELECT
      u.id,
      u.first_name as firstName,
      u.last_name as lastName,
      u.gender,
      u.email,
      u.avatar_url as avatarUrl,
      u.search_visible as searchVisible,
      u.preferred_theme as preferredTheme,
      u.is_admin as isAdmin,
      u.created_at as createdAt,
      (SELECT COUNT(*) FROM spaces s WHERE s.owner_user_id = u.id) as ownedSpaceCount,
      (SELECT COUNT(*) FROM todos t WHERE t.user_id = u.id) as createdTaskCount
     FROM users u
     ORDER BY u.id DESC`
  ),
  countAdmins: db.prepare(`SELECT COUNT(*) as count FROM users WHERE is_admin = 1`),
  searchByDirectory: db.prepare(
    `SELECT
      id,
      first_name as firstName,
      last_name as lastName,
      email
     FROM users
     WHERE search_visible = 1
       AND (
         first_name LIKE ?
         OR last_name LIKE ?
         OR email LIKE ?
       )
     ORDER BY first_name ASC, last_name ASC, email ASC
     LIMIT ?`
  )
};

export const spaceQueries = {
  createSpace: db.prepare(
    `INSERT INTO spaces (name, description, owner_user_id) VALUES (?, ?, ?)`
  ),
  removeSpace: db.prepare(`DELETE FROM spaces WHERE id = ?`),
  addMember: db.prepare(
    `INSERT OR IGNORE INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)`
  ),
  getSpacesForUser: db.prepare(
    `SELECT
      s.id,
      s.name,
      s.description,
      s.owner_user_id as ownerUserId,
      sm.role as role,
      (SELECT COUNT(*) FROM space_members sm2 WHERE sm2.space_id = s.id) as memberCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id) as totalTaskCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id AND t.status = 'done') as doneTaskCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id AND t.status != 'done') as openTaskCount,
      s.created_at as createdAt
     FROM spaces s
     JOIN space_members sm ON sm.space_id = s.id
     WHERE sm.user_id = ?
     ORDER BY s.id DESC`
  ),
  getMembership: db.prepare(
    `SELECT role FROM space_members WHERE space_id = ? AND user_id = ?`
  ),
  getMembers: db.prepare(
    `SELECT
      sm.user_id as userId,
      u.first_name as firstName,
      u.last_name as lastName,
      u.email,
      sm.role,
      sm.created_at as joinedAt
     FROM space_members sm
     JOIN users u ON u.id = sm.user_id
     WHERE sm.space_id = ?
     ORDER BY sm.role DESC, u.email ASC`
  ),
  getById: db.prepare(
    `SELECT
      s.id,
      s.name,
      s.description,
      s.owner_user_id as ownerUserId,
      'owner' as role,
      (SELECT COUNT(*) FROM space_members sm2 WHERE sm2.space_id = s.id) as memberCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id) as totalTaskCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id AND t.status = 'done') as doneTaskCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id AND t.status != 'done') as openTaskCount,
      s.created_at as createdAt
     FROM spaces s
     WHERE s.id = ?`
  ),
  updateById: db.prepare(
    `UPDATE spaces
     SET name = ?, description = ?
     WHERE id = ?`
  ),
  listAllForAdmin: db.prepare(
    `SELECT
      s.id,
      s.name,
      s.description,
      s.owner_user_id as ownerUserId,
      owner.email as ownerEmail,
      (SELECT COUNT(*) FROM space_members sm2 WHERE sm2.space_id = s.id) as memberCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id) as totalTaskCount,
      (SELECT COUNT(*) FROM todos t WHERE t.space_id = s.id AND t.status = 'done') as doneTaskCount,
      s.created_at as createdAt
     FROM spaces s
     JOIN users owner ON owner.id = s.owner_user_id
     ORDER BY s.id DESC`
  )
};

export const inviteQueries = {
  createInvite: db.prepare(
    `INSERT INTO space_invites (space_id, email, invited_by_user_id, status)
     VALUES (?, ?, ?, 'pending')`
  ),
  getPendingInviteForSpaceEmail: db.prepare(
    `SELECT id FROM space_invites WHERE space_id = ? AND email = ? AND status = 'pending'`
  ),
  getPendingInvitesForEmail: db.prepare(
    `SELECT
      si.id,
      si.space_id as spaceId,
      s.name as spaceName,
      si.email,
      COALESCE(invited.first_name, '') as invitedFirstName,
      COALESCE(invited.last_name, '') as invitedLastName,
      si.invited_by_user_id as invitedByUserId,
      u.email as invitedByEmail,
      si.status,
      si.created_at as createdAt
     FROM space_invites si
     JOIN spaces s ON s.id = si.space_id
     JOIN users u ON u.id = si.invited_by_user_id
     LEFT JOIN users invited ON invited.email = si.email
     WHERE si.email = ? AND si.status = 'pending'
     ORDER BY si.id DESC`
  ),
  getInvitesForSpace: db.prepare(
    `SELECT
      si.id,
      si.space_id as spaceId,
      s.name as spaceName,
      si.email,
      COALESCE(invited.first_name, '') as invitedFirstName,
      COALESCE(invited.last_name, '') as invitedLastName,
      si.invited_by_user_id as invitedByUserId,
      u.email as invitedByEmail,
      si.status,
      si.created_at as createdAt
     FROM space_invites si
     JOIN spaces s ON s.id = si.space_id
     JOIN users u ON u.id = si.invited_by_user_id
     LEFT JOIN users invited ON invited.email = si.email
     WHERE si.space_id = ?
     ORDER BY si.id DESC`
  ),
  getInviteById: db.prepare(
    `SELECT id, space_id as spaceId, email, invited_by_user_id as invitedByUserId, status
     FROM space_invites
     WHERE id = ?`
  ),
  acceptInvite: db.prepare(
    `UPDATE space_invites SET status = 'accepted', responded_at = datetime('now')
     WHERE id = ?`
  )
};

export const todoQueries = {
  getAllBySpace: db.prepare(
    `SELECT
      id,
      user_id as userId,
      space_id as spaceId,
      assignee_user_id as assigneeUserId,
      title,
      description,
      status,
      completed,
      created_at as createdAt
     FROM todos
     WHERE space_id = ?
     ORDER BY id DESC`
  ),
  create: db.prepare(
    `INSERT INTO todos (user_id, space_id, assignee_user_id, title, description, status, completed)
     VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 'done' THEN 1 ELSE 0 END)`
  ),
  getByIdForSpace: db.prepare(
    `SELECT
      id,
      user_id as userId,
      space_id as spaceId,
      assignee_user_id as assigneeUserId,
      title,
      description,
      status,
      completed,
      created_at as createdAt
     FROM todos
     WHERE id = ? AND space_id = ?`
  ),
  updateCompleted: db.prepare(
    `UPDATE todos
     SET completed = ?, status = CASE WHEN ? = 1 THEN 'done' ELSE 'created' END
     WHERE id = ? AND space_id = ?`
  ),
  updateTitle: db.prepare(`UPDATE todos SET title = ? WHERE id = ? AND space_id = ?`),
  updateDescription: db.prepare(
    `UPDATE todos
     SET description = ?
     WHERE id = ? AND space_id = ?`
  ),
  updateStatus: db.prepare(
    `UPDATE todos
     SET status = ?,
         completed = CASE WHEN ? = 'done' THEN 1 ELSE 0 END
     WHERE id = ? AND space_id = ?`
  ),
  updateAssignee: db.prepare(
    `UPDATE todos
     SET assignee_user_id = ?
     WHERE id = ? AND space_id = ?`
  ),
  remove: db.prepare(`DELETE FROM todos WHERE id = ? AND space_id = ?`),
  removeById: db.prepare(`DELETE FROM todos WHERE id = ?`),
  getTaskByIdAdmin: db.prepare(
    `SELECT
      t.id,
      t.space_id as spaceId,
      s.name as spaceName,
      t.user_id as userId,
      creator.email as creatorEmail,
      t.assignee_user_id as assigneeUserId,
      COALESCE(assignee.first_name, '') as assigneeFirstName,
      COALESCE(assignee.last_name, '') as assigneeLastName,
      COALESCE(assignee.email, '') as assigneeEmail,
      t.title,
      t.description,
      t.status,
      t.completed,
      t.created_at as createdAt
     FROM todos t
     LEFT JOIN spaces s ON s.id = t.space_id
     LEFT JOIN users creator ON creator.id = t.user_id
     LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
     WHERE t.id = ?`
  ),
  getAllForAdmin: db.prepare(
    `SELECT
      t.id,
      t.space_id as spaceId,
      s.name as spaceName,
      t.user_id as userId,
      creator.email as creatorEmail,
      t.assignee_user_id as assigneeUserId,
      COALESCE(assignee.first_name, '') as assigneeFirstName,
      COALESCE(assignee.last_name, '') as assigneeLastName,
      COALESCE(assignee.email, '') as assigneeEmail,
      t.title,
      t.description,
      t.status,
      t.completed,
      t.created_at as createdAt
     FROM todos t
     LEFT JOIN spaces s ON s.id = t.space_id
     LEFT JOIN users creator ON creator.id = t.user_id
     LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
     ORDER BY t.id DESC`
  ),
  searchForUser: db.prepare(
    `SELECT
      t.id,
      t.space_id as spaceId,
      s.name as spaceName,
      t.user_id as userId,
      t.assignee_user_id as assigneeUserId,
      COALESCE(assignee.first_name, '') as assigneeFirstName,
      COALESCE(assignee.last_name, '') as assigneeLastName,
      COALESCE(assignee.email, '') as assigneeEmail,
      t.title,
      t.description,
      t.status,
      t.completed,
      t.created_at as createdAt
     FROM todos t
     JOIN spaces s ON s.id = t.space_id
     JOIN space_members sm ON sm.space_id = s.id
     LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
     WHERE sm.user_id = ? AND t.title LIKE ?
     ORDER BY t.id DESC
     LIMIT 100`
  ),
  getTasksForUser: db.prepare(
    `SELECT
      t.id,
      t.space_id as spaceId,
      s.name as spaceName,
      t.user_id as userId,
      t.assignee_user_id as assigneeUserId,
      COALESCE(assignee.first_name, '') as assigneeFirstName,
      COALESCE(assignee.last_name, '') as assigneeLastName,
      COALESCE(assignee.email, '') as assigneeEmail,
      t.title,
      t.description,
      t.status,
      t.completed,
      t.created_at as createdAt
     FROM todos t
     JOIN spaces s ON s.id = t.space_id
     JOIN space_members sm ON sm.space_id = s.id
     LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
     WHERE sm.user_id = ?
       AND (? IS NULL OR t.space_id = ?)
       AND (? = '' OR t.title LIKE ?)
     ORDER BY t.id DESC
     LIMIT ? OFFSET ?`
  ),
  getTaskByIdForUser: db.prepare(
    `SELECT
      t.id,
      t.space_id as spaceId,
      s.name as spaceName,
      t.user_id as userId,
      t.assignee_user_id as assigneeUserId,
      COALESCE(assignee.first_name, '') as assigneeFirstName,
      COALESCE(assignee.last_name, '') as assigneeLastName,
      COALESCE(assignee.email, '') as assigneeEmail,
      t.title,
      t.description,
      t.status,
      t.completed,
      t.created_at as createdAt
     FROM todos t
     JOIN spaces s ON s.id = t.space_id
     JOIN space_members sm ON sm.space_id = s.id
     LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
     WHERE t.id = ? AND sm.user_id = ?`
  ),
  countTasksForUser: db.prepare(
    `SELECT COUNT(*) as count
     FROM todos t
     JOIN spaces s ON s.id = t.space_id
     JOIN space_members sm ON sm.space_id = s.id
     WHERE sm.user_id = ?
       AND (? IS NULL OR t.space_id = ?)
       AND (? = '' OR t.title LIKE ?)`
  )
};

export const adminQueries = {
  getOverview: db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM spaces) as spaces,
      (SELECT COUNT(*) FROM todos) as tasks`
  )
};
