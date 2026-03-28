// =============================================================================
// Agent Orchestrator - Task Manager
// Priority queue, dependency resolution, task lifecycle management.
// =============================================================================

import type {
  TaskDefinition,
  TaskStatus,
  TaskOutput,
  Priority,
  ProjectPhase,
  AgentRole,
} from '../contracts/type-definitions.js';
import { StateManager } from './state-manager.js';

// ---------------------------------------------------------------------------
// Priority weights (higher = more urgent)
// ---------------------------------------------------------------------------

const PRIORITY_WEIGHT: Record<Priority, number> = {
  CRITICAL: 40,
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10,
};

// ---------------------------------------------------------------------------
// TaskQueue class - priority queue with dependency resolution
// ---------------------------------------------------------------------------

export class TaskQueue {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  // -------------------------------------------------------------------------
  // Core queue operations
  // -------------------------------------------------------------------------

  /**
   * Get all tasks, sorted by priority (descending) then by creation date.
   */
  getAllTasks(): TaskDefinition[] {
    const queue = this.stateManager.readTaskQueue();
    return this.sortByPriority(queue.tasks);
  }

  /**
   * Get the next batch of executable tasks — those whose dependencies are all
   * satisfied and that are still pending / queued.
   */
  getNextExecutableTasks(limit: number = 5): TaskDefinition[] {
    const ready = this.stateManager.getReadyTasks();
    const sorted = this.sortByPriority(ready);
    return sorted.slice(0, limit);
  }

  /**
   * Get executable tasks filtered by phase.
   */
  getNextExecutableTasksForPhase(phase: ProjectPhase, limit: number = 5): TaskDefinition[] {
    const ready = this.stateManager.getReadyTasks().filter((t) => t.phase === phase);
    return this.sortByPriority(ready).slice(0, limit);
  }

  /**
   * Get executable tasks filtered by assignee role.
   */
  getNextExecutableTasksForAgent(role: AgentRole, limit: number = 3): TaskDefinition[] {
    const ready = this.stateManager.getReadyTasks().filter((t) => t.assignee === role);
    return this.sortByPriority(ready).slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // Task lifecycle
  // -------------------------------------------------------------------------

  /**
   * Add a new task to the queue.
   */
  addTask(task: Omit<TaskDefinition, 'createdAt' | 'retryCount' | 'maxRetries' | 'status'>): TaskDefinition {
    const queue = this.stateManager.readTaskQueue();
    const existing = queue.tasks.find((t) => t.id === task.id);
    if (existing) {
      throw new Error(`Task with id "${task.id}" already exists`);
    }

    const fullTask: TaskDefinition = {
      ...task,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 2,
    };

    queue.tasks.push(fullTask);
    this.stateManager.writeTaskQueue(queue);
    return fullTask;
  }

  /**
   * Transition a task to QUEUED (ready for execution).
   */
  enqueueTask(taskId: string): TaskDefinition | undefined {
    return this.transitionTask(taskId, 'QUEUED');
  }

  /**
   * Mark a task as started (IN_PROGRESS).
   */
  startTask(taskId: string): TaskDefinition | undefined {
    const task = this.stateManager.updateTask(taskId, {
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
    });

    if (task) {
      // Update orchestrator active tasks
      const orcState = this.stateManager.readOrchestratorState();
      if (!orcState.activeTasks.includes(taskId)) {
        orcState.activeTasks.push(taskId);
        this.stateManager.writeOrchestratorState(orcState);
      }
    }

    return task;
  }

  /**
   * Mark a task as completed and record its output.
   */
  completeTask(taskId: string, output: TaskOutput): TaskDefinition | undefined {
    const task = this.stateManager.updateTask(taskId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      output,
    });

    if (task) {
      const orcState = this.stateManager.readOrchestratorState();
      orcState.activeTasks = orcState.activeTasks.filter((id) => id !== taskId);
      if (!orcState.completedTasks.includes(taskId)) {
        orcState.completedTasks.push(taskId);
      }
      this.stateManager.writeOrchestratorState(orcState);

      // Update task queue completed list
      const queue = this.stateManager.readTaskQueue();
      if (!queue.completedTaskIds.includes(taskId)) {
        queue.completedTaskIds.push(taskId);
      }
      this.stateManager.writeTaskQueue(queue);
    }

    return task;
  }

  /**
   * Mark a task as failed. If retries remain, re-queue it.
   */
  failTask(taskId: string, reason: string): TaskDefinition | undefined {
    const queue = this.stateManager.readTaskQueue();
    const task = queue.tasks.find((t) => t.id === taskId);
    if (!task) return undefined;

    task.retryCount += 1;

    if (task.retryCount <= task.maxRetries) {
      // Re-queue for retry
      task.status = 'PENDING';
      task.failureReason = `Retry ${task.retryCount}/${task.maxRetries}: ${reason}`;
    } else {
      // Permanently failed
      task.status = 'FAILED';
      task.failedAt = new Date().toISOString();
      task.failureReason = reason;

      if (!queue.failedTaskIds.includes(taskId)) {
        queue.failedTaskIds.push(taskId);
      }
    }

    this.stateManager.writeTaskQueue(queue);

    // Update orchestrator state
    const orcState = this.stateManager.readOrchestratorState();
    orcState.activeTasks = orcState.activeTasks.filter((id) => id !== taskId);
    if (task.status === 'FAILED' && !orcState.failedTasks.includes(taskId)) {
      orcState.failedTasks.push(taskId);
    }
    this.stateManager.writeOrchestratorState(orcState);

    return task;
  }

  /**
   * Cancel a task.
   */
  cancelTask(taskId: string): TaskDefinition | undefined {
    const task = this.stateManager.updateTask(taskId, {
      status: 'CANCELLED',
    });

    if (task) {
      const orcState = this.stateManager.readOrchestratorState();
      orcState.activeTasks = orcState.activeTasks.filter((id) => id !== taskId);
      this.stateManager.writeOrchestratorState(orcState);
    }

    return task;
  }

  /**
   * Block a task (waiting on unmet dependencies).
   */
  blockTask(taskId: string): TaskDefinition | undefined {
    const task = this.transitionTask(taskId, 'BLOCKED');

    if (task) {
      const orcState = this.stateManager.readOrchestratorState();
      if (!orcState.blockedTasks.includes(taskId)) {
        orcState.blockedTasks.push(taskId);
      }
      this.stateManager.writeOrchestratorState(orcState);
    }

    return task;
  }

  // -------------------------------------------------------------------------
  // Dependency Resolution
  // -------------------------------------------------------------------------

  /**
   * Check if all dependencies for a task are met.
   */
  areDependenciesMet(taskId: string): boolean {
    const queue = this.stateManager.readTaskQueue();
    const task = queue.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    if (task.dependencies.length === 0) return true;

    const completedIds = new Set(queue.completedTaskIds);
    return task.dependencies.every((dep) => completedIds.has(dep));
  }

  /**
   * Get unmet dependencies for a task.
   */
  getUnmetDependencies(taskId: string): string[] {
    const queue = this.stateManager.readTaskQueue();
    const task = queue.tasks.find((t) => t.id === taskId);
    if (!task) return [];

    const completedIds = new Set(queue.completedTaskIds);
    return task.dependencies.filter((dep) => !completedIds.has(dep));
  }

  /**
   * Resolve dependencies after a task completes. Unblocks any tasks that
   * were waiting only on this task.
   */
  resolveDependencies(completedTaskId: string): TaskDefinition[] {
    const queue = this.stateManager.readTaskQueue();
    const unblockedTasks: TaskDefinition[] = [];

    for (const task of queue.tasks) {
      if (task.status !== 'BLOCKED' && task.status !== 'PENDING') continue;
      if (!task.dependencies.includes(completedTaskId)) continue;

      // Check if ALL dependencies are now met
      if (this.areDependenciesMet(task.id)) {
        task.status = 'QUEUED';
        unblockedTasks.push(task);

        // Remove from blocked list in orchestrator state
        const orcState = this.stateManager.readOrchestratorState();
        orcState.blockedTasks = orcState.blockedTasks.filter((id) => id !== task.id);
        this.stateManager.writeOrchestratorState(orcState);
      }
    }

    if (unblockedTasks.length > 0) {
      this.stateManager.writeTaskQueue(queue);
    }

    return unblockedTasks;
  }

  /**
   * Build a full dependency graph.
   * Returns a Map of taskId -> set of taskIds that depend on it.
   */
  buildDependencyGraph(): Map<string, Set<string>> {
    const queue = this.stateManager.readTaskQueue();
    const graph = new Map<string, Set<string>>();

    for (const task of queue.tasks) {
      if (!graph.has(task.id)) {
        graph.set(task.id, new Set());
      }
      for (const dep of task.dependencies) {
        if (!graph.has(dep)) {
          graph.set(dep, new Set());
        }
        graph.get(dep)!.add(task.id);
      }
    }

    return graph;
  }

  /**
   * Detect circular dependencies. Returns an array of cycle paths, or an
   * empty array if there are none.
   */
  detectCircularDependencies(): string[][] {
    const queue = this.stateManager.readTaskQueue();
    const taskMap = new Map(queue.tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (taskId: string, path: string[]): void => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return;

      for (const dep of task.dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, [...path, dep]);
        } else if (recursionStack.has(dep)) {
          const cycleStart = path.indexOf(dep);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          } else {
            cycles.push([...path, dep]);
          }
        }
      }

      recursionStack.delete(taskId);
    };

    for (const task of queue.tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id, [task.id]);
      }
    }

    return cycles;
  }

  // -------------------------------------------------------------------------
  // Query helpers
  // -------------------------------------------------------------------------

  getTasksByStatus(status: TaskStatus): TaskDefinition[] {
    const queue = this.stateManager.readTaskQueue();
    return queue.tasks.filter((t) => t.status === status);
  }

  getTasksByPhase(phase: ProjectPhase): TaskDefinition[] {
    const queue = this.stateManager.readTaskQueue();
    return queue.tasks.filter((t) => t.phase === phase);
  }

  getTasksByAssignee(role: AgentRole): TaskDefinition[] {
    const queue = this.stateManager.readTaskQueue();
    return queue.tasks.filter((t) => t.assignee === role);
  }

  getTaskStats(): {
    total: number;
    pending: number;
    queued: number;
    inProgress: number;
    blocked: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const queue = this.stateManager.readTaskQueue();
    return {
      total: queue.tasks.length,
      pending: queue.tasks.filter((t) => t.status === 'PENDING').length,
      queued: queue.tasks.filter((t) => t.status === 'QUEUED').length,
      inProgress: queue.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      blocked: queue.tasks.filter((t) => t.status === 'BLOCKED').length,
      completed: queue.tasks.filter((t) => t.status === 'COMPLETED').length,
      failed: queue.tasks.filter((t) => t.status === 'FAILED').length,
      cancelled: queue.tasks.filter((t) => t.status === 'CANCELLED').length,
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private sortByPriority(tasks: TaskDefinition[]): TaskDefinition[] {
    return [...tasks].sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  private transitionTask(taskId: string, newStatus: TaskStatus): TaskDefinition | undefined {
    return this.stateManager.updateTask(taskId, { status: newStatus });
  }
}

export default TaskQueue;
