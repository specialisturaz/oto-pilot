"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatDate, formatRelativeDate } from "@/lib/utils";

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
  PENDING: "Bekliyor",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
};

const statusIcons: Record<string, any> = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED: CheckCircle2,
  CANCELLED: AlertCircle,
};

export default function GorevlerPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "MEDIUM", type: "OTHER", due_date: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await api.get(`/api/v1/tasks/my-tasks?${params}`);
      return res.data?.data || res.data;
    },
  });

  const tasks = Array.isArray(data) ? data : data?.data || [];

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.patch(`/api/v1/tasks/${taskId}/complete`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const createMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      await api.post("/api/v1/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowNewForm(false);
      setNewTask({ title: "", description: "", priority: "MEDIUM", type: "OTHER", due_date: "" });
    },
  });

  const pendingCount = tasks.filter((t: any) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
  const completedCount = tasks.filter((t: any) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gorevler</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} bekleyen, {completedCount} tamamlanmis gorev
          </p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Gorev
        </Button>
      </div>

      {/* New Task Form */}
      {showNewForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Input
              placeholder="Gorev basligi"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <Input
              placeholder="Aciklama (opsiyonel)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="flex gap-3">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <option value="LOW">Dusuk</option>
                <option value="MEDIUM">Normal</option>
                <option value="HIGH">Yuksek</option>
                <option value="URGENT">Acil</option>
              </select>
              <Input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(newTask)} disabled={!newTask.title || createMutation.isPending}>
                {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Iptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "Tumunu Goster" },
          { value: "PENDING", label: "Bekleyen" },
          { value: "IN_PROGRESS", label: "Devam Eden" },
          { value: "COMPLETED", label: "Tamamlanan" },
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

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Gorev bulunamadi</p>
            <p className="text-sm text-muted-foreground mt-1">Yeni bir gorev ekleyerek baslayabilirsiniz</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => {
            const StatusIcon = statusIcons[task.status] || Clock;
            const isCompleted = task.status === "COMPLETED";

            return (
              <Card key={task.id} className={isCompleted ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => !isCompleted && completeMutation.mutate(task.id)}
                        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                          isCompleted
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-muted-foreground hover:border-green-500 hover:bg-green-50"
                        }`}
                        disabled={isCompleted}
                      >
                        {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                          {task.assignedTo && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assignedTo.firstName} {task.assignedTo.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[task.priority] || "bg-gray-400"}>
                        {priorityLabels[task.priority] || task.priority}
                      </Badge>
                      <Badge variant="outline">
                        {statusLabels[task.status] || task.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
