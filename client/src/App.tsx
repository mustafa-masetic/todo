import {
  ActionIcon,
  Anchor,
  AppShell,
  Avatar,
  Badge,
  Breadcrumbs,
  Box,
  Burger,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Drawer,
  Group,
  Loader,
  Menu,
  Modal,
  Pagination,
  PasswordInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconChevronDown,
  IconLogout,
  IconMoon,
  IconKey,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShield,
  IconShieldCheck,
  IconShieldX,
  IconSun,
  IconTrash,
  IconUserPlus,
  IconUserCircle,
  IconUsers,
  IconWriting
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvite,
  changePassword,
  clearStoredToken,
  createSpace,
  createTodo,
  deleteAdminSpace,
  deleteAdminTask,
  deleteSpace,
  deleteTodo,
  getAdminOverview,
  getAdminSpaces,
  getAdminTasks,
  getAdminUsers,
  getInvites,
  getMe,
  getSpaceMembers,
  getSpaceInvites,
  getSpaces,
  getStoredToken,
  getTask,
  getTasks,
  getTodos,
  resetAdminUserPassword,
  inviteToSpace,
  login,
  register,
  searchTasks,
  searchUsers,
  setStoredToken,
  adminBulkSpaces,
  adminBulkTasks,
  adminBulkUsers,
  updateAdminSpace,
  updateAdminTask,
  updateAdminUser,
  updateMe,
  updateSettings,
  updateTask,
  type ProfilePayload,
  type SettingsPayload
} from "./api";
import type {
  AdminSpaceRow,
  AdminTaskRow,
  AdminUserRow,
  AuthResponse,
  Gender,
  PreferredTheme,
  TaskStatus
} from "./types";

type AuthMode = "login" | "register";

const SELECTED_SPACE_KEY = "todo-flow-selected-space";
const ADMIN_ITEMS_PER_PAGE = 10;

function slugifySpaceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function getStoredSelectedSpace(): number | null {
  const raw = localStorage.getItem(SELECTED_SPACE_KEY);
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

function getInitialProfile(): ProfilePayload {
  return {
    firstName: "",
    lastName: "",
    gender: "prefer_not_to_say",
    email: ""
  };
}

function normalizeGender(value: unknown): Gender {
  if (
    value === "female" ||
    value === "male" ||
    value === "other" ||
    value === "prefer_not_to_say"
  ) {
    return value;
  }

  return "prefer_not_to_say";
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getInitialSettings(): SettingsPayload {
  return {
    avatarUrl: "",
    searchVisible: true,
    preferredTheme: "system"
  };
}

function parsePageFromSearch(search: string): number {
  const rawPage = new URLSearchParams(search).get("page");
  if (!rawPage) {
    return 1;
  }

  const parsed = Number(rawPage);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function App() {
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(window.location.search);
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [sessionToken, setSessionToken] = useState<string | null>(getStoredToken());
  const [profileForm, setProfileForm] = useState<ProfilePayload>(getInitialProfile());
  const [settingsForm, setSettingsForm] = useState<SettingsPayload>(getInitialSettings());
  const [themeChoice, setThemeChoice] = useState<PreferredTheme>("system");
  const [themeInitializedUserId, setThemeInitializedUserId] = useState<number | null>(
    null
  );
  const [formsInitializedUserId, setFormsInitializedUserId] = useState<number | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spacesSearch, setSpacesSearch] = useState("");
  const [debouncedSpacesSearch, setDebouncedSpacesSearch] = useState("");
  const [spacesPage, setSpacesPage] = useState(
    window.location.pathname === "/spaces" ? parsePageFromSearch(window.location.search) : 1
  );
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteSearchValue, setInviteSearchValue] = useState("");
  const [debouncedInviteSearch, setDebouncedInviteSearch] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(
    getStoredSelectedSpace()
  );
  const [searchValue, setSearchValue] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchValue, setGlobalSearchValue] = useState("");
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = useState("");
  const [tasksFilterSpaceId, setTasksFilterSpaceId] = useState<string>("all");
  const [tasksPage, setTasksPage] = useState(
    window.location.pathname === "/tasks"
      ? parsePageFromSearch(window.location.search)
      : 1
  );
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("created");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("unassigned");
  const [adminTab, setAdminTab] = useState<"users" | "spaces" | "tasks">("users");
  const [adminUsersSearch, setAdminUsersSearch] = useState("");
  const [adminSpacesSearch, setAdminSpacesSearch] = useState("");
  const [adminTasksSearch, setAdminTasksSearch] = useState("");
  const [adminUsersPage, setAdminUsersPage] = useState(1);
  const [adminSpacesPage, setAdminSpacesPage] = useState(1);
  const [adminTasksPage, setAdminTasksPage] = useState(1);
  const [selectedAdminUserIds, setSelectedAdminUserIds] = useState<number[]>([]);
  const [selectedAdminSpaceIds, setSelectedAdminSpaceIds] = useState<number[]>([]);
  const [selectedAdminTaskIds, setSelectedAdminTaskIds] = useState<number[]>([]);
  const [adminBulkTaskStatus, setAdminBulkTaskStatus] = useState<TaskStatus>("created");
  const [adminResetPasswordByUserId, setAdminResetPasswordByUserId] = useState<
    Record<number, string>
  >({});
  const [adminUserEditTarget, setAdminUserEditTarget] = useState<{
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [taskDetailTitle, setTaskDetailTitle] = useState("");
  const [taskDetailDescription, setTaskDetailDescription] = useState("");
  const [taskDetailStatus, setTaskDetailStatus] = useState<TaskStatus>("created");
  const [taskDetailAssignee, setTaskDetailAssignee] = useState<string>("unassigned");
  const [taskTitleEditMode, setTaskTitleEditMode] = useState(false);
  const [taskDescriptionEditMode, setTaskDescriptionEditMode] = useState(false);
  const [taskDeleteTarget, setTaskDeleteTarget] = useState<{
    spaceId: number;
    taskId: number;
    taskTitle: string;
    fromDetail: boolean;
  } | null>(null);
  const [spaceDeleteTarget, setSpaceDeleteTarget] = useState<{
    spaceId: number;
    spaceName: string;
  } | null>(null);
  const [adminUserDeleteTarget, setAdminUserDeleteTarget] = useState<{
    userIds: number[];
    label: string;
  } | null>(null);
  const [adminUserRoleTarget, setAdminUserRoleTarget] = useState<{
    userId: number;
    label: string;
    nextIsAdmin: boolean;
  } | null>(null);
  const [adminUserPasswordTarget, setAdminUserPasswordTarget] = useState<{
    userId: number;
    label: string;
    password: string;
  } | null>(null);
  const [adminSpaceEditTarget, setAdminSpaceEditTarget] = useState<{
    spaceId: number;
    name: string;
    description: string;
  } | null>(null);
  const [adminTaskEditTarget, setAdminTaskEditTarget] = useState<{
    taskId: number;
    title: string;
    description: string;
    status: TaskStatus;
  } | null>(null);
  const [adminSpaceDeleteTarget, setAdminSpaceDeleteTarget] = useState<{
    spaceIds: number[];
    label: string;
  } | null>(null);
  const [adminTaskDeleteTarget, setAdminTaskDeleteTarget] = useState<{
    taskIds: number[];
    label: string;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const globalSearchInputRef = useRef<HTMLInputElement>(null);
  const inviteSearchInputRef = useRef<HTMLInputElement>(null);
  const taskTitleTapRef = useRef(0);
  const taskDescriptionTapRef = useRef(0);
  const hasInitializedSpacesSearchRef = useRef(false);
  const hasInitializedTaskFiltersRef = useRef(false);
  const globalSpaceSearchCacheRef = useRef<
    Array<{
      id: number;
      name: string;
      description: string;
      role: "owner" | "member";
    }>
  >([]);
  const globalSpaceSearchCacheKeyRef = useRef("");

  const { setColorScheme } = useMantineColorScheme();
  const colorScheme = useComputedColorScheme("light");

  const meQuery = useQuery({
    queryKey: ["me", sessionToken],
    queryFn: getMe,
    enabled: Boolean(sessionToken),
    retry: false
  });

  const spacesQuery = useQuery({
    queryKey: ["spaces", sessionToken],
    queryFn: getSpaces,
    enabled: Boolean(sessionToken) && Boolean(meQuery.data)
  });

  const invitesQuery = useQuery({
    queryKey: ["invites", sessionToken],
    queryFn: getInvites,
    enabled: Boolean(sessionToken) && Boolean(meQuery.data)
  });

  const activityPathMatch = currentPath.match(
    /^\/spaces\/(?!activities$)([^/]+)(?:\/(members|tasks))?$/
  );
  const activitySpaceSlug = activityPathMatch ? activityPathMatch[1] : null;
  const activityTab = activityPathMatch?.[2] === "members" ? "members" : "tasks";
  const activitySpace = useMemo(
    () =>
      (spacesQuery.data ?? []).find(
        (space) => slugifySpaceName(space.name) === activitySpaceSlug
      ) ?? null,
    [activitySpaceSlug, spacesQuery.data]
  );
  const activitySpaceId = activitySpace?.id ?? null;
  const taskDetailMatch = currentPath.match(/^\/tasks\/(\d+)$/);
  const taskDetailId = taskDetailMatch ? Number(taskDetailMatch[1]) : null;

  const activityMembersQuery = useQuery({
    queryKey: ["activity-members", activitySpaceId, sessionToken],
    queryFn: () => getSpaceMembers(activitySpaceId as number),
    enabled: Boolean(activitySpaceId) && Boolean(sessionToken) && Boolean(meQuery.data)
  });

  const activityInvitesQuery = useQuery({
    queryKey: ["activity-invites", activitySpaceId, sessionToken],
    queryFn: () => getSpaceInvites(activitySpaceId as number),
    enabled: Boolean(activitySpaceId) && Boolean(sessionToken) && Boolean(meQuery.data)
  });

  const activityTodosQuery = useQuery({
    queryKey: ["activity-todos", activitySpaceId, sessionToken],
    queryFn: () => getTodos(activitySpaceId as number),
    enabled: Boolean(activitySpaceId) && Boolean(sessionToken) && Boolean(meQuery.data)
  });
  const liveInviteSearch = inviteSearchValue.trim();
  const trimmedInviteSearch = debouncedInviteSearch.trim();
  const inviteUsersQuery = useQuery({
    queryKey: ["users-search", trimmedInviteSearch, sessionToken],
    queryFn: () => searchUsers(trimmedInviteSearch),
    enabled:
      inviteModalOpen &&
      activitySpace?.role === "owner" &&
      Boolean(sessionToken) &&
      Boolean(meQuery.data) &&
      trimmedInviteSearch.length >= 3,
    placeholderData: (previous) => previous
  });

  const trimmedSearch = searchValue.trim();
  const effectiveSearch = trimmedSearch.length >= 3 ? trimmedSearch : "";
  const effectiveSpaceId =
    tasksFilterSpaceId === "all" ? undefined : Number(tasksFilterSpaceId);

  const tasksQuery = useQuery({
    queryKey: [
      "tasks",
      effectiveSearch,
      effectiveSpaceId ?? "all",
      tasksPage,
      sessionToken
    ],
    queryFn: () =>
      getTasks({
        q: effectiveSearch,
        spaceId: effectiveSpaceId,
        page: tasksPage,
        pageSize: 10
      }),
    enabled: Boolean(sessionToken) && Boolean(meQuery.data)
  });
  const liveGlobalSearch = globalSearchValue.trim();
  const trimmedGlobalSearch = debouncedGlobalSearch.trim();
  const globalTaskSearchQuery = useQuery({
    queryKey: ["tasks-search-global", trimmedGlobalSearch, sessionToken],
    queryFn: () => searchTasks(trimmedGlobalSearch),
    enabled:
      globalSearchOpen &&
      trimmedGlobalSearch.length >= 2 &&
      Boolean(sessionToken) &&
      Boolean(meQuery.data),
    placeholderData: (previous) => previous
  });
  const homeTasksQuery = useQuery({
    queryKey: ["tasks", "home", sessionToken],
    queryFn: () =>
      getTasks({
        page: 1,
        pageSize: 6
      }),
    enabled: Boolean(sessionToken) && Boolean(meQuery.data)
  });
  const adminOverviewQuery = useQuery({
    queryKey: ["admin-overview", sessionToken],
    queryFn: getAdminOverview,
    enabled: Boolean(sessionToken) && Boolean(meQuery.data?.isAdmin)
  });
  const adminUsersQuery = useQuery({
    queryKey: ["admin-users", sessionToken],
    queryFn: getAdminUsers,
    enabled: Boolean(sessionToken) && Boolean(meQuery.data?.isAdmin)
  });
  const adminSpacesQuery = useQuery({
    queryKey: ["admin-spaces", sessionToken],
    queryFn: getAdminSpaces,
    enabled: Boolean(sessionToken) && Boolean(meQuery.data?.isAdmin)
  });
  const adminTasksQuery = useQuery({
    queryKey: ["admin-tasks", sessionToken],
    queryFn: getAdminTasks,
    enabled: Boolean(sessionToken) && Boolean(meQuery.data?.isAdmin)
  });

  const taskDetailQuery = useQuery({
    queryKey: ["task-detail", taskDetailId, sessionToken],
    queryFn: () => getTask(taskDetailId as number),
    enabled: Boolean(taskDetailId) && Boolean(sessionToken) && Boolean(meQuery.data)
  });

  const taskDetailMembersQuery = useQuery({
    queryKey: ["task-detail-members", taskDetailQuery.data?.spaceId ?? null, sessionToken],
    queryFn: () => getSpaceMembers(taskDetailQuery.data?.spaceId as number),
    enabled:
      Boolean(taskDetailQuery.data?.spaceId) &&
      Boolean(sessionToken) &&
      Boolean(meQuery.data)
  });

  useEffect(() => {
    if (!spacesQuery.data) {
      return;
    }

    if (spacesQuery.data.length === 0) {
      setSelectedSpaceId(null);
      localStorage.removeItem(SELECTED_SPACE_KEY);
      return;
    }

    const exists = selectedSpaceId
      ? spacesQuery.data.some((space) => space.id === selectedSpaceId)
      : false;

    if (!exists) {
      const fallback = spacesQuery.data[0].id;
      setSelectedSpaceId(fallback);
      localStorage.setItem(SELECTED_SPACE_KEY, String(fallback));
    }
  }, [spacesQuery.data, selectedSpaceId]);

  useEffect(() => {
    if (currentPath !== "/spaces/activities") {
      return;
    }

    const target = selectedSpaceId ?? spacesQuery.data?.[0]?.id ?? null;
    if (target) {
      const targetSpace = spacesQuery.data?.find((space) => space.id === target);
      const slug = slugifySpaceName(targetSpace?.name ?? "space");
      navigateTo(`/spaces/${slug}/tasks`);
    }
  }, [currentPath, selectedSpaceId, spacesQuery.data]);

  useEffect(() => {
    if (!activitySpaceId) {
      return;
    }

    setSelectedSpaceId(activitySpaceId);
    localStorage.setItem(SELECTED_SPACE_KEY, String(activitySpaceId));
  }, [activitySpaceId]);

  useEffect(() => {
    setInviteModalOpen(false);
    setInviteSearchValue("");
    setDebouncedInviteSearch("");
  }, [activitySpaceId]);

  useEffect(() => {
    if (!hasInitializedSpacesSearchRef.current) {
      hasInitializedSpacesSearchRef.current = true;
      return;
    }

    setSpacesPage(1);

    if (window.location.pathname !== "/spaces") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.has("page")) {
      return;
    }

    params.delete("page");
    const nextSearch = params.toString();
    const normalizedNextSearch = nextSearch ? `?${nextSearch}` : "";
    window.history.replaceState({}, "", `/spaces${normalizedNextSearch}`);
    setCurrentSearch(normalizedNextSearch);
  }, [debouncedSpacesSearch]);

  useEffect(() => {
    if (!hasInitializedTaskFiltersRef.current) {
      hasInitializedTaskFiltersRef.current = true;
      return;
    }

    setTasksPage(1);

    if (window.location.pathname !== "/tasks") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.has("page")) {
      return;
    }

    params.delete("page");
    const nextSearch = params.toString();
    const normalizedNextSearch = nextSearch ? `?${nextSearch}` : "";
    window.history.replaceState({}, "", `/tasks${normalizedNextSearch}`);
    setCurrentSearch(normalizedNextSearch);
  }, [tasksFilterSpaceId, effectiveSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedInviteSearch(inviteSearchValue);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [inviteSearchValue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedGlobalSearch(globalSearchValue);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [globalSearchValue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSpacesSearch(spacesSearch);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [spacesSearch]);

  useEffect(() => {
    if (!meQuery.data) {
      return;
    }

    if (formsInitializedUserId !== meQuery.data.id) {
      setProfileForm({
        firstName: normalizeString(meQuery.data.firstName),
        lastName: normalizeString(meQuery.data.lastName),
        gender: normalizeGender(meQuery.data.gender),
        email: normalizeString(meQuery.data.email)
      });

      setSettingsForm({
        avatarUrl: normalizeString(meQuery.data.avatarUrl),
        searchVisible: meQuery.data.searchVisible === 1,
        preferredTheme: meQuery.data.preferredTheme
      });
      setFormsInitializedUserId(meQuery.data.id);
    }

    if (themeInitializedUserId !== meQuery.data.id) {
      const preferred = meQuery.data.preferredTheme;
      setThemeChoice(preferred);
      setColorScheme(preferred === "system" ? "auto" : preferred);
      setThemeInitializedUserId(meQuery.data.id);
    }
  }, [formsInitializedUserId, meQuery.data, setColorScheme, themeInitializedUserId]);

  const authMutation = useMutation({
    mutationFn: ({ mode, profile, passwordValue }: {
      mode: AuthMode;
      profile: ProfilePayload;
      passwordValue: string;
    }) =>
      mode === "register"
        ? register(profile, passwordValue)
        : login(profile.email, passwordValue),
    onSuccess: (data: AuthResponse, variables) => {
      setStoredToken(data.token);
      setSessionToken(data.token);
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      notifications.show({
        color: "teal",
        title: variables.mode === "register" ? "Account created" : "Welcome back",
        message: `Signed in as ${data.user.email}`
      });
      navigateTo("/");
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Authentication failed",
        message: error.message
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: ProfilePayload) => updateMe(payload),
    onSuccess: (updated) => {
      setProfileForm({
        firstName: normalizeString(updated.firstName),
        lastName: normalizeString(updated.lastName),
        gender: normalizeGender(updated.gender),
        email: normalizeString(updated.email)
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      notifications.show({
        color: "teal",
        title: "Profile updated",
        message: "Your account details were saved."
      });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Profile update failed",
        message: error.message
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: SettingsPayload) => updateSettings(payload),
    onSuccess: (updated) => {
      setSettingsForm({
        avatarUrl: normalizeString(updated.avatarUrl),
        searchVisible: updated.searchVisible === 1,
        preferredTheme: updated.preferredTheme
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      notifications.show({
        color: "teal",
        title: "Settings updated",
        message: "Your preferences were saved."
      });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Settings update failed",
        message: error.message
      });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPwd, newPwd }: { currentPwd: string; newPwd: string }) =>
      changePassword(currentPwd, newPwd),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      notifications.show({
        color: "teal",
        title: "Password updated",
        message: "Your password has been changed."
      });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Password update failed",
        message: error.message
      });
    }
  });

  const createSpaceMutation = useMutation({
    mutationFn: createSpace,
    onSuccess: (space) => {
      setSpaceName("");
      setSpaceDescription("");
      setSpaceModalOpen(false);
      setSelectedSpaceId(space.id);
      localStorage.setItem(SELECTED_SPACE_KEY, String(space.id));
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      notifications.show({
        color: "teal",
        title: "Space created",
        message: `${space.name} is ready`
      });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Could not create space",
        message: error.message
      });
    }
  });

  const inviteMutation = useMutation({
    mutationFn: ({ spaceId, emailValue }: { spaceId: number; emailValue: string }) =>
      inviteToSpace(spaceId, emailValue),
    onSuccess: () => {
      setInviteSearchValue("");
      setDebouncedInviteSearch("");
      setInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["activity-invites"] });
      notifications.show({
        color: "teal",
        title: "Invite sent",
        message: "The user can accept from their account."
      });
    },
    onError: (error: Error) => {
      const isAlreadyInvited =
        error.message.toLowerCase().includes("pending invite already exists") ||
        error.message.toLowerCase().includes("already invited");

      notifications.show({
        color: isAlreadyInvited ? "yellow" : "red",
        title: isAlreadyInvited ? "Invite already sent" : "Invite failed",
        message: isAlreadyInvited
          ? "This user already has a pending invite for this space."
          : error.message
      });
    }
  });

  const acceptInviteMutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      notifications.show({
        color: "teal",
        title: "Invite accepted",
        message: "You are now a member of the space."
      });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Could not accept invite",
        message: error.message
      });
    }
  });

  const createTodoMutation = useMutation({
    mutationFn: ({
      spaceId,
      taskTitle,
      taskDescription,
      taskStatus,
      assigneeUserId
    }: {
      spaceId: number;
      taskTitle: string;
      taskDescription: string;
      taskStatus: TaskStatus;
      assigneeUserId: number | null;
    }) =>
      createTodo(spaceId, {
        title: taskTitle,
        description: taskDescription,
        status: taskStatus,
        assigneeUserId
      }),
    onSuccess: (_data, variables) => {
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskStatus("created");
      setNewTaskAssignee("unassigned");
      setTaskModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["activity-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      notifications.show({
        color: "teal",
        title: "Task added",
        message: `New task '${variables.taskTitle.trim()}' has been successfully added`,
        position: "bottom-left"
      });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Could not add todo",
        message: error.message
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      spaceId,
      id,
      fromDetail
    }: {
      spaceId: number;
      id: number;
      fromDetail: boolean;
    }) => deleteTodo(spaceId, id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["activity-todos"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      if (variables.fromDetail) {
        navigateTo("/tasks");
      }
      notifications.show({
        color: "teal",
        title: "Task deleted",
        message: "The task has been removed."
      });
      setTaskDeleteTarget(null);
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Task delete failed",
        message: error.message
      });
    }
  });

  const updateTaskDetailMutation = useMutation({
    mutationFn: ({
      taskId,
      title,
      description,
      status,
      assigneeUserId
    }: {
      taskId: number;
      title: string;
      description: string;
      status: TaskStatus;
      assigneeUserId: number | null;
    }) => updateTask(taskId, { title, description, status, assigneeUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-detail"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity-todos"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      notifications.show({
        color: "teal",
        title: "Task updated",
        message: "Task details have been saved."
      });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Task update failed",
        message: error.message
      });
    }
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: ({ spaceId }: { spaceId: number }) => deleteSpace(spaceId),
    onSuccess: (_data, variables) => {
      if (selectedSpaceId === variables.spaceId) {
        setSelectedSpaceId(null);
        localStorage.removeItem(SELECTED_SPACE_KEY);
      }
      setSpaceDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["activity-todos"] });
      queryClient.invalidateQueries({ queryKey: ["activity-members"] });
      queryClient.invalidateQueries({ queryKey: ["activity-invites"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      notifications.show({
        color: "teal",
        title: "Space deleted",
        message: "The space and its tasks were removed."
      });
      navigateTo("/spaces");
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Space delete failed",
      message: error.message
      });
    }
  });

  const updateAdminUserMutation = useMutation({
    mutationFn: ({
      userId,
      payload
    }: {
      userId: number;
      payload: {
        firstName?: string;
        lastName?: string;
        gender?: Gender;
        searchVisible?: boolean;
        preferredTheme?: PreferredTheme;
        isAdmin?: boolean;
      };
    }) => updateAdminUser(userId, payload),
    onSuccess: () => {
      setAdminUserEditTarget(null);
      setAdminUserRoleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "User update failed",
        message: error.message
      });
    }
  });

  const resetAdminPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      resetAdminUserPassword(userId, newPassword),
    onSuccess: () => {
      setAdminUserPasswordTarget(null);
      notifications.show({
        color: "teal",
        title: "Password reset",
        message: "User password was reset."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Password reset failed",
        message: error.message
      });
    }
  });

  const adminBulkUsersMutation = useMutation({
    mutationFn: adminBulkUsers,
    onSuccess: () => {
      setSelectedAdminUserIds([]);
      setAdminUserDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const updateAdminSpaceMutation = useMutation({
    mutationFn: ({ spaceId, name, description }: { spaceId: number; name: string; description: string }) =>
      updateAdminSpace(spaceId, { name, description }),
    onSuccess: () => {
      setAdminSpaceEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
    onError: (error: Error) => {
      notifications.show({
        color: "red",
        title: "Space update failed",
        message: error.message
      });
    }
  });

  const deleteAdminSpaceMutation = useMutation({
    mutationFn: (spaceId: number) => deleteAdminSpace(spaceId),
    onSuccess: () => {
      setAdminSpaceDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const adminBulkSpacesMutation = useMutation({
    mutationFn: adminBulkSpaces,
    onSuccess: () => {
      setSelectedAdminSpaceIds([]);
      setAdminSpaceDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const updateAdminTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      payload
    }: {
      taskId: number;
      payload: {
        title?: string;
        description?: string;
        status?: TaskStatus;
        assigneeUserId?: number | null;
      };
    }) => updateAdminTask(taskId, payload),
    onSuccess: () => {
      setAdminTaskEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const deleteAdminTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteAdminTask(taskId),
    onSuccess: () => {
      setAdminTaskDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const adminBulkTasksMutation = useMutation({
    mutationFn: adminBulkTasks,
    onSuccess: () => {
      setSelectedAdminTaskIds([]);
      setAdminTaskDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const taskDetailSpaceRole =
    spacesQuery.data?.find((space) => space.id === taskDetailQuery.data?.spaceId)?.role ??
    null;
  const taskCanWrite = taskDetailSpaceRole === "owner" || taskDetailSpaceRole === "member";
  const taskCanDelete = taskDetailSpaceRole === "owner";
  const activityStats = useMemo(() => {
    const todos = activityTodosQuery.data ?? [];
    const done = todos.filter((todo) => todo.completed === 1).length;
    return { total: todos.length, done };
  }, [activityTodosQuery.data]);
  const inviteCandidates = useMemo(() => {
    const members = new Set(
      (activityMembersQuery.data ?? []).map((member) => member.email.toLowerCase())
    );
    const pendingInvites = new Set(
      (activityInvitesQuery.data ?? [])
        .filter((invite) => invite.status === "pending")
        .map((invite) => invite.email.toLowerCase())
    );
    const myEmail = meQuery.data?.email.toLowerCase() ?? "";

    return (inviteUsersQuery.data ?? []).filter((user) => {
      const normalized = user.email.toLowerCase();
      return (
        normalized !== myEmail &&
        !members.has(normalized) &&
        !pendingInvites.has(normalized)
      );
    });
  }, [
    activityInvitesQuery.data,
    activityMembersQuery.data,
    inviteUsersQuery.data,
    meQuery.data?.email
  ]);
  const globalSpaceResults = useMemo(() => {
    if (trimmedGlobalSearch.length < 2) {
      return [];
    }

    const normalized = trimmedGlobalSearch.toLowerCase();
    return (spacesQuery.data ?? [])
      .filter((space) =>
        `${space.name} ${space.description}`.toLowerCase().includes(normalized)
      )
      .map((space) => ({
        id: space.id,
        name: space.name,
        description: space.description,
        role: space.role
      }))
      .slice(0, 8);
  }, [spacesQuery.data, trimmedGlobalSearch]);
  const stableGlobalSpaceResults = useMemo(() => {
    const key = globalSpaceResults.map((space) => space.id).join("|");
    if (key === globalSpaceSearchCacheKeyRef.current) {
      return globalSpaceSearchCacheRef.current;
    }

    globalSpaceSearchCacheKeyRef.current = key;
    globalSpaceSearchCacheRef.current = globalSpaceResults;
    return globalSpaceResults;
  }, [globalSpaceResults]);
  const globalSearchResults = useMemo(() => {
    if (trimmedGlobalSearch.length < 2) {
      return [];
    }

    const normalized = trimmedGlobalSearch.toLowerCase();
    const taskResults = (globalTaskSearchQuery.data ?? []).slice(0, 8).map((task) => {
      const score = task.title.toLowerCase().startsWith(normalized) ? 0 : 1;
      return {
        key: `task-${task.spaceId}-${task.id}`,
        type: "task" as const,
        title: task.title,
        description: task.description || "No description",
        extra: `Space: ${task.spaceName}`,
        path: `/tasks/${task.id}`,
        score,
        status: task.status
      };
    });

    const spaceResults = stableGlobalSpaceResults.map((space) => {
      const score = space.name.toLowerCase().startsWith(normalized) ? 0 : 1;
      return {
        key: `space-${space.id}`,
        type: "space" as const,
        title: space.name,
        description: space.description || "No description",
        extra: space.role === "owner" ? "Owner" : "Member",
        path: `/spaces/${slugifySpaceName(space.name)}/tasks`,
        score,
        status: null
      };
    });

    return [...taskResults, ...spaceResults]
      .sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))
      .slice(0, 12);
  }, [globalTaskSearchQuery.data, stableGlobalSpaceResults, trimmedGlobalSearch]);

  useEffect(() => {
    if (!taskDetailQuery.data) {
      return;
    }

    setTaskTitleEditMode(false);
    setTaskDescriptionEditMode(false);
    setTaskDetailTitle(taskDetailQuery.data.title);
    setTaskDetailDescription(taskDetailQuery.data.description);
    setTaskDetailStatus(taskDetailQuery.data.status);
    setTaskDetailAssignee(
      taskDetailQuery.data.assigneeUserId ? String(taskDetailQuery.data.assigneeUserId) : "unassigned"
    );
  }, [taskDetailQuery.data]);

  const logout = () => {
    clearStoredToken();
    setSessionToken(null);
    setSelectedSpaceId(null);
    setThemeInitializedUserId(null);
    setFormsInitializedUserId(null);
    queryClient.clear();
    notifications.show({
      color: "gray",
      title: "Signed out",
      message: "You can log back in anytime."
    });
    navigateTo("/");
  };

  const handleMobileDoubleTapEdit = (
    tapRef: MutableRefObject<number>,
    activate: () => void
  ) => {
    if (!isMobile || !taskCanWrite) {
      return;
    }
    const now = Date.now();
    if (now - tapRef.current < 320) {
      activate();
      tapRef.current = 0;
      return;
    }
    tapRef.current = now;
  };

  const navigateTo = (path: string) => {
    const nextUrl = new URL(path, window.location.origin);
    const nextPath = nextUrl.pathname;
    const nextSearch = nextUrl.search;

    if (window.location.pathname !== nextPath || window.location.search !== nextSearch) {
      window.history.pushState({}, "", `${nextPath}${nextSearch}`);
      setCurrentPath(nextPath);
      setCurrentSearch(nextSearch);
    }
  };

  useEffect(() => {
    if (!meQuery.error) {
      return;
    }

    clearStoredToken();
    setSessionToken(null);
    setSelectedSpaceId(null);
    setThemeInitializedUserId(null);
    setFormsInitializedUserId(null);
    queryClient.clear();
    navigateTo("/");
  }, [meQuery.error, queryClient]);

  const authCanSubmit =
    profileForm.email.includes("@") &&
    password.length >= 8 &&
    (authMode === "login" ||
      (profileForm.firstName.length >= 2 && profileForm.lastName.length >= 2));

  const genderOptions: Array<{ value: Gender; label: string }> = [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "other", label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" }
  ];
  const taskStatusOptions: Array<{ value: TaskStatus; label: string }> = [
    { value: "created", label: "Created" },
    { value: "in_progress", label: "In Progress" },
    { value: "done", label: "Done" }
  ];
  const taskStatusMeta: Record<TaskStatus, { label: string; color: string }> = {
    created: { label: "Created", color: "gray" },
    in_progress: { label: "In Progress", color: "blue" },
    done: { label: "Done", color: "teal" }
  };

  const handleThemeChoice = (value: PreferredTheme) => {
    setThemeChoice(value);
    setColorScheme(value === "system" ? "auto" : value);
    setSettingsForm((prev) => ({ ...prev, preferredTheme: value }));
  };
  const cycleThemeChoice = () => {
    const next: PreferredTheme =
      themeChoice === "light" ? "dark" : themeChoice === "dark" ? "system" : "light";
    handleThemeChoice(next);
  };

  const knownPaths = new Set([
    "/",
    "/login",
    "/register",
    "/admin",
    "/spaces",
    "/spaces/activities",
    "/tasks",
    "/account/profile",
    "/account/settings"
  ]);
  const isActivitiesPath = /^\/spaces\/(?!activities$)[^/]+(?:\/(members|tasks))?$/.test(
    currentPath
  );
  const isTaskDetailPath = /^\/tasks\/\d+$/.test(currentPath);
  const isAdmin = meQuery.data?.isAdmin === 1;

  useEffect(() => {
    if (!activitySpace) {
      return;
    }

    const canonicalSlug = slugifySpaceName(activitySpace.name);
    const canonicalPath = `/spaces/${canonicalSlug}/${activityTab}`;
    if (currentPath !== canonicalPath) {
      navigateTo(canonicalPath);
    }
  }, [activitySpace, activityTab, currentPath]);

  const totalTaskPages = Math.max(
    1,
    Math.ceil((tasksQuery.data?.total ?? 0) / (tasksQuery.data?.pageSize ?? 10))
  );
  const normalizedSpacesSearch = debouncedSpacesSearch.trim().toLowerCase();
  const filteredSpaces = useMemo(() => {
    const allSpaces = spacesQuery.data ?? [];
    if (!normalizedSpacesSearch) {
      return allSpaces;
    }

    return allSpaces.filter((space) =>
      `${space.name} ${space.description}`.toLowerCase().includes(normalizedSpacesSearch)
    );
  }, [normalizedSpacesSearch, spacesQuery.data]);
  const totalSpacePages = Math.max(1, Math.ceil(filteredSpaces.length / 10));
  const pagedSpaces = useMemo(() => {
    const offset = (spacesPage - 1) * 10;
    return filteredSpaces.slice(offset, offset + 10);
  }, [filteredSpaces, spacesPage]);
  const filteredAdminUsers = useMemo(() => {
    const items = (adminUsersQuery.data ?? []) as AdminUserRow[];
    const q = adminUsersSearch.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(q)
    );
  }, [adminUsersQuery.data, adminUsersSearch]);
  const filteredAdminSpaces = useMemo(() => {
    const items = (adminSpacesQuery.data ?? []) as AdminSpaceRow[];
    const q = adminSpacesSearch.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((space) =>
      `${space.name} ${space.description} ${space.ownerEmail}`.toLowerCase().includes(q)
    );
  }, [adminSpacesQuery.data, adminSpacesSearch]);
  const filteredAdminTasks = useMemo(() => {
    const items = (adminTasksQuery.data ?? []) as AdminTaskRow[];
    const q = adminTasksSearch.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((task) =>
      `${task.title} ${task.description} ${task.spaceName} ${task.creatorEmail}`
        .toLowerCase()
        .includes(q)
    );
  }, [adminTasksQuery.data, adminTasksSearch]);
  const totalAdminUserPages = Math.max(
    1,
    Math.ceil(filteredAdminUsers.length / ADMIN_ITEMS_PER_PAGE)
  );
  const pagedAdminUsers = useMemo(() => {
    const offset = (adminUsersPage - 1) * ADMIN_ITEMS_PER_PAGE;
    return filteredAdminUsers.slice(offset, offset + ADMIN_ITEMS_PER_PAGE);
  }, [adminUsersPage, filteredAdminUsers]);
  const totalAdminSpacePages = Math.max(
    1,
    Math.ceil(filteredAdminSpaces.length / ADMIN_ITEMS_PER_PAGE)
  );
  const pagedAdminSpaces = useMemo(() => {
    const offset = (adminSpacesPage - 1) * ADMIN_ITEMS_PER_PAGE;
    return filteredAdminSpaces.slice(offset, offset + ADMIN_ITEMS_PER_PAGE);
  }, [adminSpacesPage, filteredAdminSpaces]);
  const totalAdminTaskPages = Math.max(
    1,
    Math.ceil(filteredAdminTasks.length / ADMIN_ITEMS_PER_PAGE)
  );
  const pagedAdminTasks = useMemo(() => {
    const offset = (adminTasksPage - 1) * ADMIN_ITEMS_PER_PAGE;
    return filteredAdminTasks.slice(offset, offset + ADMIN_ITEMS_PER_PAGE);
  }, [adminTasksPage, filteredAdminTasks]);

  useEffect(() => {
    setAdminUsersPage(1);
  }, [adminUsersSearch]);

  useEffect(() => {
    setAdminSpacesPage(1);
  }, [adminSpacesSearch]);

  useEffect(() => {
    setAdminTasksPage(1);
  }, [adminTasksSearch]);

  useEffect(() => {
    if (adminUsersPage > totalAdminUserPages) {
      setAdminUsersPage(totalAdminUserPages);
    }
  }, [adminUsersPage, totalAdminUserPages]);

  useEffect(() => {
    if (adminSpacesPage > totalAdminSpacePages) {
      setAdminSpacesPage(totalAdminSpacePages);
    }
  }, [adminSpacesPage, totalAdminSpacePages]);

  useEffect(() => {
    if (adminTasksPage > totalAdminTaskPages) {
      setAdminTasksPage(totalAdminTaskPages);
    }
  }, [adminTasksPage, totalAdminTaskPages]);

  useEffect(() => {
    if (spacesPage > totalSpacePages) {
      setSpacesPage(totalSpacePages);

      if (currentPath !== "/spaces") {
        return;
      }

      const params = new URLSearchParams(currentSearch);
      if (totalSpacePages <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(totalSpacePages));
      }

      const nextSearch = params.toString();
      const normalizedNextSearch = nextSearch ? `?${nextSearch}` : "";
      window.history.replaceState({}, "", `/spaces${normalizedNextSearch}`);
      setCurrentSearch(normalizedNextSearch);
    }
  }, [spacesPage, totalSpacePages, currentPath, currentSearch]);

  useEffect(() => {
    if (currentPath !== "/spaces") {
      return;
    }

    const pageFromUrl = parsePageFromSearch(currentSearch);
    if (pageFromUrl !== spacesPage) {
      setSpacesPage(pageFromUrl);
    }
  }, [currentPath, currentSearch, spacesPage]);

  useEffect(() => {
    if (!tasksQuery.data) {
      return;
    }

    if (tasksPage > totalTaskPages) {
      setTasksPage(totalTaskPages);

      if (currentPath !== "/tasks") {
        return;
      }

      const params = new URLSearchParams(currentSearch);
      if (totalTaskPages <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(totalTaskPages));
      }

      const nextSearch = params.toString();
      const normalizedNextSearch = nextSearch ? `?${nextSearch}` : "";
      window.history.replaceState({}, "", `/tasks${normalizedNextSearch}`);
      setCurrentSearch(normalizedNextSearch);
    }
  }, [tasksPage, totalTaskPages, currentPath, currentSearch]);

  useEffect(() => {
    if (currentPath !== "/tasks") {
      return;
    }

    const pageFromUrl = parsePageFromSearch(currentSearch);
    if (pageFromUrl !== tasksPage) {
      setTasksPage(pageFromUrl);
    }
  }, [currentPath, currentSearch, tasksPage]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (currentPath === "/search") {
      navigateTo("/tasks");
    }
  }, [currentPath]);

  useEffect(() => {
    if (!meQuery.data) {
      return;
    }

    if (currentPath === "/admin" && meQuery.data.isAdmin !== 1) {
      navigateTo("/");
    }
  }, [currentPath, meQuery.data]);

  useEffect(() => {
    if (currentPath === "/login") {
      setAuthMode("login");
      return;
    }
    if (currentPath === "/register") {
      setAuthMode("register");
    }
  }, [currentPath]);

  useEffect(() => {
    if (sessionToken) {
      return;
    }

    const publicPaths = new Set(["/", "/login", "/register"]);
    if (!publicPaths.has(currentPath)) {
      navigateTo("/");
    }
  }, [currentPath, sessionToken]);

  useEffect(() => {
    if (!meQuery.data) {
      return;
    }

    if (currentPath === "/login" || currentPath === "/register") {
      navigateTo("/");
    }
  }, [currentPath, meQuery.data]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      if (!meQuery.data) {
        return;
      }
      setGlobalSearchOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [meQuery.data]);

  useEffect(() => {
    if (!globalSearchOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      globalSearchInputRef.current?.focus();
    }, 20);

    return () => window.clearTimeout(timer);
  }, [globalSearchOpen]);

  useEffect(() => {
    if (!inviteModalOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      inviteSearchInputRef.current?.focus();
    }, 20);

    return () => window.clearTimeout(timer);
  }, [inviteModalOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  return (
    <AppShell header={{ height: 74 }} padding="md" className="app-shell">
      <AppShell.Header className="app-header">
        <Container size="lg" h="100%">
          <Group
            justify="space-between"
            align="center"
            wrap="nowrap"
            h="100%"
            className="top-nav-bar"
          >
            <Group gap="xs" className="nav-links" wrap="nowrap">
              {isMobile && meQuery.data ? (
                <Burger
                  data-test-id="nav-mobile-menu-toggle"
                  opened={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  aria-label="Open navigation menu"
                />
              ) : null}
              <Button
                data-test-id="nav-home-button"
                variant="subtle"
                className={`top-nav-button ${currentPath === "/" ? "is-active" : ""}`}
                onClick={() => navigateTo("/")}
              >
                Home
              </Button>
              {meQuery.data && !isMobile ? (
                <>
                  <Button
                    data-test-id="nav-spaces-button"
                    variant="subtle"
                    className={`top-nav-button ${currentPath.startsWith("/spaces") ? "is-active" : ""}`}
                    onClick={() => navigateTo("/spaces")}
                  >
                    Spaces
                  </Button>
                  <Button
                    data-test-id="nav-tasks-button"
                    variant="subtle"
                    className={`top-nav-button ${currentPath.startsWith("/tasks") ? "is-active" : ""}`}
                    onClick={() => navigateTo("/tasks")}
                  >
                    Tasks
                  </Button>
                  {isAdmin ? (
                    <Button
                      data-test-id="nav-admin-button"
                      variant="subtle"
                      leftSection={<IconShield size={16} />}
                      className={`top-nav-button ${currentPath === "/admin" ? "is-active" : ""}`}
                      onClick={() => navigateTo("/admin")}
                    >
                      Admin
                    </Button>
                  ) : null}
                </>
              ) : null}
            </Group>

            <Group gap="xs" wrap="nowrap" className="top-nav-controls">
              {meQuery.data && !isMobile ? (
                <Button
                  data-test-id="nav-search-button"
                  variant="light"
                  className="top-nav-search-trigger"
                  onClick={() => setGlobalSearchOpen(true)}
                >
                  <Group justify="space-between" align="center" wrap="nowrap" w="100%">
                    <Group gap="sm" align="center" wrap="nowrap">
                      <IconSearch size={20} className="top-nav-search-icon" />
                      <Text className="top-nav-search-placeholder">Search</Text>
                    </Group>
                    <Text span className="top-nav-search-shortcut">
                      {window.navigator.platform.includes("Mac") ? "⌘ K" : "Ctrl + K"}
                    </Text>
                  </Group>
                </Button>
              ) : null}
              {meQuery.data && isMobile ? (
                <ActionIcon
                  data-test-id="nav-search-icon-button"
                  variant="light"
                  size={36}
                  radius="md"
                  title="Search"
                  aria-label="Open search"
                  onClick={() => setGlobalSearchOpen(true)}
                >
                  <IconSearch size={18} />
                </ActionIcon>
              ) : null}
              <Button
                data-test-id="nav-theme-toggle"
                variant="light"
                className="top-nav-theme-toggle"
                title={`Theme: ${
                  themeChoice === "light" ? "Light" : themeChoice === "dark" ? "Dark" : "Auto"
                }`}
                onClick={cycleThemeChoice}
              >
                {
                  themeChoice === "light" ? (
                    <IconSun size={14} />
                  ) : themeChoice === "dark" ? (
                    <IconMoon size={14} />
                  ) : (
                    <IconSun size={14} />
                  )
                }
              </Button>

              {meQuery.data ? (
                <Menu shadow="md" width={220} position="bottom-end">
                  <Menu.Target>
                    {isMobile ? (
                      <ActionIcon
                        data-test-id="nav-account-menu-button"
                        variant="light"
                        size={36}
                        radius="md"
                        title="Account menu"
                        aria-label="Open account menu"
                      >
                        {meQuery.data.avatarUrl ? (
                          <Avatar src={meQuery.data.avatarUrl} size={24} radius="xl" />
                        ) : (
                          <IconUserCircle size={20} />
                        )}
                      </ActionIcon>
                    ) : (
                      <Button
                        data-test-id="nav-account-menu-button"
                        variant="light"
                        className="top-nav-user-button"
                        rightSection={<IconChevronDown size={14} />}
                        leftSection={
                          <Avatar src={meQuery.data.avatarUrl || null} size="sm" radius="xl">
                            {`${meQuery.data.firstName[0] || ""}${meQuery.data.lastName[0] || ""}`}
                          </Avatar>
                        }
                      >
                        {meQuery.data.firstName}
                      </Button>
                    )}
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>{meQuery.data.email}</Menu.Label>
                    <Menu.Item
                      data-test-id="menu-edit-profile"
                      leftSection={<IconSettings size={14} />}
                      onClick={() => navigateTo("/account/profile")}
                    >
                      Edit profile
                    </Menu.Item>
                    <Menu.Item
                      data-test-id="menu-account-settings"
                      leftSection={<IconSettings size={14} />}
                      onClick={() => navigateTo("/account/settings")}
                    >
                      Account settings
                    </Menu.Item>
                    <Menu.Item
                      data-test-id="menu-logout"
                      leftSection={<IconLogout size={14} />}
                      color="red"
                      onClick={logout}
                    >
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Group gap="xs">
                  <Button data-test-id="nav-login-button" variant="light" onClick={() => navigateTo("/login")}>
                    Login
                  </Button>
                </Group>
              )}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <Drawer
        opened={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Navigation"
        position="left"
        size="86%"
        closeButtonProps={{
          "data-test-id": "drawer-close-button",
          "aria-label": "Close navigation"
        }}
      >
        <Stack gap="xs">
          <Button
            data-test-id="drawer-home-button"
            variant={currentPath === "/" ? "filled" : "light"}
            onClick={() => navigateTo("/")}
            fullWidth
          >
            Home
          </Button>
          {meQuery.data ? (
            <>
              <Button
                data-test-id="drawer-spaces-button"
                variant={currentPath.startsWith("/spaces") ? "filled" : "light"}
                onClick={() => navigateTo("/spaces")}
                fullWidth
              >
                Spaces
              </Button>
              <Button
                data-test-id="drawer-tasks-button"
                variant={currentPath.startsWith("/tasks") ? "filled" : "light"}
                onClick={() => navigateTo("/tasks")}
                fullWidth
              >
                Tasks
              </Button>
              {isAdmin ? (
                <Button
                  data-test-id="drawer-admin-button"
                  variant={currentPath === "/admin" ? "filled" : "light"}
                  leftSection={<IconShield size={16} />}
                  onClick={() => navigateTo("/admin")}
                  fullWidth
                >
                  Admin
                </Button>
              ) : null}
              <Divider my="xs" />
              <Button
                data-test-id="drawer-edit-profile-button"
                variant="light"
                onClick={() => navigateTo("/account/profile")}
                fullWidth
              >
                Edit profile
              </Button>
              <Button
                data-test-id="drawer-account-settings-button"
                variant="light"
                onClick={() => navigateTo("/account/settings")}
                fullWidth
              >
                Account settings
              </Button>
              <Button
                data-test-id="drawer-logout-button"
                color="red"
                variant="light"
                leftSection={<IconLogout size={16} />}
                onClick={logout}
                fullWidth
              >
                Logout
              </Button>
            </>
          ) : (
            <Button data-test-id="drawer-login-button" variant="light" onClick={() => navigateTo("/login")} fullWidth>
              Login
            </Button>
          )}
        </Stack>
      </Drawer>
      <AppShell.Main>
        <Container size="lg" py="lg" className="page-container">
          <Stack gap="md" className="page-content">
            {!sessionToken && currentPath === "/" ? (
              <Card radius="lg" shadow="sm" withBorder className="surface-card">
                <Stack gap="md">
                  <Title order={2} c="var(--app-title)">
                    Plan smarter. Execute together.
                  </Title>
                  <Text c="var(--app-subtitle)">
                    Create shared spaces, assign meaningful work, and keep progress visible
                    across your team. From startup hustle to enterprise delivery, Todo Flow
                    helps you move faster with less chaos.
                  </Text>
                  <Group align="stretch" grow className="auth-cards-grid">
                    <Card
                      withBorder
                      className="surface-card auth-option-card cta-primary"
                      onClick={() => navigateTo("/register")}
                    >
                      <Stack gap={6}>
                        <Title order={4}>
                          <Text span c="cyan.6">
                            Join
                          </Text>{" "}
                          and get your team in flow
                        </Title>
                        <Stack gap={2}>
                          <Text size="sm" c="var(--app-subtitle)">
                            • Create tasks
                          </Text>
                          <Text size="sm" c="var(--app-subtitle)">
                            • Create spaces
                          </Text>
                          <Text size="sm" c="var(--app-subtitle)">
                            • Share tasks
                          </Text>
                          <Text size="sm" c="var(--app-subtitle)">
                            • Work together in one place
                          </Text>
                        </Stack>
                      </Stack>
                    </Card>
                    <Card
                      withBorder
                      className="surface-card auth-option-card cta-secondary"
                      onClick={() => navigateTo("/login")}
                    >
                      <Stack gap={6}>
                        <Title order={4}>Already have an account?</Title>
                        <Text size="sm" c="var(--app-subtitle)">
                          Login
                        </Text>
                      </Stack>
                    </Card>
                  </Group>
                </Stack>
              </Card>
            ) : null}

            {!sessionToken && (currentPath === "/login" || currentPath === "/register") ? (
              <Card radius="lg" shadow="sm" withBorder className="surface-card">
                <Stack gap="sm">
                  <Title order={3} c="var(--app-title)">
                    {authMode === "register" ? "Create account" : "Sign in"}
                  </Title>
                  <Group gap="xs">
                    <Button
                      variant={authMode === "login" ? "filled" : "light"}
                      onClick={() => navigateTo("/login")}
                    >
                      Login
                    </Button>
                    <Button
                      data-test-id="hero-register-button"
                      variant={authMode === "register" ? "filled" : "light"}
                      leftSection={<IconUserPlus size={16} />}
                      onClick={() => navigateTo("/register")}
                    >
                      Register
                    </Button>
                  </Group>

                  {authMode === "register" ? (
                    <Group grow>
                      <TextInput
                        data-test-id="auth-first-name-input"
                        label="First Name"
                        value={profileForm.firstName}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setProfileForm((prev) => ({
                            ...prev,
                            firstName: value
                          }));
                        }}
                        className="todo-input"
                      />
                      <TextInput
                        data-test-id="auth-last-name-input"
                        label="Last Name"
                        value={profileForm.lastName}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setProfileForm((prev) => ({
                            ...prev,
                            lastName: value
                          }));
                        }}
                        className="todo-input"
                      />
                    </Group>
                  ) : null}

                  <TextInput
                    data-test-id="auth-email-input"
                    label="Email"
                    placeholder="you@example.com"
                    value={profileForm.email}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setProfileForm((prev) => ({
                        ...prev,
                        email: value
                      }));
                    }}
                    className="todo-input"
                  />

                  {authMode === "register" ? (
                    <Select
                      data-test-id="auth-gender-select"
                      label="Gender"
                      className="todo-input"
                      data={genderOptions}
                      value={profileForm.gender}
                      onChange={(value) => {
                        if (!value) {
                          return;
                        }
                        setProfileForm((prev) => ({ ...prev, gender: value as Gender }));
                      }}
                    />
                  ) : null}

                  <PasswordInput
                    data-test-id="auth-password-input"
                    label="Password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    className="todo-input"
                  />
                  <Button
                    data-test-id="auth-submit-button"
                    className="add-button"
                    loading={authMutation.isPending}
                    disabled={!authCanSubmit}
                    onClick={() =>
                      authMutation.mutate({
                        mode: authMode,
                        profile: profileForm,
                        passwordValue: password
                      })
                    }
                  >
                    {authMode === "register" ? "Create account" : "Sign in"}
                  </Button>
                </Stack>
              </Card>
            ) : null}

            {sessionToken && !meQuery.data ? (
              <Group justify="center" py="xl">
                <Loader />
              </Group>
            ) : null}

            {meQuery.data && currentPath === "/" ? (
              <Stack gap="md">
                <Card withBorder className="surface-card">
                  <Stack gap="sm">
                    <Title order={2} c="var(--app-title)">
                      Your overview
                    </Title>
                    <Group gap="xs">
                      <Badge variant="filled" className="stats-badge">
                        {(invitesQuery.data ?? []).length} invites
                      </Badge>
                      <Badge variant="filled" className="stats-badge">
                        {(spacesQuery.data ?? []).length} spaces
                      </Badge>
                      <Badge variant="filled" className="stats-badge">
                        {homeTasksQuery.data?.total ?? 0} tasks
                      </Badge>
                    </Group>
                  </Stack>
                </Card>

                <Card withBorder className="surface-card">
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Title order={4}>Invitations</Title>
                    </Group>
                    {invitesQuery.isLoading ? (
                      <Loader size="sm" />
                    ) : (invitesQuery.data ?? []).length === 0 ? (
                      <Text c="var(--app-subtitle)">No pending invitations.</Text>
                    ) : (
                      (invitesQuery.data ?? []).map((invite) => (
                        <Card key={invite.id} withBorder className="surface-card">
                          <Group justify="space-between" align="center">
                            <Box>
                              <Text fw={600} c="var(--app-text)">
                                {invite.spaceName}
                              </Text>
                              <Text size="sm" c="var(--app-subtitle)">
                                Invited by {invite.invitedByEmail}
                              </Text>
                            </Box>
                            <Button
                              data-test-id="invitation-accept-button"
                              size="xs"
                              loading={acceptInviteMutation.isPending}
                              onClick={() => acceptInviteMutation.mutate(invite.id)}
                            >
                              Accept
                            </Button>
                          </Group>
                        </Card>
                      ))
                    )}
                  </Stack>
                </Card>

                <Card withBorder className="surface-card">
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Title order={4}>Spaces</Title>
                      <Button variant="light" size="xs" onClick={() => navigateTo("/spaces")}>
                        View all
                      </Button>
                    </Group>
                    {spacesQuery.isLoading ? (
                      <Loader size="sm" />
                    ) : (spacesQuery.data ?? []).length === 0 ? (
                      <Text c="var(--app-subtitle)">No spaces yet.</Text>
                    ) : (
                      (spacesQuery.data ?? []).slice(0, 6).map((space) => (
                        <Card
                          key={space.id}
                          withBorder
                          className="surface-card task-clickable-card"
                          tabIndex={0}
                          onClick={() =>
                            navigateTo(`/spaces/${slugifySpaceName(space.name)}/tasks`)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigateTo(`/spaces/${slugifySpaceName(space.name)}/tasks`);
                            }
                          }}
                        >
                          <Group justify="space-between" align="center">
                            <Box>
                              <Text fw={600} c="var(--app-text)">
                                {space.name}
                              </Text>
                              <Text size="sm" c="var(--app-subtitle)">
                                {space.description || "No description"}
                              </Text>
                            </Box>
                            <Badge
                              variant="light"
                              color={space.role === "owner" ? "teal" : "gray"}
                            >
                              {space.role === "owner" ? "Owner" : "Member"}
                            </Badge>
                          </Group>
                        </Card>
                      ))
                    )}
                  </Stack>
                </Card>

                <Card withBorder className="surface-card">
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Title order={4}>Tasks</Title>
                      <Button variant="light" size="xs" onClick={() => navigateTo("/tasks")}>
                        View all
                      </Button>
                    </Group>
                    {homeTasksQuery.isLoading ? (
                      <Loader size="sm" />
                    ) : (homeTasksQuery.data?.items ?? []).length === 0 ? (
                      <Text c="var(--app-subtitle)">No tasks yet.</Text>
                    ) : (
                      (homeTasksQuery.data?.items ?? []).map((item) => (
                        <Card
                          key={`${item.spaceId}-${item.id}`}
                          withBorder
                          className="surface-card task-clickable-card"
                          onClick={() => navigateTo(`/tasks/${item.id}`)}
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigateTo(`/tasks/${item.id}`);
                            }
                          }}
                        >
                          <Group justify="space-between" align="center">
                            <Box>
                              <Text fw={600} c="var(--app-text)">
                                {item.title}
                              </Text>
                              <Text size="sm" c="var(--app-subtitle)">
                                {item.description || "No description"}
                              </Text>
                              <Tooltip label={`Space: ${item.spaceName}`} openDelay={200}>
                                <Badge mt={6} variant="light" color="indigo">
                                  {truncateText(item.spaceName, 24)}
                                </Badge>
                              </Tooltip>
                            </Box>
                            <Badge variant="light" color={taskStatusMeta[item.status].color}>
                              {taskStatusMeta[item.status].label}
                            </Badge>
                          </Group>
                        </Card>
                      ))
                    )}
                  </Stack>
                </Card>
              </Stack>
            ) : null}

            {meQuery.data && currentPath === "/admin" ? (
              isAdmin ? (
                <Stack gap="md">
                  <Card withBorder className="surface-card">
                    <Stack gap="sm">
                      <Title order={3}>Admin Dashboard</Title>
                      <Group gap="xs" wrap="wrap">
                        <Badge variant="filled" className="stats-badge">
                          {adminOverviewQuery.data?.users ?? 0} users
                        </Badge>
                        <Badge variant="filled" className="stats-badge">
                          {adminOverviewQuery.data?.spaces ?? 0} spaces
                        </Badge>
                        <Badge variant="filled" className="stats-badge">
                          {adminOverviewQuery.data?.tasks ?? 0} tasks
                        </Badge>
                      </Group>
                    </Stack>
                  </Card>

                  <Card withBorder className="surface-card">
                    <Tabs value={adminTab} onChange={(value) => setAdminTab((value as typeof adminTab) || "users")}>
                      <Tabs.List>
                        <Tabs.Tab value="users">Users</Tabs.Tab>
                        <Tabs.Tab value="spaces">Spaces</Tabs.Tab>
                        <Tabs.Tab value="tasks">Tasks</Tabs.Tab>
                      </Tabs.List>

                      <Tabs.Panel value="users" pt="md">
                        <Stack gap="sm">
                          <TextInput
                            className="todo-input"
                            placeholder="Search users..."
                            leftSection={<IconSearch size={16} />}
                            value={adminUsersSearch}
                            onChange={(event) => setAdminUsersSearch(event.currentTarget.value)}
                          />
                          <Table.ScrollContainer minWidth={760}>
                            <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>
                                  <Checkbox
                                    checked={
                                      pagedAdminUsers.length > 0 &&
                                      pagedAdminUsers.every((user) =>
                                        selectedAdminUserIds.includes(user.id)
                                      )
                                    }
                                    onChange={(event) => {
                                      if (event.currentTarget.checked) {
                                        setSelectedAdminUserIds(
                                          Array.from(
                                            new Set([
                                              ...selectedAdminUserIds,
                                              ...pagedAdminUsers.map((user) => user.id)
                                            ])
                                          )
                                        );
                                        return;
                                      }
                                      setSelectedAdminUserIds((prev) =>
                                        prev.filter(
                                          (id) => !pagedAdminUsers.some((user) => user.id === id)
                                        )
                                      );
                                    }}
                                  />
                                </Table.Th>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Email</Table.Th>
                                <Table.Th>Admin</Table.Th>
                                <Table.Th ta="center">Actions</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {pagedAdminUsers.map((user) => (
                                <Table.Tr key={user.id}>
                                  <Table.Td ta="center">
                                    <Checkbox
                                      checked={selectedAdminUserIds.includes(user.id)}
                                      onChange={(event) => {
                                        setSelectedAdminUserIds((prev) =>
                                          event.currentTarget.checked
                                            ? [...prev, user.id]
                                            : prev.filter((id) => id !== user.id)
                                        );
                                      }}
                                    />
                                  </Table.Td>
                                  <Table.Td>{`${user.firstName} ${user.lastName}`.trim()}</Table.Td>
                                  <Table.Td>{user.email}</Table.Td>
                                  <Table.Td>
                                    <Badge variant="light" color={user.isAdmin ? "teal" : "gray"}>
                                      {user.isAdmin ? "yes" : "no"}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>
                                    <Group gap={4} wrap="nowrap" justify="center">
                                      <Tooltip label="Edit user" openDelay={150}>
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color="cyan"
                                          aria-label="Edit user"
                                          loading={updateAdminUserMutation.isPending}
                                          onClick={() =>
                                            setAdminUserEditTarget({
                                              userId: user.id,
                                              email: user.email,
                                              firstName: user.firstName,
                                              lastName: user.lastName
                                            })
                                          }
                                        >
                                          <IconPencil size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip
                                        label={user.isAdmin ? "Unset admin" : "Set admin"}
                                        openDelay={150}
                                      >
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color={user.isAdmin ? "orange" : "cyan"}
                                          aria-label={user.isAdmin ? "Unset admin" : "Set admin"}
                                          loading={updateAdminUserMutation.isPending}
                                          onClick={() =>
                                            setAdminUserRoleTarget({
                                              userId: user.id,
                                              label:
                                                `${user.firstName} ${user.lastName}`.trim() ||
                                                user.email,
                                              nextIsAdmin: user.isAdmin !== 1
                                            })
                                          }
                                        >
                                          {user.isAdmin ? (
                                            <IconShieldX size={15} />
                                          ) : (
                                            <IconShieldCheck size={15} />
                                          )}
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Reset password" openDelay={150}>
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color="yellow"
                                          aria-label="Reset password"
                                          loading={resetAdminPasswordMutation.isPending}
                                          onClick={() =>
                                            setAdminUserPasswordTarget({
                                              userId: user.id,
                                              label:
                                                `${user.firstName} ${user.lastName}`.trim() ||
                                                user.email,
                                              password: adminResetPasswordByUserId[user.id] ?? ""
                                            })
                                          }
                                        >
                                          <IconKey size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Delete user" openDelay={150}>
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color="red"
                                          aria-label="Delete user"
                                          loading={adminBulkUsersMutation.isPending}
                                          onClick={() =>
                                            setAdminUserDeleteTarget({
                                              userIds: [user.id],
                                              label:
                                                `${user.firstName} ${user.lastName}`.trim() ||
                                                user.email
                                            })
                                          }
                                        >
                                          <IconTrash size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                            </Table>
                          </Table.ScrollContainer>
                          {selectedAdminUserIds.length > 0 ? (
                            <Group justify="space-between" align="center">
                              <Text size="sm" c="var(--app-subtitle)">
                                {selectedAdminUserIds.length} selected
                              </Text>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                loading={adminBulkUsersMutation.isPending}
                                onClick={() =>
                                  setAdminUserDeleteTarget({
                                    userIds: selectedAdminUserIds,
                                    label:
                                      selectedAdminUserIds.length === 1
                                        ? "this user"
                                        : `${selectedAdminUserIds.length} users`
                                  })
                                }
                              >
                                Delete selected
                              </Button>
                            </Group>
                          ) : null}
                          {filteredAdminUsers.length === 0 ? (
                            <Text size="sm" c="var(--app-subtitle)">
                              No matching users found.
                            </Text>
                          ) : null}
                          {filteredAdminUsers.length > ADMIN_ITEMS_PER_PAGE ? (
                            <Group justify="center">
                              <Pagination
                                value={adminUsersPage}
                                onChange={setAdminUsersPage}
                                total={totalAdminUserPages}
                              />
                            </Group>
                          ) : null}
                        </Stack>
                      </Tabs.Panel>

                      <Tabs.Panel value="spaces" pt="md">
                        <Stack gap="sm">
                          <TextInput
                            className="todo-input"
                            placeholder="Search spaces..."
                            leftSection={<IconSearch size={16} />}
                            value={adminSpacesSearch}
                            onChange={(event) => setAdminSpacesSearch(event.currentTarget.value)}
                          />
                          <Table.ScrollContainer minWidth={720}>
                            <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>
                                  <Checkbox
                                    checked={
                                      pagedAdminSpaces.length > 0 &&
                                      pagedAdminSpaces.every((space) =>
                                        selectedAdminSpaceIds.includes(space.id)
                                      )
                                    }
                                    onChange={(event) => {
                                      if (event.currentTarget.checked) {
                                        setSelectedAdminSpaceIds(
                                          Array.from(
                                            new Set([
                                              ...selectedAdminSpaceIds,
                                              ...pagedAdminSpaces.map((space) => space.id)
                                            ])
                                          )
                                        );
                                        return;
                                      }
                                      setSelectedAdminSpaceIds((prev) =>
                                        prev.filter(
                                          (id) => !pagedAdminSpaces.some((space) => space.id === id)
                                        )
                                      );
                                    }}
                                  />
                                </Table.Th>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Owner</Table.Th>
                                <Table.Th>Tasks</Table.Th>
                                <Table.Th ta="center">Actions</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {pagedAdminSpaces.map((space) => (
                                <Table.Tr key={space.id}>
                                  <Table.Td ta="center">
                                    <Checkbox
                                      checked={selectedAdminSpaceIds.includes(space.id)}
                                      onChange={(event) => {
                                        setSelectedAdminSpaceIds((prev) =>
                                          event.currentTarget.checked
                                            ? [...prev, space.id]
                                            : prev.filter((id) => id !== space.id)
                                        );
                                      }}
                                    />
                                  </Table.Td>
                                  <Table.Td>{space.name}</Table.Td>
                                  <Table.Td>{space.ownerEmail}</Table.Td>
                                  <Table.Td>{space.totalTaskCount}</Table.Td>
                                  <Table.Td>
                                    <Group gap={4} wrap="nowrap" justify="center">
                                      <Tooltip label="Edit space" openDelay={150}>
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color="cyan"
                                          aria-label="Edit space"
                                          loading={updateAdminSpaceMutation.isPending}
                                          onClick={() =>
                                            setAdminSpaceEditTarget({
                                              spaceId: space.id,
                                              name: space.name,
                                              description: space.description
                                            })
                                          }
                                        >
                                          <IconPencil size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Delete space" openDelay={150}>
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color="red"
                                          aria-label="Delete space"
                                          loading={deleteAdminSpaceMutation.isPending}
                                          onClick={() =>
                                            setAdminSpaceDeleteTarget({
                                              spaceIds: [space.id],
                                              label: space.name
                                            })
                                          }
                                        >
                                          <IconTrash size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                            </Table>
                          </Table.ScrollContainer>
                          {selectedAdminSpaceIds.length > 0 ? (
                            <Group justify="space-between" align="center">
                              <Text size="sm" c="var(--app-subtitle)">
                                {selectedAdminSpaceIds.length} selected
                              </Text>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                loading={adminBulkSpacesMutation.isPending}
                                onClick={() =>
                                  setAdminSpaceDeleteTarget({
                                    spaceIds: selectedAdminSpaceIds,
                                    label:
                                      selectedAdminSpaceIds.length === 1
                                        ? "this space"
                                        : `${selectedAdminSpaceIds.length} spaces`
                                  })
                                }
                              >
                                Delete selected
                              </Button>
                            </Group>
                          ) : null}
                          {filteredAdminSpaces.length === 0 ? (
                            <Text size="sm" c="var(--app-subtitle)">
                              No matching spaces found.
                            </Text>
                          ) : null}
                          {filteredAdminSpaces.length > ADMIN_ITEMS_PER_PAGE ? (
                            <Group justify="center">
                              <Pagination
                                value={adminSpacesPage}
                                onChange={setAdminSpacesPage}
                                total={totalAdminSpacePages}
                              />
                            </Group>
                          ) : null}
                        </Stack>
                      </Tabs.Panel>

                      <Tabs.Panel value="tasks" pt="md">
                        <Stack gap="sm">
                          <Group justify="space-between" align="center">
                            <TextInput
                              className="todo-input"
                              placeholder="Search tasks..."
                              leftSection={<IconSearch size={16} />}
                              value={adminTasksSearch}
                              onChange={(event) => setAdminTasksSearch(event.currentTarget.value)}
                              style={{ flex: 1 }}
                            />
                          </Group>
                          <Table.ScrollContainer minWidth={780}>
                            <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>
                                  <Checkbox
                                    checked={
                                      pagedAdminTasks.length > 0 &&
                                      pagedAdminTasks.every((task) =>
                                        selectedAdminTaskIds.includes(task.id)
                                      )
                                    }
                                    onChange={(event) => {
                                      if (event.currentTarget.checked) {
                                        setSelectedAdminTaskIds(
                                          Array.from(
                                            new Set([
                                              ...selectedAdminTaskIds,
                                              ...pagedAdminTasks.map((task) => task.id)
                                            ])
                                          )
                                        );
                                        return;
                                      }
                                      setSelectedAdminTaskIds((prev) =>
                                        prev.filter(
                                          (id) => !pagedAdminTasks.some((task) => task.id === id)
                                        )
                                      );
                                    }}
                                  />
                                </Table.Th>
                                <Table.Th>Title</Table.Th>
                                <Table.Th>Space</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th ta="center">Actions</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {pagedAdminTasks.map((task) => (
                                <Table.Tr key={task.id}>
                                  <Table.Td ta="center">
                                    <Checkbox
                                      checked={selectedAdminTaskIds.includes(task.id)}
                                      onChange={(event) => {
                                        setSelectedAdminTaskIds((prev) =>
                                          event.currentTarget.checked
                                            ? [...prev, task.id]
                                            : prev.filter((id) => id !== task.id)
                                        );
                                      }}
                                    />
                                  </Table.Td>
                                  <Table.Td>{task.title}</Table.Td>
                                  <Table.Td>{task.spaceName}</Table.Td>
                                  <Table.Td>
                                    <Badge variant="light" color={taskStatusMeta[task.status].color}>
                                      {taskStatusMeta[task.status].label}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>
                                    <Group gap={4} wrap="nowrap" justify="center">
                                      <Tooltip label="Edit task" openDelay={150}>
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color="cyan"
                                          aria-label="Edit task"
                                          loading={updateAdminTaskMutation.isPending}
                                          onClick={() =>
                                            setAdminTaskEditTarget({
                                              taskId: task.id,
                                              title: task.title,
                                              description: task.description,
                                              status: task.status
                                            })
                                          }
                                        >
                                          <IconPencil size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Delete task" openDelay={150}>
                                        <ActionIcon
                                          size="sm"
                                          variant="subtle"
                                          color="red"
                                          aria-label="Delete task"
                                          loading={deleteAdminTaskMutation.isPending}
                                          onClick={() =>
                                            setAdminTaskDeleteTarget({
                                              taskIds: [task.id],
                                              label: task.title
                                            })
                                          }
                                        >
                                          <IconTrash size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                            </Table>
                          </Table.ScrollContainer>
                          {selectedAdminTaskIds.length > 0 ? (
                            <Group justify="space-between" align="center">
                              <Text size="sm" c="var(--app-subtitle)">
                                {selectedAdminTaskIds.length} selected
                              </Text>
                              <Group gap="xs">
                                <Select
                                  size="xs"
                                  value={adminBulkTaskStatus}
                                  onChange={(value) =>
                                    value && setAdminBulkTaskStatus(value as TaskStatus)
                                  }
                                  data={taskStatusOptions}
                                />
                                <Button
                                  size="xs"
                                  variant="light"
                                  loading={adminBulkTasksMutation.isPending}
                                  onClick={() =>
                                    adminBulkTasksMutation.mutate({
                                      action: "set-status",
                                      taskIds: selectedAdminTaskIds,
                                      status: adminBulkTaskStatus
                                    })
                                  }
                                >
                                  Set status
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  variant="light"
                                  loading={adminBulkTasksMutation.isPending}
                                  onClick={() =>
                                    setAdminTaskDeleteTarget({
                                      taskIds: selectedAdminTaskIds,
                                      label:
                                        selectedAdminTaskIds.length === 1
                                          ? "this task"
                                          : `${selectedAdminTaskIds.length} tasks`
                                    })
                                  }
                                >
                                  Delete selected
                                </Button>
                              </Group>
                            </Group>
                          ) : null}
                          {filteredAdminTasks.length === 0 ? (
                            <Text size="sm" c="var(--app-subtitle)">
                              No matching tasks found.
                            </Text>
                          ) : null}
                          {filteredAdminTasks.length > ADMIN_ITEMS_PER_PAGE ? (
                            <Group justify="center">
                              <Pagination
                                value={adminTasksPage}
                                onChange={setAdminTasksPage}
                                total={totalAdminTaskPages}
                              />
                            </Group>
                          ) : null}
                        </Stack>
                      </Tabs.Panel>
                    </Tabs>
                  </Card>
                </Stack>
              ) : (
                <Card withBorder className="surface-card">
                  <Text c="var(--app-subtitle)">Admin access required.</Text>
                </Card>
              )
            ) : null}

            {meQuery.data && currentPath === "/account/profile" ? (
              <Card withBorder className="surface-card">
                <Stack gap="sm">
                  <Title order={3}>Profile</Title>
                  <Group grow>
                    <TextInput
                      label="First Name"
                      value={profileForm.firstName}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setProfileForm((prev) => ({
                          ...prev,
                          firstName: value
                        }));
                      }}
                      className="todo-input"
                    />
                    <TextInput
                      label="Last Name"
                      value={profileForm.lastName}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setProfileForm((prev) => ({
                          ...prev,
                          lastName: value
                        }));
                      }}
                      className="todo-input"
                    />
                  </Group>
                  <Group grow>
                    <TextInput
                      label="Email"
                      value={profileForm.email}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setProfileForm((prev) => ({
                          ...prev,
                          email: value
                        }));
                      }}
                      className="todo-input"
                    />
                    <Select
                      label="Gender"
                      className="todo-input"
                      data={genderOptions}
                      value={profileForm.gender}
                      onChange={(value) => {
                        if (!value) {
                          return;
                        }
                        setProfileForm((prev) => ({ ...prev, gender: value as Gender }));
                      }}
                    />
                  </Group>
                  <Button
                    className="add-button"
                    loading={updateProfileMutation.isPending}
                    onClick={() => updateProfileMutation.mutate(profileForm)}
                  >
                    Save profile
                  </Button>
                </Stack>
              </Card>
            ) : null}

            {meQuery.data && currentPath === "/account/settings" ? (
              <Stack gap="md">
                <Card withBorder className="surface-card">
                  <Stack gap="sm">
                    <Title order={3}>Account Settings</Title>
                    <TextInput
                      label="Avatar URL"
                      placeholder="https://..."
                      value={settingsForm.avatarUrl}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setSettingsForm((prev) => ({
                          ...prev,
                          avatarUrl: value
                        }));
                      }}
                      className="todo-input"
                    />
                    <Checkbox
                      checked={settingsForm.searchVisible}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSettingsForm((prev) => ({
                          ...prev,
                          searchVisible: checked
                        }));
                      }}
                      label="Visible in search / people lookup"
                    />
                    <Select
                      label="Preferred Theme"
                      className="todo-input"
                      data={[
                        { value: "light", label: "Light" },
                        { value: "dark", label: "Dark" },
                        { value: "system", label: "System" }
                      ]}
                      value={settingsForm.preferredTheme}
                      onChange={(value) => {
                        if (!value) {
                          return;
                        }
                        const theme = value as PreferredTheme;
                        setSettingsForm((prev) => ({ ...prev, preferredTheme: theme }));
                        handleThemeChoice(theme);
                      }}
                    />
                    <Button
                      className="add-button"
                      loading={updateSettingsMutation.isPending}
                      onClick={() => updateSettingsMutation.mutate(settingsForm)}
                    >
                      Save settings
                    </Button>
                  </Stack>
                </Card>

                <Card withBorder className="surface-card">
                  <Stack gap="sm">
                    <Title order={4}>Change Password</Title>
                    <PasswordInput
                      label="Current password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.currentTarget.value)}
                      className="todo-input"
                    />
                    <PasswordInput
                      label="New password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.currentTarget.value)}
                      className="todo-input"
                    />
                    <Button
                      loading={changePasswordMutation.isPending}
                      disabled={currentPassword.length < 1 || newPassword.length < 8}
                      onClick={() =>
                        changePasswordMutation.mutate({
                          currentPwd: currentPassword,
                          newPwd: newPassword
                        })
                      }
                    >
                      Update password
                    </Button>
                  </Stack>
                </Card>
              </Stack>
            ) : null}

            {meQuery.data && currentPath === "/spaces" ? (
              <Stack gap="md">
                <Card radius="lg" withBorder className="surface-card spaces-subnav-panel">
                  <Stack gap="sm">
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <TextInput
                        data-test-id="spaces-search-input"
                        className="todo-input"
                        placeholder="Search spaces by name or description"
                        leftSection={<IconSearch size={16} />}
                        value={spacesSearch}
                        onChange={(event) => setSpacesSearch(event.currentTarget.value)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        data-test-id="spaces-create-button"
                        className="add-button"
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setSpaceModalOpen(true)}
                      >
                        New Space
                      </Button>
                    </Group>

                  </Stack>
                </Card>

                <Card radius="lg" withBorder className="surface-card">
                  <Stack gap="xs">
                      {(spacesQuery.data ?? []).length === 0 ? (
                        <Text c="var(--app-subtitle)">
                          No spaces yet. Create one to get started.
                        </Text>
                      ) : filteredSpaces.length === 0 ? (
                        <Text c="var(--app-subtitle)">
                          No spaces match your search.
                        </Text>
                      ) : (
                        pagedSpaces.map((space) => (
                          <Card
                            key={space.id}
                            withBorder
                            className="surface-card task-clickable-card"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedSpaceId(space.id);
                              localStorage.setItem(
                                SELECTED_SPACE_KEY,
                                String(space.id)
                              );
                              navigateTo(
                                `/spaces/${slugifySpaceName(space.name)}/tasks`
                              );
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedSpaceId(space.id);
                                localStorage.setItem(
                                  SELECTED_SPACE_KEY,
                                  String(space.id)
                                );
                                navigateTo(
                                  `/spaces/${slugifySpaceName(space.name)}/tasks`
                                );
                              }
                            }}
                          >
                            <Stack gap="xs">
                              <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <Box>
                                  <Text fw={700}>{space.name}</Text>
                                  <Text size="sm" c="var(--app-subtitle)">
                                    {space.description || "No description"}
                                  </Text>
                                </Box>
                                <Badge
                                  variant="light"
                                  color={space.role === "owner" ? "teal" : "gray"}
                                >
                                  {space.role === "owner" ? "Owner" : "Member"}
                                </Badge>
                              </Group>
                              <Group gap="xs" wrap="wrap">
                                <Badge variant="light">{space.memberCount} members</Badge>
                                <Badge
                                  variant="light"
                                  color="teal"
                                  leftSection={<IconCheck size={12} />}
                                >
                                  {space.doneTaskCount}/{space.totalTaskCount} done
                                </Badge>
                              </Group>
                            </Stack>
                          </Card>
                        ))
                      )}
                  </Stack>
                </Card>
                {filteredSpaces.length > 10 ? (
                  <Group justify="center">
                    <Pagination
                      value={spacesPage}
                      onChange={(nextPage) => {
                        setSpacesPage(nextPage);
                        const params = new URLSearchParams(currentSearch);
                        if (nextPage <= 1) {
                          params.delete("page");
                        } else {
                          params.set("page", String(nextPage));
                        }

                        const nextSearch = params.toString();
                        navigateTo(`/spaces${nextSearch ? `?${nextSearch}` : ""}`);
                      }}
                      total={totalSpacePages}
                    />
                  </Group>
                ) : null}
                {invitesQuery.data && invitesQuery.data.length > 0 ? (
                  <Card radius="lg" withBorder className="surface-card">
                    <Stack gap="xs">
                      <Text fw={700}>Pending invites for you</Text>
                      {invitesQuery.data.map((invite) => (
                        <Group key={invite.id} justify="space-between">
                          <Text size="sm" c="var(--app-text)">
                            {invite.spaceName} invited by {invite.invitedByEmail}
                          </Text>
                            <Button
                              data-test-id="spaces-invite-accept-button"
                              size="xs"
                              variant="light"
                              loading={acceptInviteMutation.isPending}
                            onClick={() => acceptInviteMutation.mutate(invite.id)}
                          >
                            Accept
                          </Button>
                        </Group>
                      ))}
                    </Stack>
                  </Card>
                ) : null}
              </Stack>
            ) : null}

            {meQuery.data && isActivitiesPath ? (
              <Stack gap="md">
                {activitySpace ? (
                  <>
                    <Breadcrumbs>
                      <Anchor
                        component="button"
                        type="button"
                        onClick={() => navigateTo("/spaces")}
                      >
                        Spaces
                      </Anchor>
                      <Anchor
                        component="button"
                        type="button"
                        onClick={() =>
                          navigateTo(`/spaces/${slugifySpaceName(activitySpace.name)}/tasks`)
                        }
                      >
                        {truncateText(activitySpace.name, 28)}
                      </Anchor>
                      <Text size="sm" c="var(--app-subtitle)">
                        {activityTab === "members" ? "Members" : "Tasks"}
                      </Text>
                    </Breadcrumbs>
                    <Card radius="lg" withBorder className="surface-card">
                      <Group justify="space-between" align="center">
                        <Box>
                          <Title order={3}>{activitySpace.name}</Title>
                        </Box>
                        <Group>
                          {activitySpace.role === "owner" ? (
                            <Button
                              color="red"
                              variant="light"
                              onClick={() =>
                                setSpaceDeleteTarget({
                                  spaceId: activitySpace.id,
                                  spaceName: activitySpace.name
                                })
                              }
                            >
                              Delete space
                            </Button>
                          ) : null}
                        </Group>
                      </Group>
                    </Card>

                    <Card radius="lg" withBorder className="surface-card">
                      <Tabs
                        value={activityTab}
                        onChange={(value) => {
                          if (!activitySpace) {
                            return;
                          }
                          const nextTab = value === "members" ? "members" : "tasks";
                          navigateTo(
                            `/spaces/${slugifySpaceName(activitySpace.name)}/${nextTab}`
                          );
                        }}
                      >
                        <Tabs.List>
                          <Tabs.Tab value="tasks">Tasks</Tabs.Tab>
                          <Tabs.Tab value="members">Members</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="members" pt="md">
                          <Stack gap="sm">
                            {activitySpace.role === "owner" ? (
                              <Group justify="space-between" align="center">
                                <Text size="sm" c="var(--app-subtitle)">
                                  Invite people by searching first name, last name, or email.
                                </Text>
                                <Button
                                  data-test-id="space-invite-people-button"
                                  leftSection={<IconUsers size={16} />}
                                  onClick={() => setInviteModalOpen(true)}
                                >
                                  Invite people
                                </Button>
                              </Group>
                            ) : null}

                            {activityMembersQuery.isLoading || activityInvitesQuery.isLoading ? (
                              <Loader size="sm" />
                            ) : (
                              <Table.ScrollContainer minWidth={700}>
                                <Table striped highlightOnHover withTableBorder withColumnBorders>
                                  <Table.Thead>
                                    <Table.Tr>
                                      <Table.Th>First Name</Table.Th>
                                      <Table.Th>Last Name</Table.Th>
                                      <Table.Th>Email</Table.Th>
                                      <Table.Th>Status</Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>
                                  <Table.Tbody>
                                    {(activityMembersQuery.data ?? []).map((member) => (
                                      <Table.Tr key={`member-${member.userId}`}>
                                        <Table.Td>{member.firstName || "-"}</Table.Td>
                                        <Table.Td>{member.lastName || "-"}</Table.Td>
                                        <Table.Td>{member.email}</Table.Td>
                                        <Table.Td>
                                          <Badge variant="light">
                                            {member.role === "owner" ? "member (owner)" : "member"}
                                          </Badge>
                                        </Table.Td>
                                      </Table.Tr>
                                    ))}
                                    {(activityInvitesQuery.data ?? [])
                                      .filter((invite) => invite.status === "pending")
                                      .map((invite) => (
                                        <Table.Tr key={`invite-${invite.id}`}>
                                          <Table.Td>{invite.invitedFirstName || "-"}</Table.Td>
                                          <Table.Td>{invite.invitedLastName || "-"}</Table.Td>
                                          <Table.Td>{invite.email}</Table.Td>
                                          <Table.Td>
                                            <Badge color="yellow" variant="light">
                                              invited
                                            </Badge>
                                          </Table.Td>
                                        </Table.Tr>
                                      ))}
                                  </Table.Tbody>
                                </Table>
                              </Table.ScrollContainer>
                            )}
                          </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="tasks" pt="md">
                          <Stack gap="sm">
                            <Group justify="space-between" align="center">
                              <Text fw={700}>Space tasks</Text>
                              <Group gap="xs">
                                <Badge
                                  variant="filled"
                                  className="stats-badge"
                                  leftSection={<IconCheck size={14} />}
                                >
                                  {activityStats.done}/{activityStats.total} done
                                </Badge>
                                <Button
                                  data-test-id="space-add-task-button"
                                  leftSection={<IconPlus size={16} />}
                                  onClick={() => {
                                    setTaskModalOpen(true);
                                    setNewTaskTitle("");
                                    setNewTaskDescription("");
                                    setNewTaskStatus("created");
                                    setNewTaskAssignee("unassigned");
                                  }}
                                >
                                  Add Task
                                </Button>
                              </Group>
                            </Group>
                            {activityTodosQuery.isLoading ? (
                              <Group justify="center" py="xl">
                                <Loader />
                              </Group>
                            ) : (
                              (activityTodosQuery.data ?? []).map((todo) => (
                                <Card
                                  key={todo.id}
                                  withBorder
                                  className="surface-card task-clickable-card"
                                  onClick={() => navigateTo(`/tasks/${todo.id}`)}
                                  tabIndex={0}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      navigateTo(`/tasks/${todo.id}`);
                                    }
                                  }}
                                >
                                  <Group justify="space-between" align="center">
                                    <Box>
                                      <Text fw={600} c="var(--app-text)">
                                        {todo.title}
                                      </Text>
                                      <Text size="sm" c="var(--app-subtitle)">
                                        {todo.description || "No description"}
                                      </Text>
                                    </Box>
                                    <Badge variant="light" color={taskStatusMeta[todo.status].color}>
                                      {taskStatusMeta[todo.status].label}
                                    </Badge>
                                  </Group>
                                </Card>
                              ))
                            )}
                            {!activityTodosQuery.isLoading &&
                            (activityTodosQuery.data ?? []).length === 0 ? (
                              <Text c="var(--app-subtitle)">No tasks in this space yet.</Text>
                            ) : null}
                          </Stack>
                        </Tabs.Panel>
                      </Tabs>
                    </Card>
                  </>
                ) : (
                  <Card withBorder className="surface-card">
                    <Text c="var(--app-subtitle)">Space not found.</Text>
                  </Card>
                )}
              </Stack>
            ) : null}

            {meQuery.data && currentPath === "/tasks" ? (
              <Stack gap="md">
                <Card withBorder className="surface-card">
                  <Stack gap="sm">
                    <Title order={4}>Tasks</Title>
                    <Select
                      data-test-id="tasks-space-filter"
                      className="todo-input"
                      label="Filter by space"
                      value={tasksFilterSpaceId}
                      onChange={(value) => {
                        if (value) {
                          setTasksFilterSpaceId(value);
                        }
                      }}
                      data={[
                        { value: "all", label: "All spaces" },
                        ...((spacesQuery.data ?? []).map((space) => ({
                          value: String(space.id),
                          label: space.name
                        })) as Array<{ value: string; label: string }>)
                      ]}
                    />
                    <TextInput
                      data-test-id="tasks-search-input"
                      className="todo-input"
                      placeholder="Search by task title"
                      leftSection={<IconSearch size={16} />}
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.currentTarget.value)}
                    />
                  </Stack>
                </Card>

                {trimmedSearch.length > 0 && trimmedSearch.length < 3 ? (
                  <Card withBorder className="surface-card">
                    <Text c="var(--app-subtitle)">
                      Search starts after 3 characters. Showing unfiltered tasks.
                    </Text>
                  </Card>
                ) : null}

                {tasksQuery.isLoading ? (
                  <Group justify="center" py="xl">
                    <Loader />
                  </Group>
                ) : null}

                {(tasksQuery.data?.items ?? []).map((item) => (
                  <Card
                    key={`${item.spaceId}-${item.id}`}
                    withBorder
                    className="surface-card task-clickable-card"
                    onClick={() => navigateTo(`/tasks/${item.id}`)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigateTo(`/tasks/${item.id}`);
                      }
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Box>
                        <Text fw={600} c="var(--app-text)">
                          {item.title}
                        </Text>
                        <Text size="sm" c="var(--app-subtitle)">
                          {item.description || "No description"}
                        </Text>
                        <Tooltip label={`Space: ${item.spaceName}`} openDelay={200}>
                          <Badge
                            mt={6}
                            variant="light"
                            color="indigo"
                            style={{ maxWidth: 220 }}
                          >
                            {truncateText(item.spaceName, 22)}
                          </Badge>
                        </Tooltip>
                      </Box>
                      <Badge variant="light" color={taskStatusMeta[item.status].color}>
                        {taskStatusMeta[item.status].label}
                      </Badge>
                    </Group>
                  </Card>
                ))}

                {tasksQuery.data && tasksQuery.data.items.length === 0 ? (
                  <Card withBorder className="surface-card">
                    <Text c="var(--app-subtitle)">No matching tasks found.</Text>
                  </Card>
                ) : null}

                {tasksQuery.data && tasksQuery.data.total > 10 ? (
                  <Group justify="center">
                    <Pagination
                      value={tasksPage}
                      onChange={(nextPage) => {
                        setTasksPage(nextPage);
                        const params = new URLSearchParams(currentSearch);
                        if (nextPage <= 1) {
                          params.delete("page");
                        } else {
                          params.set("page", String(nextPage));
                        }

                        const nextSearch = params.toString();
                        navigateTo(`/tasks${nextSearch ? `?${nextSearch}` : ""}`);
                      }}
                      total={totalTaskPages}
                    />
                  </Group>
                ) : null}
              </Stack>
            ) : null}

            {meQuery.data && isTaskDetailPath ? (
              <Stack gap="md">
                {taskDetailQuery.isLoading ? (
                  <Group justify="center" py="xl">
                    <Loader />
                  </Group>
                ) : null}

                {!taskDetailQuery.isLoading && !taskDetailQuery.data ? (
                  <Card withBorder className="surface-card">
                    <Group justify="space-between" align="center">
                      <Text c="var(--app-subtitle)">Task not found.</Text>
                      <Button data-test-id="task-back-to-tasks-button" variant="light" onClick={() => navigateTo("/tasks")}>
                        Back to tasks
                      </Button>
                    </Group>
                  </Card>
                ) : null}

                {taskDetailQuery.data ? (
                  <>
                    <Breadcrumbs>
                      <Anchor
                        component="button"
                        type="button"
                        onClick={() => navigateTo("/spaces")}
                      >
                        Spaces
                      </Anchor>
                      <Anchor
                        component="button"
                        type="button"
                          onClick={() =>
                            navigateTo(
                              `/spaces/${slugifySpaceName(taskDetailQuery.data.spaceName)}/tasks`
                            )
                          }
                      >
                        {truncateText(taskDetailQuery.data.spaceName, 28)}
                      </Anchor>
                      <Text size="sm" c="var(--app-subtitle)">
                        Task
                      </Text>
                    </Breadcrumbs>
                    <Card withBorder className="surface-card">
                      <Stack gap="md">
                        <Group
                          justify="space-between"
                          align="flex-start"
                          wrap={isMobile ? "wrap" : "nowrap"}
                          className="task-detail-layout"
                        >
                        <Box style={{ width: "min(100%, 760px)", minWidth: 0 }}>
                          <Stack gap="sm">
                            {taskTitleEditMode && taskCanWrite ? (
                              <TextInput
                                data-test-id="task-title-input"
                                className="todo-input"
                                label="Title"
                                autoFocus
                                value={taskDetailTitle}
                                onBlur={() => setTaskTitleEditMode(false)}
                                onChange={(event) => setTaskDetailTitle(event.currentTarget.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    setTaskTitleEditMode(false);
                                  }
                                  if (event.key === "Escape") {
                                    setTaskDetailTitle(taskDetailQuery.data.title);
                                    setTaskTitleEditMode(false);
                                  }
                                }}
                              />
                            ) : (
                              <Box
                                className={
                                  taskCanWrite ? "task-title-inline is-editable" : "task-title-inline"
                                }
                                onDoubleClick={() => {
                                  if (taskCanWrite) {
                                    setTaskTitleEditMode(true);
                                  }
                                }}
                                onClick={() =>
                                  handleMobileDoubleTapEdit(taskTitleTapRef, () =>
                                    setTaskTitleEditMode(true)
                                  )
                                }
                              >
                                <Title
                                  order={3}
                                  style={{ margin: 0, cursor: taskCanWrite ? "text" : "default" }}
                                >
                                  {taskDetailTitle}
                                </Title>
                              </Box>
                            )}

                            {taskDescriptionEditMode && taskCanWrite ? (
                              <Textarea
                                data-test-id="task-description-input"
                                className="todo-input"
                                label="Description"
                                minRows={4}
                                autoFocus
                                value={taskDetailDescription}
                                onBlur={() => setTaskDescriptionEditMode(false)}
                                onChange={(event) =>
                                  setTaskDetailDescription(event.currentTarget.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    setTaskDetailDescription(taskDetailQuery.data.description);
                                    setTaskDescriptionEditMode(false);
                                  }
                                }}
                              />
                            ) : (
                              <Box
                                className={
                                  taskCanWrite ? "task-title-inline is-editable" : "task-title-inline"
                                }
                                onDoubleClick={() => {
                                  if (taskCanWrite) {
                                    setTaskDescriptionEditMode(true);
                                  }
                                }}
                                onClick={() =>
                                  handleMobileDoubleTapEdit(taskDescriptionTapRef, () =>
                                    setTaskDescriptionEditMode(true)
                                  )
                                }
                              >
                                <Text
                                  c="var(--app-text)"
                                  style={{ margin: 0, cursor: taskCanWrite ? "text" : "default" }}
                                >
                                  {taskDetailDescription || "No description"}
                                </Text>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                        <Stack
                          gap="xs"
                          align={isMobile ? "stretch" : "flex-end"}
                          className="task-detail-controls"
                        >
                          <Group
                            align="center"
                            gap="xs"
                            wrap={isMobile ? "wrap" : "nowrap"}
                            justify={isMobile ? "flex-start" : "flex-end"}
                          >
                            <Button
                              data-test-id="task-save-button"
                              leftSection={<IconWriting size={16} />}
                              loading={updateTaskDetailMutation.isPending}
                              disabled={
                                !taskCanWrite ||
                                (taskDetailTitle.trim() === taskDetailQuery.data.title &&
                                  taskDetailDescription.trim() ===
                                    taskDetailQuery.data.description &&
                                  taskDetailStatus === taskDetailQuery.data.status &&
                                  taskDetailAssignee ===
                                    (taskDetailQuery.data.assigneeUserId
                                      ? String(taskDetailQuery.data.assigneeUserId)
                                      : "unassigned"))
                              }
                              onClick={() => {
                                const cleanTitle = taskDetailTitle.trim();
                                if (!cleanTitle) {
                                  notifications.show({
                                    color: "red",
                                    title: "Validation failed",
                                    message: "Title cannot be empty."
                                  });
                                  return;
                                }

                                updateTaskDetailMutation.mutate({
                                  taskId: taskDetailQuery.data.id,
                                  title: cleanTitle,
                                  description: taskDetailDescription.trim(),
                                  status: taskDetailStatus,
                                  assigneeUserId:
                                    taskDetailAssignee === "unassigned"
                                      ? null
                                      : Number(taskDetailAssignee)
                                });
                              }}
                            >
                              Save changes
                            </Button>
                            {taskCanDelete ? (
                              <Button
                                data-test-id="task-delete-button"
                                color="red"
                                variant="light"
                                onClick={() =>
                                  setTaskDeleteTarget({
                                    spaceId: taskDetailQuery.data.spaceId,
                                    taskId: taskDetailQuery.data.id,
                                    taskTitle: taskDetailQuery.data.title,
                                    fromDetail: true
                                  })
                                }
                              >
                                Delete task
                              </Button>
                            ) : null}
                          </Group>
                          <Stack gap="xs" w={isMobile ? "100%" : 260}>
                            <Select
                              data-test-id="task-status-select"
                              className="todo-input"
                              label="Status"
                              data={taskStatusOptions}
                              value={taskDetailStatus}
                              disabled={!taskCanWrite}
                              onChange={(value) => {
                                if (value) {
                                  setTaskDetailStatus(value as TaskStatus);
                                }
                              }}
                            />
                            <Select
                              data-test-id="task-assignee-select"
                              className="todo-input"
                              label="Assignee"
                              value={taskDetailAssignee}
                              disabled={!taskCanWrite}
                              onChange={(value) => setTaskDetailAssignee(value ?? "unassigned")}
                              data={[
                                { value: "unassigned", label: "Unassigned" },
                                ...((taskDetailMembersQuery.data ?? []).map((member) => ({
                                  value: String(member.userId),
                                  label: `${member.firstName} ${member.lastName} (${member.email})`
                                })) as Array<{ value: string; label: string }>)
                              ]}
                            />
                          </Stack>
                        </Stack>
                      </Group>

                    </Stack>
                  </Card>
                </>
                ) : null}
              </Stack>
            ) : null}

            {meQuery.data && !knownPaths.has(currentPath) && !isActivitiesPath && !isTaskDetailPath ? (
              <Card withBorder className="surface-card">
                <Group justify="space-between" align="center">
                  <Text c="var(--app-subtitle)">Page not found</Text>
                  <Button onClick={() => navigateTo("/")}>Go Home</Button>
                </Group>
              </Card>
            ) : null}
          </Stack>
          <Box component="footer" className="app-footer">
            <Text size="sm" c="var(--app-subtitle)" ta="center">
              © Mustafa Masetic {new Date().getFullYear()} • playground project
            </Text>
          </Box>
        </Container>
      </AppShell.Main>
      <Modal
        data-test-id="delete-task-modal"
        opened={Boolean(taskDeleteTarget)}
        onClose={() => setTaskDeleteTarget(null)}
        title="Delete task?"
        centered
      >
        <Stack>
          <Text c="var(--app-subtitle)">
            This will permanently delete{" "}
            <Text span fw={700} c="var(--app-text)">
              {taskDeleteTarget?.taskTitle || "this task"}
            </Text>
            .
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setTaskDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              data-test-id="delete-task-confirm-button"
              color="red"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!taskDeleteTarget) {
                  return;
                }
                deleteMutation.mutate({
                  spaceId: taskDeleteTarget.spaceId,
                  id: taskDeleteTarget.taskId,
                  fromDetail: taskDeleteTarget.fromDetail
                });
              }}
            >
              Delete task
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        data-test-id="delete-space-modal"
        opened={Boolean(spaceDeleteTarget)}
        onClose={() => setSpaceDeleteTarget(null)}
        title="Delete space?"
        centered
      >
        <Stack>
          <Text c="var(--app-subtitle)">
            This will permanently delete{" "}
            <Text span fw={700} c="var(--app-text)">
              {spaceDeleteTarget?.spaceName || "this space"}
            </Text>{" "}
            and all tasks in it.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setSpaceDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              data-test-id="delete-space-confirm-button"
              color="red"
              loading={deleteSpaceMutation.isPending}
              onClick={() => {
                if (!spaceDeleteTarget) {
                  return;
                }
                deleteSpaceMutation.mutate({ spaceId: spaceDeleteTarget.spaceId });
              }}
            >
              Delete space
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminUserEditTarget)}
        onClose={() => setAdminUserEditTarget(null)}
        title="Edit user"
        centered
      >
        <Stack>
          <TextInput
            className="todo-input"
            label="Email"
            value={adminUserEditTarget?.email ?? ""}
            readOnly
          />
          <Group grow>
            <TextInput
              className="todo-input"
              label="First name"
              value={adminUserEditTarget?.firstName ?? ""}
              onChange={(event) =>
                setAdminUserEditTarget((prev) =>
                  prev
                    ? {
                        ...prev,
                        firstName: event.currentTarget.value
                      }
                    : prev
                )
              }
            />
            <TextInput
              className="todo-input"
              label="Last name"
              value={adminUserEditTarget?.lastName ?? ""}
              onChange={(event) =>
                setAdminUserEditTarget((prev) =>
                  prev
                    ? {
                        ...prev,
                        lastName: event.currentTarget.value
                      }
                    : prev
                )
              }
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminUserEditTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={updateAdminUserMutation.isPending}
              onClick={() => {
                if (!adminUserEditTarget) {
                  return;
                }
                const firstName = adminUserEditTarget.firstName.trim();
                const lastName = adminUserEditTarget.lastName.trim();
                if (firstName.length < 2 || lastName.length < 2) {
                  notifications.show({
                    color: "red",
                    title: "Validation failed",
                    message: "First and last name must be at least 2 characters."
                  });
                  return;
                }
                updateAdminUserMutation.mutate({
                  userId: adminUserEditTarget.userId,
                  payload: {
                    firstName,
                    lastName
                  }
                });
              }}
            >
              Save changes
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminUserDeleteTarget)}
        onClose={() => setAdminUserDeleteTarget(null)}
        title="Delete user?"
        centered
      >
        <Stack>
          <Text c="var(--app-subtitle)">
            This will permanently delete{" "}
            <Text span fw={700} c="var(--app-text)">
              {adminUserDeleteTarget?.label || "this user"}
            </Text>
            .
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminUserDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={adminBulkUsersMutation.isPending}
              onClick={() => {
                if (!adminUserDeleteTarget) {
                  return;
                }
                adminBulkUsersMutation.mutate({
                  action: "delete",
                  userIds: adminUserDeleteTarget.userIds
                });
              }}
            >
              Delete user
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminUserRoleTarget)}
        onClose={() => setAdminUserRoleTarget(null)}
        title={adminUserRoleTarget?.nextIsAdmin ? "Set admin?" : "Unset admin?"}
        centered
      >
        <Stack>
          <Text c="var(--app-subtitle)">
            {adminUserRoleTarget?.nextIsAdmin ? "Grant admin access to " : "Remove admin access from "}
            <Text span fw={700} c="var(--app-text)">
              {adminUserRoleTarget?.label || "this user"}
            </Text>
            ?
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminUserRoleTarget(null)}>
              Cancel
            </Button>
            <Button
              color={adminUserRoleTarget?.nextIsAdmin ? "cyan" : "orange"}
              loading={updateAdminUserMutation.isPending}
              onClick={() => {
                if (!adminUserRoleTarget) {
                  return;
                }
                updateAdminUserMutation.mutate({
                  userId: adminUserRoleTarget.userId,
                  payload: { isAdmin: adminUserRoleTarget.nextIsAdmin }
                });
              }}
            >
              {adminUserRoleTarget?.nextIsAdmin ? "Set admin" : "Unset admin"}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminUserPasswordTarget)}
        onClose={() => setAdminUserPasswordTarget(null)}
        title="Reset password"
        centered
      >
        <Stack>
          <Text c="var(--app-subtitle)">
            Set a new password for{" "}
            <Text span fw={700} c="var(--app-text)">
              {adminUserPasswordTarget?.label || "this user"}
            </Text>
            .
          </Text>
          <PasswordInput
            className="todo-input"
            label="New password"
            value={adminUserPasswordTarget?.password ?? ""}
            onChange={(event) =>
              setAdminUserPasswordTarget((prev) =>
                prev
                  ? {
                      ...prev,
                      password: event.currentTarget.value
                    }
                  : prev
              )
            }
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminUserPasswordTarget(null)}>
              Cancel
            </Button>
            <Button
              color="yellow"
              loading={resetAdminPasswordMutation.isPending}
              onClick={() => {
                if (!adminUserPasswordTarget) {
                  return;
                }
                const trimmedValue = adminUserPasswordTarget.password.trim();
                setAdminResetPasswordByUserId((prev) => ({
                  ...prev,
                  [adminUserPasswordTarget.userId]: trimmedValue
                }));
                if (trimmedValue.length < 8) {
                  notifications.show({
                    color: "red",
                    title: "Validation failed",
                    message: "Password must be at least 8 characters."
                  });
                  return;
                }
                resetAdminPasswordMutation.mutate({
                  userId: adminUserPasswordTarget.userId,
                  newPassword: trimmedValue
                });
              }}
            >
              Reset password
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminSpaceEditTarget)}
        onClose={() => setAdminSpaceEditTarget(null)}
        title="Edit space"
        centered
      >
        <Stack>
          <TextInput
            className="todo-input"
            label="Space name"
            value={adminSpaceEditTarget?.name ?? ""}
            onChange={(event) =>
              setAdminSpaceEditTarget((prev) =>
                prev
                  ? {
                      ...prev,
                      name: event.currentTarget.value
                    }
                  : prev
              )
            }
          />
          <Textarea
            className="todo-input"
            label="Description"
            minRows={4}
            value={adminSpaceEditTarget?.description ?? ""}
            onChange={(event) =>
              setAdminSpaceEditTarget((prev) =>
                prev
                  ? {
                      ...prev,
                      description: event.currentTarget.value
                    }
                  : prev
              )
            }
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminSpaceEditTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={updateAdminSpaceMutation.isPending}
              onClick={() => {
                if (!adminSpaceEditTarget) {
                  return;
                }
                const name = adminSpaceEditTarget.name.trim();
                if (name.length < 2) {
                  notifications.show({
                    color: "red",
                    title: "Validation failed",
                    message: "Space name must be at least 2 characters."
                  });
                  return;
                }
                updateAdminSpaceMutation.mutate({
                  spaceId: adminSpaceEditTarget.spaceId,
                  name,
                  description: adminSpaceEditTarget.description.trim()
                });
              }}
            >
              Save changes
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminTaskEditTarget)}
        onClose={() => setAdminTaskEditTarget(null)}
        title="Edit task"
        centered
      >
        <Stack>
          <TextInput
            className="todo-input"
            label="Task title"
            value={adminTaskEditTarget?.title ?? ""}
            onChange={(event) =>
              setAdminTaskEditTarget((prev) =>
                prev
                  ? {
                      ...prev,
                      title: event.currentTarget.value
                    }
                  : prev
              )
            }
          />
          <Textarea
            className="todo-input"
            label="Description"
            minRows={4}
            value={adminTaskEditTarget?.description ?? ""}
            onChange={(event) =>
              setAdminTaskEditTarget((prev) =>
                prev
                  ? {
                      ...prev,
                      description: event.currentTarget.value
                    }
                  : prev
              )
            }
          />
          <Select
            className="todo-input"
            label="Status"
            value={adminTaskEditTarget?.status ?? null}
            data={taskStatusOptions}
            onChange={(value) =>
              value &&
              setAdminTaskEditTarget((prev) =>
                prev
                  ? {
                      ...prev,
                      status: value as TaskStatus
                    }
                  : prev
              )
            }
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminTaskEditTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={updateAdminTaskMutation.isPending}
              onClick={() => {
                if (!adminTaskEditTarget) {
                  return;
                }
                const title = adminTaskEditTarget.title.trim();
                if (title.length < 2) {
                  notifications.show({
                    color: "red",
                    title: "Validation failed",
                    message: "Task title must be at least 2 characters."
                  });
                  return;
                }
                updateAdminTaskMutation.mutate({
                  taskId: adminTaskEditTarget.taskId,
                  payload: {
                    title,
                    description: adminTaskEditTarget.description.trim(),
                    status: adminTaskEditTarget.status
                  }
                });
              }}
            >
              Save changes
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminSpaceDeleteTarget)}
        onClose={() => setAdminSpaceDeleteTarget(null)}
        title="Delete space?"
        centered
      >
        <Stack>
          <Text c="var(--app-subtitle)">
            This will permanently delete{" "}
            <Text span fw={700} c="var(--app-text)">
              {adminSpaceDeleteTarget?.label || "this space"}
            </Text>
            .
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminSpaceDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={
                adminSpaceDeleteTarget?.spaceIds.length === 1
                  ? deleteAdminSpaceMutation.isPending
                  : adminBulkSpacesMutation.isPending
              }
              onClick={() => {
                if (!adminSpaceDeleteTarget) {
                  return;
                }
                if (adminSpaceDeleteTarget.spaceIds.length === 1) {
                  deleteAdminSpaceMutation.mutate(adminSpaceDeleteTarget.spaceIds[0]);
                  return;
                }
                adminBulkSpacesMutation.mutate({
                  action: "delete",
                  spaceIds: adminSpaceDeleteTarget.spaceIds
                });
              }}
            >
              Delete space
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(adminTaskDeleteTarget)}
        onClose={() => setAdminTaskDeleteTarget(null)}
        title="Delete task?"
        centered
      >
        <Stack>
          <Text c="var(--app-subtitle)">
            This will permanently delete{" "}
            <Text span fw={700} c="var(--app-text)">
              {adminTaskDeleteTarget?.label || "this task"}
            </Text>
            .
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAdminTaskDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={
                adminTaskDeleteTarget?.taskIds.length === 1
                  ? deleteAdminTaskMutation.isPending
                  : adminBulkTasksMutation.isPending
              }
              onClick={() => {
                if (!adminTaskDeleteTarget) {
                  return;
                }
                if (adminTaskDeleteTarget.taskIds.length === 1) {
                  deleteAdminTaskMutation.mutate(adminTaskDeleteTarget.taskIds[0]);
                  return;
                }
                adminBulkTasksMutation.mutate({
                  action: "delete",
                  taskIds: adminTaskDeleteTarget.taskIds
                });
              }}
            >
              Delete task
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        data-test-id="global-search-modal"
        opened={globalSearchOpen}
        onClose={() => {
          setGlobalSearchOpen(false);
          setGlobalSearchValue("");
          setDebouncedGlobalSearch("");
        }}
        title="Search"
        centered
        size="lg"
      >
        <Stack gap="sm" style={{ height: 560 }}>
          <TextInput
            data-test-id="global-search-input"
            className="todo-input"
            placeholder="Search tasks or spaces..."
            leftSection={<IconSearch size={16} />}
            ref={globalSearchInputRef}
            value={globalSearchValue}
            onChange={(event) => setGlobalSearchValue(event.currentTarget.value)}
          />

          <Box mih={20}>
            {liveGlobalSearch.length > 0 && liveGlobalSearch.length < 2 ? (
              <Text size="sm" c="var(--app-subtitle)">
                Type at least 2 characters.
              </Text>
            ) : null}
          </Box>

          <Box style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
            {trimmedGlobalSearch.length >= 2 ? (
              <Stack gap="md">
                {globalTaskSearchQuery.isFetching && globalSearchResults.length === 0 ? (
                  <Stack gap="xs">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Card key={`global-result-skeleton-${index}`} withBorder className="surface-card">
                        <Stack gap={8}>
                          <Skeleton height={14} radius="sm" width="46%" />
                          <Skeleton height={12} radius="sm" width="68%" />
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    {globalSearchResults.map((result) => (
                      <Card
                        key={result.key}
                        withBorder
                        className="surface-card task-clickable-card"
                        onClick={() => {
                          navigateTo(result.path);
                          setGlobalSearchOpen(false);
                          setGlobalSearchValue("");
                          setDebouncedGlobalSearch("");
                        }}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigateTo(result.path);
                            setGlobalSearchOpen(false);
                            setGlobalSearchValue("");
                            setDebouncedGlobalSearch("");
                          }
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Box>
                            <Text fw={600} c="var(--app-text)">
                              {result.title}
                            </Text>
                            <Text size="sm" c="var(--app-subtitle)">
                              {result.description}
                            </Text>
                            <Text size="xs" c="var(--app-subtitle)" mt={4}>
                              {result.extra}
                            </Text>
                          </Box>
                          <Group gap="xs">
                            <Badge
                              variant="light"
                              color={result.type === "task" ? "blue" : "teal"}
                            >
                              {result.type === "task" ? "Task" : "Space"}
                            </Badge>
                            {result.type === "task" && result.status ? (
                              <Badge
                                variant="light"
                                color={taskStatusMeta[result.status].color}
                              >
                                {taskStatusMeta[result.status].label}
                              </Badge>
                            ) : null}
                          </Group>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            ) : (
              <Text size="sm" c="var(--app-subtitle)">
                Start typing to search across tasks and spaces.
              </Text>
            )}
          </Box>
        </Stack>
      </Modal>
      <Modal
        data-test-id="invite-modal"
        opened={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setInviteSearchValue("");
          setDebouncedInviteSearch("");
        }}
        title="Invite People"
        centered
        size="lg"
      >
        <Stack gap="sm" style={{ height: 520 }}>
          <TextInput
            data-test-id="invite-search-input"
            className="todo-input"
            label="Search users"
            placeholder="Type name or email (min 3 characters)"
            leftSection={<IconSearch size={16} />}
            ref={inviteSearchInputRef}
            value={inviteSearchValue}
            onChange={(event) => setInviteSearchValue(event.currentTarget.value)}
          />

          <Box mih={20}>
            {liveInviteSearch.length > 0 && liveInviteSearch.length < 3 ? (
              <Text size="sm" c="var(--app-subtitle)">
                Enter at least 3 characters to search.
              </Text>
            ) : null}
          </Box>

          <Box style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
            {inviteUsersQuery.isFetching && inviteCandidates.length === 0 ? (
              <Stack gap="xs">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={`invite-skeleton-${index}`} withBorder className="surface-card">
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Box style={{ flex: 1 }}>
                        <Skeleton height={14} radius="sm" mb={8} width="45%" />
                        <Skeleton height={12} radius="sm" width="70%" />
                      </Box>
                      <Skeleton height={30} radius="sm" width={64} />
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : trimmedInviteSearch.length >= 3 ? (
              inviteCandidates.length > 0 ? (
                <Stack gap="xs">
                  {inviteCandidates.map((candidate) => (
                    <Card key={candidate.id} withBorder className="surface-card">
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Box>
                          <Text fw={600} c="var(--app-text)">
                            {`${candidate.firstName} ${candidate.lastName}`.trim() || "-"}
                          </Text>
                          <Text size="sm" c="var(--app-subtitle)">
                            {candidate.email}
                          </Text>
                        </Box>
                        <Button
                          size="xs"
                          loading={inviteMutation.isPending}
                          onClick={() => {
                            if (!activitySpaceId) {
                              return;
                            }
                            inviteMutation.mutate({
                              spaceId: activitySpaceId,
                              emailValue: candidate.email.toLowerCase()
                            });
                          }}
                        >
                          Invite
                        </Button>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="var(--app-subtitle)">
                  No matching users available to invite.
                </Text>
              )
            ) : (
              <Text size="sm" c="var(--app-subtitle)">
                Start typing to find users.
              </Text>
            )}
          </Box>
        </Stack>
      </Modal>
      <Modal
        data-test-id="create-space-modal"
        opened={spaceModalOpen}
        onClose={() => setSpaceModalOpen(false)}
        title="Create Space"
        centered
      >
        <Stack>
          <TextInput
            data-test-id="create-space-name-input"
            label="Space name"
            placeholder="Engineering"
            value={spaceName}
            onChange={(event) => setSpaceName(event.currentTarget.value)}
            className="todo-input"
          />
          <Textarea
            data-test-id="create-space-description-input"
            label="Description"
            placeholder="What is this space for?"
            value={spaceDescription}
            onChange={(event) => setSpaceDescription(event.currentTarget.value)}
            className="todo-input"
            minRows={3}
          />
          <Button
            data-test-id="create-space-submit-button"
            className="add-button"
            loading={createSpaceMutation.isPending}
            disabled={spaceName.trim().length < 2}
            onClick={() =>
              createSpaceMutation.mutate({
                name: spaceName.trim(),
                description: spaceDescription.trim()
              })
            }
          >
            Create space
          </Button>
        </Stack>
      </Modal>
      <Modal
        data-test-id="add-task-modal"
        opened={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Add Task to Space"
        centered
      >
        <Stack>
          <TextInput
            data-test-id="add-task-title-input"
            label="Task title"
            placeholder="Define rollout checklist"
            className="todo-input"
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.currentTarget.value)}
          />
          <Textarea
            data-test-id="add-task-description-input"
            label="Description"
            placeholder="Add context, acceptance criteria, or links"
            className="todo-input"
            value={newTaskDescription}
            onChange={(event) => setNewTaskDescription(event.currentTarget.value)}
            minRows={3}
          />
          <Select
            data-test-id="add-task-status-select"
            className="todo-input"
            label="Status"
            data={taskStatusOptions}
            value={newTaskStatus}
            onChange={(value) => {
              if (value) {
                setNewTaskStatus(value as TaskStatus);
              }
            }}
          />
          <Select
            data-test-id="add-task-assignee-select"
            className="todo-input"
            label="Assignee"
            value={newTaskAssignee}
            onChange={(value) => setNewTaskAssignee(value ?? "unassigned")}
            data={[
              { value: "unassigned", label: "Unassigned" },
              ...((activityMembersQuery.data ?? []).map((member) => ({
                value: String(member.userId),
                label: `${member.firstName} ${member.lastName} (${member.email})`
              })) as Array<{ value: string; label: string }>)
            ]}
          />
          <Button
            data-test-id="add-task-submit-button"
            disabled={!newTaskTitle.trim() || !activitySpaceId}
            loading={createTodoMutation.isPending}
            onClick={() =>
              createTodoMutation.mutate({
                spaceId: activitySpaceId as number,
                taskTitle: newTaskTitle,
                taskDescription: newTaskDescription,
                taskStatus: newTaskStatus,
                assigneeUserId: newTaskAssignee === "unassigned" ? null : Number(newTaskAssignee)
              })
            }
          >
            Create task
          </Button>
        </Stack>
      </Modal>
    </AppShell>
  );
}

export default App;
