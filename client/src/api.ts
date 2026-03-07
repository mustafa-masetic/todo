import type {
  AdminOverview,
  AdminSpaceRow,
  AdminTaskRow,
  AdminUserRow,
  AuthResponse,
  Gender,
  PreferredTheme,
  Space,
  SpaceInvite,
  SpaceMember,
  TaskListResponse,
  TaskSearchResult,
  TaskStatus,
  Todo,
  UserLookupResult,
  User
} from "./types";

const TOKEN_KEY = "todo-flow-auth-token";

export type ProfilePayload = {
  firstName: string;
  lastName: string;
  gender: Gender;
  email: string;
};

export type SettingsPayload = {
  avatarUrl: string;
  searchVisible: boolean;
  preferredTheme: PreferredTheme;
};

export type TasksQuery = {
  q?: string;
  spaceId?: number;
  page?: number;
  pageSize?: number;
};

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Keep fallback message.
    }

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function register(profile: ProfilePayload, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...profile, password })
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getMe(): Promise<User> {
  return apiRequest<User>("/api/auth/me");
}

export function updateMe(profile: ProfilePayload): Promise<User> {
  return apiRequest<User>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(profile)
  });
}

export function updateSettings(settings: SettingsPayload): Promise<User> {
  return apiRequest<User>("/api/auth/settings", {
    method: "PUT",
    body: JSON.stringify(settings)
  });
}

export function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>("/api/auth/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export function searchTasks(q: string): Promise<TaskSearchResult[]> {
  const query = encodeURIComponent(q.trim());
  return apiRequest<TaskSearchResult[]>(`/api/tasks/search?q=${query}`);
}

export function searchUsers(q: string): Promise<UserLookupResult[]> {
  const query = encodeURIComponent(q.trim());
  return apiRequest<UserLookupResult[]>(`/api/users/search?q=${query}`);
}

export function getTasks(params: TasksQuery): Promise<TaskListResponse> {
  const query = new URLSearchParams();

  if (params.q) {
    query.set("q", params.q);
  }

  if (typeof params.spaceId === "number") {
    query.set("spaceId", String(params.spaceId));
  }

  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));

  return apiRequest<TaskListResponse>(`/api/tasks?${query.toString()}`);
}

export function getTask(taskId: number): Promise<TaskSearchResult> {
  return apiRequest<TaskSearchResult>(`/api/tasks/${taskId}`);
}

export function getAdminOverview(): Promise<AdminOverview> {
  return apiRequest<AdminOverview>("/api/admin/overview");
}

export function getAdminUsers(): Promise<AdminUserRow[]> {
  return apiRequest<AdminUserRow[]>("/api/admin/users");
}

export function updateAdminUser(
  userId: number,
  payload: {
    firstName?: string;
    lastName?: string;
    gender?: Gender;
    searchVisible?: boolean;
    preferredTheme?: PreferredTheme;
    isAdmin?: boolean;
  }
): Promise<User> {
  return apiRequest<User>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function resetAdminUserPassword(
  userId: number,
  newPassword: string
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/api/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword })
  });
}

export function adminBulkUsers(payload: {
  action: "set-admin" | "unset-admin" | "delete";
  userIds: number[];
}): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>("/api/admin/users/bulk", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminSpaces(): Promise<AdminSpaceRow[]> {
  return apiRequest<AdminSpaceRow[]>("/api/admin/spaces");
}

export function updateAdminSpace(
  spaceId: number,
  payload: { name: string; description: string }
): Promise<Space> {
  return apiRequest<Space>(`/api/admin/spaces/${spaceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteAdminSpace(spaceId: number): Promise<void> {
  return apiRequest<void>(`/api/admin/spaces/${spaceId}`, {
    method: "DELETE"
  });
}

export function adminBulkSpaces(payload: {
  action: "delete";
  spaceIds: number[];
}): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>("/api/admin/spaces/bulk", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminTasks(): Promise<AdminTaskRow[]> {
  return apiRequest<AdminTaskRow[]>("/api/admin/tasks");
}

export function updateAdminTask(
  taskId: number,
  payload: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeUserId?: number | null;
  }
): Promise<TaskSearchResult> {
  return apiRequest<TaskSearchResult>(`/api/admin/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteAdminTask(taskId: number): Promise<void> {
  return apiRequest<void>(`/api/admin/tasks/${taskId}`, {
    method: "DELETE"
  });
}

export function adminBulkTasks(payload: {
  action: "set-status" | "delete";
  taskIds: number[];
  status?: TaskStatus;
}): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>("/api/admin/tasks/bulk", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateTask(
  taskId: number,
  payload: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeUserId?: number | null;
  }
): Promise<TaskSearchResult> {
  return apiRequest<TaskSearchResult>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getSpaces(): Promise<Space[]> {
  return apiRequest<Space[]>("/api/spaces");
}

export function createSpace(payload: { name: string; description: string }): Promise<Space> {
  return apiRequest<Space>("/api/spaces", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteSpace(spaceId: number): Promise<void> {
  return apiRequest<void>(`/api/spaces/${spaceId}`, {
    method: "DELETE"
  });
}

export function getSpaceMembers(spaceId: number): Promise<SpaceMember[]> {
  return apiRequest<SpaceMember[]>(`/api/spaces/${spaceId}/members`);
}

export function inviteToSpace(
  spaceId: number,
  email: string
): Promise<{ ok: true; invitedFirstName: string; invitedLastName: string; email: string }> {
  return apiRequest<{
    ok: true;
    invitedFirstName: string;
    invitedLastName: string;
    email: string;
  }>(`/api/spaces/${spaceId}/invites`, {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function getInvites(): Promise<SpaceInvite[]> {
  return apiRequest<SpaceInvite[]>("/api/invites");
}

export function getSpaceInvites(spaceId: number): Promise<SpaceInvite[]> {
  return apiRequest<SpaceInvite[]>(`/api/spaces/${spaceId}/invites`);
}

export function acceptInvite(inviteId: number): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/api/invites/${inviteId}/accept`, {
    method: "POST"
  });
}

export function getTodos(spaceId: number): Promise<Todo[]> {
  return apiRequest<Todo[]>(`/api/spaces/${spaceId}/todos`);
}

export function createTodo(
  spaceId: number,
  payload: {
    title: string;
    description: string;
    status: TaskStatus;
    assigneeUserId: number | null;
  }
): Promise<Todo> {
  return apiRequest<Todo>(`/api/spaces/${spaceId}/todos`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateTodo(
  spaceId: number,
  id: number,
  payload: {
    completed?: boolean;
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeUserId?: number | null;
  }
): Promise<Todo> {
  return apiRequest<Todo>(`/api/spaces/${spaceId}/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteTodo(spaceId: number, id: number): Promise<void> {
  return apiRequest<void>(`/api/spaces/${spaceId}/todos/${id}`, {
    method: "DELETE"
  });
}
