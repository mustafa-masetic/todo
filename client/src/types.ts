export type Gender = "female" | "male" | "other" | "prefer_not_to_say";
export type PreferredTheme = "light" | "dark" | "system";
export type TaskStatus = "created" | "in_progress" | "done";

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

export type AuthResponse = {
  token: string;
  user: User;
};

export type AdminOverview = {
  users: number;
  spaces: number;
  tasks: number;
  adminEmail: string;
};

export type AdminUserRow = User & {
  ownedSpaceCount: number;
  createdTaskCount: number;
};

export type AdminSpaceRow = Space & {
  ownerEmail: string;
};

export type AdminTaskRow = TaskSearchResult & {
  creatorEmail: string;
};
