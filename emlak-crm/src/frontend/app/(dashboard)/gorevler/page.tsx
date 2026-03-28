"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  Filter,
  List,
  LayoutGrid,
  Search,
  Paperclip,
  MessageSquare,
  MoreVertical,
  X,
  Upload,
  Trash2,
  Download,
  Edit3,
  Eye,
  AlertTriangle,
  FileText,
  Phone,
  Building2,
  Handshake,
  UserPlus,
  XCircle,
  ChevronDown,
  BarChart3,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatDate, formatDateTime, formatRelativeDate, cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-500 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-gray-400 text-white",
};

const priorityLabels: Record<string, string> = {
  URGENT: "Acil",
  HIGH: "Yuksek",
  MEDIUM: "Normal",
  LOW: "Dusuk",
};

const statusLabels: Record<string, string> = {
  TODO: "Bekliyor",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
};

const statusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-700 border-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-300",
  COMPLETED: "bg-green-100 text-green-700 border-green-300",
  CANCELLED: "bg-red-100 text-red-700 border-red-300",
};

const typeLabels: Record<string, string> = {
  CALL: "Arama",
  MEETING: "Toplanti",
  SHOWING: "Gosterim",
  FOLLOWUP: "Takip",
  DOCUMENT: "Belge",
  INSPECTION: "Denetim",
  CONTRACT: "Sozlesme",
  PAYMENT: "Odeme",
  OTHER: "Diger",
};

const typeIcons: Record<string, typeof Phone> = {
  CALL: Phone,
  MEETING: User,
  SHOWING: Building2,
  FOLLOWUP: Clock,
  DOCUMENT: FileText,
  INSPECTION: Eye,
  CONTRACT: Handshake,
  PAYMENT: BarChart3,
  OTHER: CheckSquare,
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TaskUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  email?: string;
}

interface TaskContact {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

interface TaskProperty {
  id: string;
  title: string;
  price?: number;
}

interface TaskDeal {
  id: string;
  type: string;
  stage: string;
  agreedPrice?: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: TaskUser | null;
  createdBy: TaskUser | null;
  contact: TaskContact | null;
  property: TaskProperty | null;
  deal: TaskDeal | null;
}

interface TaskComment {
  id: string;
  description: string;
  createdAt: string;
  user: TaskUser;
}

interface TaskAttachment {
  id: string;
  description: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

interface TaskFormData {
  title: string;
  description: string;
  priority: string;
  type: string;
  status: string;
  due_date: string;
  assigned_to_id: string;
  contact_id: string;
  property_id: string;
}

interface TaskStats {
  totalTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  completedThisWeek: number;
}

// ─── Helper functions ───────────────────────────────────────────────────────

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

function isDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;
  const today = new Date().toDateString();
  return new Date(task.dueDate).toDateString() === today;
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toLocaleUpperCase("tr-TR");
}

function emptyFormData(): TaskFormData {
  return {
    title: "",
    description: "",
    priority: "MEDIUM",
    type: "OTHER",
    status: "TODO",
    due_date: "",
    assigned_to_id: "",
    contact_id: "",
    property_id: "",
  };
}

function parseAttachmentMeta(desc: string): { fileName: string; fileUrl: string; fileSize: number; mimeType: string } {
  try {
    return JSON.parse(desc);
  } catch {
    return { fileName: "Dosya", fileUrl: "", fileSize: 0, mimeType: "" };
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function GorevlerPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // ── View / Filter state ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Dialog state ───────────────────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createForm, setCreateForm] = useState<TaskFormData>(emptyFormData());
  const [editForm, setEditForm] = useState<TaskFormData>(emptyFormData());
  const [completionNote, setCompletionNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [commentText, setCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data Queries ───────────────────────────────────────────────────────

  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "200");
      params.set("sortBy", "dueDate");
      params.set("sortOrder", "asc");
      const res = await api.get(`/api/v1/tasks?${params}`);
      return res.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["tasks", "stats"],
    queryFn: async () => {
      const res = await api.get("/api/v1/tasks/stats");
      return res.data?.data as TaskStats;
    },
  });

  const { data: agentsData } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/agents");
      return (res.data?.data || []) as TaskUser[];
    },
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts", "list-short"],
    queryFn: async () => {
      const res = await api.get("/api/v1/contacts?limit=100");
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
  });

  const { data: propertiesData } = useQuery({
    queryKey: ["properties", "list-short"],
    queryFn: async () => {
      const res = await api.get("/api/v1/properties?limit=100");
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
  });

  // Task detail queries (comments & attachments)
  const { data: commentsData } = useQuery({
    queryKey: ["tasks", selectedTask?.id, "comments"],
    queryFn: async () => {
      if (!selectedTask) return [];
      const res = await api.get(`/api/v1/tasks/${selectedTask.id}/comments`);
      return (res.data?.data || []) as TaskComment[];
    },
    enabled: !!selectedTask && showDetailDialog,
  });

  const { data: attachmentsData } = useQuery({
    queryKey: ["tasks", selectedTask?.id, "attachments"],
    queryFn: async () => {
      if (!selectedTask) return [];
      const res = await api.get(`/api/v1/tasks/${selectedTask.id}/attachments`);
      return (res.data?.data || []) as TaskAttachment[];
    },
    enabled: !!selectedTask && showDetailDialog,
  });

  // ── Derived data ───────────────────────────────────────────────────────

  const allTasks: Task[] = useMemo(() => {
    const raw = tasksResponse?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [tasksResponse]);

  const agents: TaskUser[] = agentsData || [];
  const contacts: Array<{ id: string; firstName: string; lastName: string }> = contactsData || [];
  const properties: Array<{ id: string; title: string }> = propertiesData || [];

  const stats: TaskStats = statsData || { totalTasks: 0, overdueTasks: 0, dueTodayTasks: 0, completedThisWeek: 0 };

  const filteredTasks = useMemo(() => {
    let result = [...allTasks];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLocaleLowerCase("tr-TR");
      result = result.filter(
        (t) =>
          t.title.toLocaleLowerCase("tr-TR").includes(q) ||
          (t.description || "").toLocaleLowerCase("tr-TR").includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Assignee filter
    if (assigneeFilter !== "all") {
      result = result.filter((t) => t.assignedTo?.id === assigneeFilter);
    }

    // Only mine toggle
    if (onlyMine && currentUser) {
      result = result.filter((t) => t.assignedTo?.id === currentUser.id);
    }

    // Sort: overdue first, then by due date
    result.sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Completed/cancelled to end
      const aActive = a.status !== "COMPLETED" && a.status !== "CANCELLED";
      const bActive = b.status !== "COMPLETED" && b.status !== "CANCELLED";
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // By due date
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return 0;
    });

    return result;
  }, [allTasks, searchQuery, statusFilter, priorityFilter, typeFilter, assigneeFilter, onlyMine, currentUser]);

  // Board columns
  const boardColumns = useMemo(() => {
    const cols = {
      TODO: filteredTasks.filter((t) => t.status === "TODO"),
      IN_PROGRESS: filteredTasks.filter((t) => t.status === "IN_PROGRESS"),
      COMPLETED: filteredTasks.filter((t) => t.status === "COMPLETED"),
    };
    return cols;
  }, [filteredTasks]);

  // ── Mutations ──────────────────────────────────────────────────────────

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (formData: TaskFormData) => {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        type: formData.type,
        status: formData.status || "TODO",
      };
      if (formData.due_date) {
        payload.due_date = new Date(formData.due_date).toISOString();
      }
      if (formData.assigned_to_id) {
        payload.assigned_to_id = formData.assigned_to_id;
      }
      if (formData.contact_id) {
        payload.contact_id = formData.contact_id;
      }
      if (formData.property_id) {
        payload.property_id = formData.property_id;
      }
      await api.post("/api/v1/tasks", payload);
    },
    onSuccess: () => {
      invalidateTasks();
      setShowCreateDialog(false);
      setCreateForm(emptyFormData());
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<TaskFormData> }) => {
      const payload: Record<string, unknown> = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description || null;
      if (data.priority !== undefined) payload.priority = data.priority;
      if (data.type !== undefined) payload.type = data.type;
      if (data.status !== undefined) payload.status = data.status;
      if (data.due_date !== undefined) {
        payload.due_date = data.due_date ? new Date(data.due_date).toISOString() : null;
      }
      if (data.assigned_to_id !== undefined) {
        payload.assigned_to_id = data.assigned_to_id || null;
      }
      if (data.contact_id !== undefined) {
        payload.contact_id = data.contact_id || null;
      }
      if (data.property_id !== undefined) {
        payload.property_id = data.property_id || null;
      }
      await api.put(`/api/v1/tasks/${taskId}`, payload);
    },
    onSuccess: () => {
      invalidateTasks();
      setShowEditDialog(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      await api.patch(`/api/v1/tasks/${taskId}/complete`, { notes });
    },
    onSuccess: () => {
      invalidateTasks();
      setShowCompleteDialog(false);
      setCompletionNote("");
      // Also refresh the detail if open
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedTask.id, "comments"] });
      }
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      await api.patch(`/api/v1/tasks/${taskId}/assign`, { assigned_to_id: userId });
    },
    onSuccess: () => invalidateTasks(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/api/v1/tasks/${taskId}`);
    },
    onSuccess: () => {
      invalidateTasks();
      setShowDetailDialog(false);
      setSelectedTask(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      await api.put(`/api/v1/tasks/${taskId}`, { status: "CANCELLED", description: reason ? `[Iptal nedeni: ${reason}]` : undefined });
    },
    onSuccess: () => {
      invalidateTasks();
      setShowCancelDialog(false);
      setCancelReason("");
      setShowDetailDialog(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      await api.post(`/api/v1/tasks/${taskId}/comments`, { content });
    },
    onSuccess: () => {
      setCommentText("");
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedTask.id, "comments"] });
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/api/v1/tasks/${taskId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedTask.id, "attachments"] });
      }
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) => {
      await api.delete(`/api/v1/tasks/${taskId}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedTask.id, "attachments"] });
      }
    },
  });

  // ── Event handlers ─────────────────────────────────────────────────────

  const openDetail = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      type: task.type,
      status: task.status,
      due_date: task.dueDate ? task.dueDate.split("T")[0] : "",
      assigned_to_id: task.assignedTo?.id || "",
      contact_id: task.contact?.id || "",
      property_id: task.property?.id || "",
    });
    setSelectedTask(task);
    setShowEditDialog(true);
  }, []);

  const openComplete = useCallback((task: Task) => {
    setSelectedTask(task);
    setCompletionNote("");
    setShowCompleteDialog(true);
  }, []);

  const openCancel = useCallback((task: Task) => {
    setSelectedTask(task);
    setCancelReason("");
    setShowCancelDialog(true);
  }, []);

  const handleAssignToMe = useCallback(
    (task: Task) => {
      if (currentUser) {
        assignMutation.mutate({ taskId: task.id, userId: currentUser.id });
      }
    },
    [currentUser, assignMutation]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && selectedTask) {
        uploadMutation.mutate({ taskId: selectedTask.id, file });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [selectedTask, uploadMutation]
  );

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderTaskCard = (task: Task, compact?: boolean) => {
    const isCompleted = task.status === "COMPLETED";
    const isCancelled = task.status === "CANCELLED";
    const overdue = isOverdue(task);
    const dueToday = isDueToday(task);
    const TypeIcon = typeIcons[task.type] || CheckSquare;

    return (
      <Card
        key={task.id}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isCompleted && "opacity-60",
          isCancelled && "opacity-40",
          overdue && "border-red-300 bg-red-50/30",
          dueToday && !overdue && "border-orange-300 bg-orange-50/30"
        )}
        onClick={() => openDetail(task)}
      >
        <CardContent className={compact ? "py-3 px-4" : "py-4"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Complete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCompleted && !isCancelled) openComplete(task);
                }}
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "border-green-500 bg-green-500 text-white"
                    : isCancelled
                    ? "border-gray-300 bg-gray-200"
                    : "border-muted-foreground hover:border-green-500 hover:bg-green-50"
                )}
                disabled={isCompleted || isCancelled}
                aria-label={isCompleted ? "Tamamlandi" : "Tamamla"}
              >
                {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                {isCancelled && <X className="h-3 w-3 text-gray-500" />}
              </button>

              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p
                    className={cn(
                      "font-medium truncate",
                      isCompleted && "line-through text-muted-foreground",
                      isCancelled && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                </div>

                {/* Description */}
                {task.description && !compact && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {/* Overdue badge */}
                  {overdue && (
                    <span className="flex items-center gap-1 text-red-600 font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      Gecikmi!
                    </span>
                  )}

                  {/* Due today badge */}
                  {dueToday && !overdue && (
                    <span className="flex items-center gap-1 text-orange-600 font-semibold">
                      <Clock className="h-3 w-3" />
                      Bugun
                    </span>
                  )}

                  {/* Due date */}
                  {task.dueDate && (
                    <span className={cn("flex items-center gap-1", overdue && "text-red-500")}>
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}

                  {/* Completed at */}
                  {isCompleted && task.completedAt && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {formatDateTime(task.completedAt)}
                    </span>
                  )}

                  {/* Assigned user */}
                  {task.assignedTo && (
                    <span className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        {task.assignedTo.avatarUrl ? (
                          <AvatarImage src={task.assignedTo.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[8px]">
                          {getInitials(task.assignedTo.firstName, task.assignedTo.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </span>
                  )}

                  {/* Related contact */}
                  {task.contact && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.contact.firstName} {task.contact.lastName}
                    </span>
                  )}

                  {/* Related property */}
                  {task.property && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {task.property.title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: badges + actions */}
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Badge className={cn("text-xs", priorityColors[task.priority] || "bg-gray-400")}>
                {priorityLabels[task.priority] || task.priority}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", statusColors[task.status])}>
                {statusLabels[task.status] || task.status}
              </Badge>

              {/* Quick actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Islemler</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openDetail(task)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Detay
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(task)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Duzenle
                  </DropdownMenuItem>
                  {!isCompleted && !isCancelled && (
                    <>
                      <DropdownMenuItem onClick={() => openComplete(task)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Tamamla
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAssignToMe(task)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Bana Ata
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  {!isCancelled && !isCompleted && (
                    <DropdownMenuItem onClick={() => openCancel(task)} className="text-orange-600">
                      <XCircle className="mr-2 h-4 w-4" />
                      Iptal Et
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate(task.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Stats Bar ──────────────────────────────────────────────────────────

  const renderStatsBar = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTasks}</p>
              <p className="text-xs text-muted-foreground">Aktif Gorev</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={stats.overdueTasks > 0 ? "border-red-200 bg-red-50/50" : ""}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Geciken</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={stats.dueTodayTasks > 0 ? "border-orange-200 bg-orange-50/50" : ""}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.dueTodayTasks}</p>
              <p className="text-xs text-muted-foreground">Bugun Biten</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completedThisWeek}</p>
              <p className="text-xs text-muted-foreground">Bu Hafta Biten</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Board View ─────────────────────────────────────────────────────────

  const renderBoardView = () => {
    const columns: Array<{ key: string; label: string; color: string }> = [
      { key: "TODO", label: "Bekliyor", color: "border-t-gray-400" },
      { key: "IN_PROGRESS", label: "Devam Ediyor", color: "border-t-blue-500" },
      { key: "COMPLETED", label: "Tamamlandi", color: "border-t-green-500" },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const tasks = boardColumns[col.key as keyof typeof boardColumns] || [];
          return (
            <div key={col.key} className={cn("rounded-lg border-t-4 bg-muted/30 p-3", col.color)}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {tasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Bu durumda gorev yok
                  </p>
                ) : (
                  tasks.map((task) => renderTaskCard(task, true))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── List View ──────────────────────────────────────────────────────────

  const renderListView = () => {
    if (filteredTasks.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Gorev bulunamadi</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "Filtre kriterlerinize uygun gorev yok. Filtreleri degistirmeyi deneyin."
                : "Yeni bir gorev ekleyerek baslayabilirsiniz."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ilk Gorevi Olustur
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return <div className="space-y-2">{filteredTasks.map((task) => renderTaskCard(task))}</div>;
  };

  // ── Loading skeleton ───────────────────────────────────────────────────

  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ── Create Task Dialog ─────────────────────────────────────────────────

  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Gorev Olustur</DialogTitle>
          <DialogDescription>Gorev bilgilerini doldurun ve kaydedin.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1 block">Baslik *</label>
            <Input
              placeholder="Gorev basligi"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">Aciklama</label>
            <Textarea
              placeholder="Gorev aciklamasi (opsiyonel)"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Row: Assign + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Atanan Kisi</label>
              <Select
                value={createForm.assigned_to_id || "__none__"}
                onValueChange={(v) => setCreateForm({ ...createForm, assigned_to_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kisi secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Secilmedi (Bana atansin)</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Oncelik</label>
              <Select
                value={createForm.priority}
                onValueChange={(v) => setCreateForm({ ...createForm, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">Acil</SelectItem>
                  <SelectItem value="HIGH">Yuksek</SelectItem>
                  <SelectItem value="MEDIUM">Normal</SelectItem>
                  <SelectItem value="LOW">Dusuk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Type + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Gorev Tipi</label>
              <Select
                value={createForm.type}
                onValueChange={(v) => setCreateForm({ ...createForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bitis Tarihi</label>
              <Input
                type="date"
                value={createForm.due_date}
                onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Row: Contact + Property */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Ilgili Musteri</label>
              <Select
                value={createForm.contact_id || "__none__"}
                onValueChange={(v) => setCreateForm({ ...createForm, contact_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Musteri secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Secilmedi</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ilgili Ilan</label>
              <Select
                value={createForm.property_id || "__none__"}
                onValueChange={(v) => setCreateForm({ ...createForm, property_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ilan secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Secilmedi</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
            Iptal
          </Button>
          <Button
            onClick={() => createMutation.mutate(createForm)}
            disabled={!createForm.title.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Edit Task Dialog ───────────────────────────────────────────────────

  const renderEditDialog = () => (
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gorevi Duzenle</DialogTitle>
          <DialogDescription>Gorev bilgilerini guncelleyin.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Baslik *</label>
            <Input
              placeholder="Gorev basligi"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Aciklama</label>
            <Textarea
              placeholder="Gorev aciklamasi"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Durum</label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Oncelik</label>
              <Select
                value={editForm.priority}
                onValueChange={(v) => setEditForm({ ...editForm, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">Acil</SelectItem>
                  <SelectItem value="HIGH">Yuksek</SelectItem>
                  <SelectItem value="MEDIUM">Normal</SelectItem>
                  <SelectItem value="LOW">Dusuk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tip</label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm({ ...editForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Atanan Kisi</label>
              <Select
                value={editForm.assigned_to_id || "__none__"}
                onValueChange={(v) => setEditForm({ ...editForm, assigned_to_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kisi secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Secilmedi</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bitis Tarihi</label>
              <Input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Ilgili Musteri</label>
              <Select
                value={editForm.contact_id || "__none__"}
                onValueChange={(v) => setEditForm({ ...editForm, contact_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Musteri secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Secilmedi</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ilgili Ilan</label>
              <Select
                value={editForm.property_id || "__none__"}
                onValueChange={(v) => setEditForm({ ...editForm, property_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ilan secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Secilmedi</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEditDialog(false)}>
            Iptal
          </Button>
          <Button
            onClick={() => {
              if (selectedTask) {
                updateMutation.mutate({ taskId: selectedTask.id, data: editForm });
              }
            }}
            disabled={!editForm.title.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Kaydediliyor..." : "Guncelle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Complete Confirmation Dialog ───────────────────────────────────────

  const renderCompleteDialog = () => (
    <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gorevi Tamamla</DialogTitle>
          <DialogDescription>
            &ldquo;{selectedTask?.title}&rdquo; gorevini tamamlamak istediginize emin misiniz?
          </DialogDescription>
        </DialogHeader>

        <div>
          <label className="text-sm font-medium mb-1 block">Tamamlanma Notu (opsiyonel)</label>
          <Textarea
            placeholder="Tamamlanma ile ilgili not ekleyin..."
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
            Vazgec
          </Button>
          <Button
            onClick={() => {
              if (selectedTask) {
                completeMutation.mutate({ taskId: selectedTask.id, notes: completionNote || undefined });
              }
            }}
            disabled={completeMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {completeMutation.isPending ? "Tamamlaniyor..." : "Tamamla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Cancel Dialog ──────────────────────────────────────────────────────

  const renderCancelDialog = () => (
    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gorevi Iptal Et</DialogTitle>
          <DialogDescription>
            &ldquo;{selectedTask?.title}&rdquo; gorevini iptal etmek istediginize emin misiniz?
          </DialogDescription>
        </DialogHeader>

        <div>
          <label className="text-sm font-medium mb-1 block">Iptal Nedeni (opsiyonel)</label>
          <Textarea
            placeholder="Iptal nedeni..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
            Vazgec
          </Button>
          <Button
            onClick={() => {
              if (selectedTask) {
                cancelMutation.mutate({ taskId: selectedTask.id, reason: cancelReason });
              }
            }}
            disabled={cancelMutation.isPending}
            variant="destructive"
          >
            {cancelMutation.isPending ? "Iptal ediliyor..." : "Iptal Et"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Detail Panel Dialog ────────────────────────────────────────────────

  const renderDetailDialog = () => {
    if (!selectedTask) return null;

    const task = selectedTask;
    const isCompleted = task.status === "COMPLETED";
    const isCancelled = task.status === "CANCELLED";
    const overdue = isOverdue(task);
    const comments: TaskComment[] = commentsData || [];
    const attachments: TaskAttachment[] = attachmentsData || [];
    const TypeIcon = typeIcons[task.type] || CheckSquare;

    return (
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="flex items-center gap-2">
                <TypeIcon className="h-5 w-5 text-muted-foreground" />
                <DialogTitle className={cn(isCompleted && "line-through text-muted-foreground")}>
                  {task.title}
                </DialogTitle>
              </div>
              <div className="flex gap-2 shrink-0">
                <Badge className={cn("text-xs", priorityColors[task.priority])}>
                  {priorityLabels[task.priority]}
                </Badge>
                <Badge variant="outline" className={cn("text-xs", statusColors[task.status])}>
                  {statusLabels[task.status]}
                </Badge>
                {overdue && (
                  <Badge className="bg-red-600 text-white text-xs">Gecikmi!</Badge>
                )}
              </div>
            </div>
            <DialogDescription className="sr-only">Gorev detaylari</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detaylar</TabsTrigger>
              <TabsTrigger value="comments">
                Yorumlar ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="attachments">
                Dosyalar ({attachments.length})
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Description */}
              {task.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Aciklama</h4>
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tip</h4>
                  <p className="text-sm">{typeLabels[task.type] || task.type}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Durum</h4>
                  <Badge variant="outline" className={cn("text-xs", statusColors[task.status])}>
                    {statusLabels[task.status]}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Oncelik</h4>
                  <Badge className={cn("text-xs", priorityColors[task.priority])}>
                    {priorityLabels[task.priority]}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Bitis Tarihi</h4>
                  <p className={cn("text-sm", overdue && "text-red-600 font-semibold")}>
                    {task.dueDate ? formatDate(task.dueDate) : "Belirtilmemis"}
                  </p>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Atanan Kisi</h4>
                {task.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {task.assignedTo.avatarUrl ? (
                        <AvatarImage src={task.assignedTo.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(task.assignedTo.firstName, task.assignedTo.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Atanmamis</p>
                )}
              </div>

              {/* Created by */}
              {task.createdBy && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Olusturan</h4>
                  <p className="text-sm">
                    {task.createdBy.firstName} {task.createdBy.lastName}
                  </p>
                </div>
              )}

              {/* Completion info */}
              {isCompleted && task.completedAt && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Tamamlandi: {formatDateTime(task.completedAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* Related items */}
              <div className="space-y-2">
                {task.contact && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Ilgili Musteri</h4>
                    <Link
                      href={`/musteriler/${task.contact.id}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <User className="h-3 w-3" />
                      {task.contact.firstName} {task.contact.lastName}
                      {task.contact.phone && ` - ${task.contact.phone}`}
                    </Link>
                  </div>
                )}

                {task.property && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Ilgili Ilan</h4>
                    <Link
                      href={`/ilanlar/${task.property.id}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Building2 className="h-3 w-3" />
                      {task.property.title}
                    </Link>
                  </div>
                )}

                {task.deal && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Ilgili Anlasma</h4>
                    <span className="text-sm flex items-center gap-1">
                      <Handshake className="h-3 w-3" />
                      {task.deal.type === "SALE" ? "Satis" : "Kiralama"} - {task.deal.stage}
                    </span>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                <p>Olusturulma: {formatDateTime(task.createdAt)}</p>
                <p>Son guncelleme: {formatDateTime(task.updatedAt)}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setShowDetailDialog(false); openEdit(task); }}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Duzenle
                </Button>
                {!isCompleted && !isCancelled && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setShowDetailDialog(false); openComplete(task); }}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Tamamla
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAssignToMe(task)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Bana Ata
                    </Button>
                    <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" onClick={() => { setShowDetailDialog(false); openCancel(task); }}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Iptal Et
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4 mt-4">
              {/* Add comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Yorum ekleyin..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (commentText.trim() && selectedTask) {
                      commentMutation.mutate({ taskId: selectedTask.id, content: commentText.trim() });
                    }
                  }}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  size="sm"
                  className="self-end"
                >
                  <MessageSquare className="mr-1 h-4 w-4" />
                  {commentMutation.isPending ? "..." : "Gonder"}
                </Button>
              </div>

              {/* Comments list */}
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Henuz yorum yok. Ilk yorumu siz ekleyin.
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px]">
                            {getInitials(comment.user.firstName, comment.user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {comment.user.firstName} {comment.user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap ml-7">{comment.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="space-y-4 mt-4">
              {/* Upload button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadMutation.isPending ? "Yukleniyor..." : "Dosya Yukle"}
                </Button>
              </div>

              {/* Attachments list */}
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Henuz ek dosya yok. Dosya yukleyerek baslayabilirsiniz.
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => {
                    const meta = parseAttachmentMeta(att.description);
                    return (
                      <div key={att.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{meta.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(meta.fileSize)} - {att.user.firstName} {att.user.lastName} - {formatRelativeDate(att.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {meta.fileUrl && (
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${meta.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Indir</span>
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500"
                            onClick={() => {
                              if (selectedTask) {
                                deleteAttachmentMutation.mutate({ taskId: selectedTask.id, attachmentId: att.id });
                              }
                            }}
                            disabled={deleteAttachmentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Sil</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Main Render ────────────────────────────────────────────────────────

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gorevler</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {allTasks.length} gorev, {filteredTasks.length} gorunen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Gorev
          </Button>
          <Link href="/takvim">
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Takvim
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      {renderStatsBar()}

      {/* Search + View Toggle + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Gorev ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="h-4 w-4 mr-1" />
              Liste
            </Button>
            <Button
              variant={viewMode === "board" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("board")}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Pano
            </Button>
          </div>

          {/* Filter toggle */}
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-10"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtreler
          </Button>

          {/* Only mine toggle */}
          <Button
            variant={onlyMine ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyMine(!onlyMine)}
            className="h-10"
          >
            <User className="h-4 w-4 mr-1" />
            Sadece Benim
          </Button>
        </div>

        {/* Status quick filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Tumu" },
            { value: "TODO", label: "Bekleyen" },
            { value: "IN_PROGRESS", label: "Devam Eden" },
            { value: "COMPLETED", label: "Tamamlanan" },
            { value: "CANCELLED", label: "Iptal" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Extended filters */}
        {showFilters && (
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Oncelik</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Oncelikler</SelectItem>
                      <SelectItem value="URGENT">Acil</SelectItem>
                      <SelectItem value="HIGH">Yuksek</SelectItem>
                      <SelectItem value="MEDIUM">Normal</SelectItem>
                      <SelectItem value="LOW">Dusuk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Gorev Tipi</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Tipler</SelectItem>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Atanan Kisi</label>
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Kisiler</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.firstName} {a.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Clear filters */}
              {(priorityFilter !== "all" || typeFilter !== "all" || assigneeFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => {
                    setPriorityFilter("all");
                    setTypeFilter("all");
                    setAssigneeFilter("all");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Filtreleri Temizle
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Content */}
      {viewMode === "list" ? renderListView() : renderBoardView()}

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderEditDialog()}
      {renderCompleteDialog()}
      {renderCancelDialog()}
      {renderDetailDialog()}
    </div>
  );
}
