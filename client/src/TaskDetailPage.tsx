import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  FileButton,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  rem,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconClock,
  IconDownload,
  IconEdit,
  IconPaperclip,
  IconPlus,
  IconSend,
  IconTrash,
  IconWriting,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createComment,
  createSubtask,
  deleteAttachment,
  deleteComment,
  deleteSubtask,
  deleteTodo,
  getAttachmentDownloadUrl,
  getAttachments,
  getComments,
  getSpaceMembers,
  getSubtasks,
  getTask,
  updateSubtask,
  updateTask,
  uploadAttachment,
} from "./api";
import type { TaskSearchResult, TaskStatus } from "./types";

interface TaskDetailPageProps {
  taskId: number;
  onBack: () => void;
  currentUserId: number;
}

function statusColor(status: string) {
  switch (status) {
    case "done": return "teal";
    case "in_progress": return "blue";
    default: return "gray";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "in_progress": return "In Progress";
    case "done": return "Done";
    default: return "Created";
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const cardStyle: React.CSSProperties = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
};

export function TaskDetailPage({ taskId, onBack, currentUserId }: TaskDetailPageProps) {
  const qc = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: () => getSubtasks(taskId),
    enabled: !!task,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => getComments(taskId),
    enabled: !!task,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: () => getAttachments(taskId),
    enabled: !!task,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("created");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState<number | null>(null);

  const { data: spaceMembers = [] } = useQuery({
    queryKey: ["space-members", task?.spaceId],
    queryFn: () => getSpaceMembers(task!.spaceId),
    enabled: !!task && isEditing,
  });
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newComment, setNewComment] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (t: TaskSearchResult) => deleteTodo(t.spaceId, t.id),
    onSuccess: () => {
      notifications.show({ "data-test-id": "task-deleted-toast", color: "teal", title: "Task deleted", message: "The task has been removed." });
      onBack();
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: "red" }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateTask>[1]) => updateTask(taskId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(["task", taskId], updated);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setIsEditing(false);
      notifications.show({ "data-test-id": "task-updated-toast", color: "teal", title: "Task updated", message: "Task details have been saved." });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: "red" }),
  });

  const addSubtaskMutation = useMutation({
    mutationFn: (title: string) => createSubtask(taskId, title),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subtasks", taskId] }); setNewSubtaskText(""); },
    onError: (e: Error) => notifications.show({ message: e.message, color: "red" }),
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: number; completed: boolean }) =>
      updateSubtask(taskId, subtaskId, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subtasks", taskId] }),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: number) => deleteSubtask(taskId, subtaskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subtasks", taskId] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => createComment(taskId, content),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["comments", taskId] }); setNewComment(""); },
    onError: (e: Error) => notifications.show({ message: e.message, color: "red" }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(taskId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", taskId] }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", taskId] }),
    onError: (e: Error) => notifications.show({ message: e.message, color: "red" }),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(taskId, attachmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", taskId] }),
  });

  function startEditing(t: TaskSearchResult) {
    setEditTitle(t.title);
    setEditDescription(t.description);
    setEditStatus(t.status);
    setEditDueDate(t.dueDate ?? "");
    setEditAssigneeId(t.assigneeUserId ?? null);
    setIsEditing(true);
  }

  function handleSave() {
    const cleanTitle = editTitle.trim();
    if (!cleanTitle) {
      notifications.show({ color: "red", title: "Validation failed", message: "Title cannot be empty." });
      return;
    }
    updateMutation.mutate({ title: cleanTitle, description: editDescription.trim(), status: editStatus, dueDate: editDueDate || null, assigneeUserId: editAssigneeId });
  }

  if (isLoading || !task) {
    return (
      <Stack gap="xl">
        <Group gap="xs">
          <Button variant="subtle" size="sm" leftSection={<IconArrowLeft size={16} />} onClick={onBack} c="var(--app-subtitle)">
            Back
          </Button>
        </Group>
        <Text c="var(--app-subtitle)">Loading task…</Text>
      </Stack>
    );
  }

  const completedCount = subtasks.filter((s) => s.completed).length;

  return (
    <Stack gap="lg">
      {/* Breadcrumb */}
      <Group gap={4}>
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
          c="var(--app-subtitle)"
          styles={{ root: { paddingInline: 6 } }}
        >
          Back
        </Button>
        <Text size="sm" c="var(--app-subtitle)">/ {task.spaceName} / Task</Text>
      </Group>

      <Grid gutter="lg" align="flex-start">
        {/* ── Left column ── */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">

            {/* Title card */}
            <Card withBorder radius="md" p="xl" style={cardStyle}>
              <Stack gap="sm">
                {isEditing ? (
                  <TextInput
                    className="todo-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.currentTarget.value)}
                    styles={{ input: { fontSize: rem(22), fontWeight: 700 } }}
                  />
                ) : (
                  <Text fw={700} size="xl" c="var(--app-title)" style={{ fontSize: rem(24), lineHeight: 1.2 }}>
                    {task.title}
                  </Text>
                )}
                <Group gap="sm" wrap="wrap">
                  <Badge
                    className="tasks-status-badge"
                    variant="light"
                    color={statusColor(task.status)}
                    size="sm"
                    radius="sm"
                  >
                    {statusLabel(task.status)}
                  </Badge>
                  <Group gap={6}>
                    <Avatar size={18} radius="xl" color="violet" variant="light">
                      {initials(task.assigneeFirstName || "?", task.assigneeLastName || "?")}
                    </Avatar>
                    <Text size="xs" c="var(--app-subtitle)">Created</Text>
                  </Group>
                  <Group gap={4}>
                    <IconClock size={13} color="var(--app-subtitle)" />
                    <Text size="xs" c="var(--app-subtitle)">{formatDate(task.createdAt)}</Text>
                  </Group>
                </Group>
              </Stack>
            </Card>

            {/* Description */}
            <Card withBorder radius="md" p="lg" style={cardStyle}>
              <Stack gap="sm">
                <Text fw={600} size="sm" c="var(--app-title)">Description</Text>
                {isEditing ? (
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.currentTarget.value)}
                    minRows={5}
                    autosize
                    styles={{
                      input: {
                        background: "color-mix(in srgb, var(--app-surface) 88%, black 12%)",
                        borderColor: "var(--app-border)",
                        color: "var(--app-text)",
                      },
                    }}
                  />
                ) : (
                  <Text size="sm" c="var(--app-text)" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {task.description || <span style={{ opacity: 0.45 }}>No description.</span>}
                  </Text>
                )}
              </Stack>
            </Card>

            {/* Subtasks */}
            <Card withBorder radius="md" p="lg" style={cardStyle}>
              <Stack gap="md">
                <Group gap="xs">
                  <Text fw={600} size="sm" c="var(--app-title)">Subtasks</Text>
                  <Badge size="xs" variant="light" color="cyan" radius="sm">
                    {completedCount}/{subtasks.length}
                  </Badge>
                </Group>

                <Stack gap={6}>
                  {subtasks.map((st) => (
                    <Group key={st.id} gap="sm" wrap="nowrap"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid color-mix(in srgb, var(--app-border) 60%, transparent)",
                        background: "color-mix(in srgb, var(--app-surface) 96%, black 4%)",
                      }}
                    >
                      <div
                        role="checkbox"
                        aria-checked={st.completed === 1}
                        tabIndex={0}
                        onClick={() => toggleSubtaskMutation.mutate({ subtaskId: st.id, completed: st.completed !== 1 })}
                        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggleSubtaskMutation.mutate({ subtaskId: st.id, completed: st.completed !== 1 }); }}
                        style={{
                          flexShrink: 0,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: `2px solid ${st.completed ? "#0891b2" : "var(--app-border)"}`,
                          background: st.completed ? "#0891b2" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        {st.completed === 1 && <IconCheck size={11} color="#fff" stroke={3} />}
                      </div>
                      <Text
                        size="sm"
                        c={st.completed ? "var(--app-subtitle)" : "var(--app-text)"}
                        style={{ textDecoration: st.completed ? "line-through" : "none", flex: 1 }}
                      >
                        {st.title}
                      </Text>
                      <ActionIcon variant="subtle" color="red" size="sm"
                        onClick={() => deleteSubtaskMutation.mutate(st.id)}>
                        <IconTrash size={13} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>

                <Group gap="xs">
                  <TextInput
                    className="todo-input"
                    placeholder="Add a subtask…"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newSubtaskText.trim()) addSubtaskMutation.mutate(newSubtaskText.trim()); }}
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="sm"
                    className="add-button"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => { if (newSubtaskText.trim()) addSubtaskMutation.mutate(newSubtaskText.trim()); }}
                    loading={addSubtaskMutation.isPending}
                  >
                    Add
                  </Button>
                </Group>
              </Stack>
            </Card>

            {/* Attachments */}
            <Card withBorder radius="md" p="lg" style={cardStyle}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600} size="sm" c="var(--app-title)">Attachments</Text>
                  <FileButton onChange={(file) => { if (file) uploadMutation.mutate(file); }} accept="*">
                    {(props) => (
                      <Button
                        {...props}
                        size="xs"
                        className="add-button"
                        leftSection={<IconPaperclip size={13} />}
                        loading={uploadMutation.isPending}
                      >
                        Upload
                      </Button>
                    )}
                  </FileButton>
                </Group>
                <Stack gap="xs">
                  {attachments.length === 0 && (
                    <Text size="sm" c="var(--app-subtitle)">No attachments yet.</Text>
                  )}
                  {attachments.map((att) => (
                    <Group
                      key={att.id}
                      gap="sm"
                      wrap="nowrap"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid color-mix(in srgb, var(--app-border) 60%, transparent)",
                        background: "color-mix(in srgb, var(--app-surface) 96%, black 4%)",
                      }}
                    >
                      <div style={{
                        flexShrink: 0,
                        width: rem(36),
                        height: rem(36),
                        borderRadius: rem(8),
                        background: "color-mix(in srgb, var(--badge-bg) 16%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <IconPaperclip size={16} color="var(--badge-bg)" />
                      </div>
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} c="var(--app-text)" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {att.originalName}
                        </Text>
                        <Text size="xs" c="var(--app-subtitle)">
                          {formatBytes(att.sizeBytes)} · Uploaded by {att.uploaderFirstName} {att.uploaderLastName} on {formatDate(att.createdAt)}
                        </Text>
                      </Stack>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          component="a"
                          href={getAttachmentDownloadUrl(taskId, att.id)}
                          download={att.originalName}
                        >
                          <IconDownload size={15} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => deleteAttachmentMutation.mutate(att.id)}
                        >
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Stack>
            </Card>

            {/* Activity / Comments */}
            <Card withBorder radius="md" p="lg" style={cardStyle}>
              <Stack gap="md">
                <Text fw={600} size="sm" c="var(--app-title)">Activity</Text>
                <Stack gap="md">
                  {comments.length === 0 && (
                    <Text size="sm" c="var(--app-subtitle)">No comments yet.</Text>
                  )}
                  {comments.map((c) => (
                    <Group key={c.id} gap="sm" align="flex-start" wrap="nowrap">
                      <Avatar size="sm" radius="xl" color="cyan" variant="light">
                        {initials(c.authorFirstName, c.authorLastName)}
                      </Avatar>
                      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="xs" fw={600} c="var(--app-text)">
                            {c.authorFirstName} {c.authorLastName}
                          </Text>
                          <Text size="xs" c="var(--app-subtitle)">{formatTimestamp(c.createdAt)}</Text>
                          {c.userId === currentUserId && (
                            <ActionIcon variant="subtle" color="red" size="xs" ml="auto"
                              onClick={() => deleteCommentMutation.mutate(c.id)}>
                              <IconTrash size={11} />
                            </ActionIcon>
                          )}
                        </Group>
                        <Text size="sm" c="var(--app-text)">{c.content}</Text>
                      </Stack>
                    </Group>
                  ))}
                </Stack>
                <Divider color="var(--app-border)" />
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <Avatar size="sm" radius="xl" color="violet" variant="light">U</Avatar>
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Textarea
                      placeholder="Add a comment…"
                      value={newComment}
                      onChange={(e) => setNewComment(e.currentTarget.value)}
                      minRows={2}
                      styles={{
                        input: {
                          background: "color-mix(in srgb, var(--app-surface) 88%, black 12%)",
                          borderColor: "var(--app-border)",
                          color: "var(--app-text)",
                        },
                      }}
                    />
                    <Group justify="flex-end">
                      <Button
                        size="sm"
                        className="add-button"
                        leftSection={<IconSend size={13} />}
                        onClick={() => { if (newComment.trim()) addCommentMutation.mutate(newComment.trim()); }}
                        disabled={!newComment.trim()}
                        loading={addCommentMutation.isPending}
                      >
                        Comment
                      </Button>
                    </Group>
                  </Stack>
                </Group>
              </Stack>
            </Card>

          </Stack>
        </Grid.Col>

        {/* ── Right sidebar ── */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">

            {/* Action buttons */}
            <Card withBorder radius="md" p="md" style={cardStyle}>
              <Stack gap="xs">
                {isEditing ? (
                  <>
                    <Button
                      fullWidth
                      className="add-button"
                      leftSection={<IconWriting size={16} />}
                      onClick={handleSave}
                      loading={updateMutation.isPending}
                      data-test-id="task-save-button"
                    >
                      Save Changes
                    </Button>
                    <Button
                      fullWidth
                      variant="light"
                      color="gray"
                      leftSection={<IconX size={16} />}
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      fullWidth
                      className="add-button"
                      leftSection={<IconEdit size={16} />}
                      onClick={() => startEditing(task)}
                      data-test-id="task-edit-button"
                    >
                      Edit Task
                    </Button>
                    <Button
                      fullWidth
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => setDeleteConfirmOpen(true)}
                      data-test-id="task-delete-button"
                    >
                      Delete Task
                    </Button>
                  </>
                )}
              </Stack>
            </Card>

            {/* Details */}
            <Card withBorder radius="md" p="lg" style={cardStyle}>
              <Stack gap="md">
                <Text fw={600} size="sm" c="var(--app-title)">Details</Text>
                <Stack gap="sm">

                  <div>
                    <Text size="xs" c="var(--app-subtitle)" mb={6}>Status</Text>
                    {isEditing ? (
                      <Select
                        className="todo-input"
                        value={editStatus}
                        onChange={(v) => setEditStatus((v as TaskStatus) || "created")}
                        data={[
                          { value: "created", label: "Created" },
                          { value: "in_progress", label: "In Progress" },
                          { value: "done", label: "Done" },
                        ]}
                        size="sm"
                        data-test-id="task-status-select"
                      />
                    ) : (
                      <Badge
                        className="tasks-status-badge"
                        variant="light"
                        color={statusColor(task.status)}
                        size="sm"
                        radius="sm"
                      >
                        {statusLabel(task.status)}
                      </Badge>
                    )}
                  </div>

                  <Divider color="var(--app-border)" />

                  <div>
                    <Text size="xs" c="var(--app-subtitle)" mb={6}>Assignee</Text>
                    {isEditing ? (
                      <Select
                        className="todo-input"
                        data-test-id="task-assignee-select"
                        value={editAssigneeId !== null ? String(editAssigneeId) : null}
                        onChange={(v) => setEditAssigneeId(v !== null ? Number(v) : null)}
                        data={[
                          { value: "", label: "Unassigned" },
                          ...spaceMembers.map((m) => ({
                            value: String(m.userId),
                            label: `${m.firstName} ${m.lastName}`,
                          })),
                        ]}
                        size="sm"
                        clearable
                      />
                    ) : task.assigneeUserId ? (
                      <Group gap="xs">
                        <Avatar size="sm" radius="xl" color="violet" variant="light">
                          {initials(task.assigneeFirstName, task.assigneeLastName)}
                        </Avatar>
                        <Text size="sm" c="var(--app-text)">
                          {task.assigneeFirstName} {task.assigneeLastName}
                        </Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="var(--app-subtitle)">Unassigned</Text>
                    )}
                  </div>

                  <Divider color="var(--app-border)" />

                  <div>
                    <Text size="xs" c="var(--app-subtitle)" mb={6}>Due Date</Text>
                    {isEditing ? (
                      <TextInput
                        className="todo-input"
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.currentTarget.value)}
                        size="sm"
                      />
                    ) : (
                      <Group gap={5}>
                        <IconCalendar size={14} color="var(--app-subtitle)" />
                        <Text size="sm" c="var(--app-text)">{formatDate(task.dueDate)}</Text>
                      </Group>
                    )}
                  </div>

                  <Divider color="var(--app-border)" />

                  <div>
                    <Text size="xs" c="var(--app-subtitle)" mb={6}>Space</Text>
                    <Text size="sm" c="var(--app-text)">{task.spaceName}</Text>
                  </div>

                </Stack>
              </Stack>
            </Card>

          </Stack>
        </Grid.Col>
      </Grid>

      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete task"
        centered
      >
        <Text size="sm" c="var(--app-text)" mb="lg">
          Are you sure you want to delete <strong>{task.title}</strong>? This cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="light" color="gray" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(task)}
            data-test-id="delete-task-confirm-button"
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
