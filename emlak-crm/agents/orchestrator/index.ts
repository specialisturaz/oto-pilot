// =============================================================================
// Agent Orchestrator - Main Entry Point
// Reads project state, manages the task queue, dispatches to sub-agents,
// tracks phase transitions, and reports progress.
//
// Usage:  npx tsx agents/orchestrator/index.ts
// =============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { StateManager } from './state-manager.js';
import { TaskQueue } from './task-manager.js';
import type {
  ProjectPhase,
  AgentRole,
  TaskDefinition,
  AgentMessage,
  ProgressReport,
  OrchestratorState,
  TaskOutput,
} from '../contracts/type-definitions.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICK_INTERVAL_MS = 5_000; // Main loop interval
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_CONCURRENT_TASKS = 5;
const LOGS_DIR = path.resolve(import.meta.dirname, '..', 'logs');

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(entry);
  const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m';
  console.log(`${color}[${entry.timestamp}] [${level}]\x1b[0m ${message}`);

  // Also append to file
  ensureDir(LOGS_DIR);
  const logFile = path.join(LOGS_DIR, `orchestrator-${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFileSync(logFile, line + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class Orchestrator {
  private stateManager: StateManager;
  private taskQueue: TaskQueue;
  private running: boolean = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.stateManager = new StateManager();
    this.taskQueue = new TaskQueue(this.stateManager);
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start the orchestrator loop.
   */
  async start(): Promise<void> {
    log('INFO', '========================================');
    log('INFO', 'Emlak CRM - Agent Orchestrator Starting');
    log('INFO', '========================================');

    this.ensureInitialState();
    this.running = true;

    // Mark orchestrator as running
    this.stateManager.updateOrchestratorState({
      isRunning: true,
      startedAt: new Date().toISOString(),
    });

    log('INFO', 'Initial state verified. Starting main loop.');
    this.printProgressReport();

    // Main tick loop
    this.tickTimer = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);

    // Heartbeat for progress recalculation
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Run first tick immediately
    this.tick();

    // Graceful shutdown
    process.on('SIGINT', () => this.stop('SIGINT received'));
    process.on('SIGTERM', () => this.stop('SIGTERM received'));

    log('INFO', `Main loop running (tick every ${TICK_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop the orchestrator gracefully.
   */
  stop(reason: string = 'Manual stop'): void {
    log('INFO', `Stopping orchestrator: ${reason}`);
    this.running = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.stateManager.updateOrchestratorState({ isRunning: false });
    log('INFO', 'Orchestrator stopped.');
    process.exit(0);
  }

  // -----------------------------------------------------------------------
  // Main loop
  // -----------------------------------------------------------------------

  /**
   * Single tick of the orchestrator loop.
   */
  private tick(): void {
    if (!this.running) return;

    try {
      const orcState = this.stateManager.readOrchestratorState();
      const currentPhase = orcState.currentPhase;

      // 1. Check for phase transition
      const newPhase = this.stateManager.tryAdvancePhase();
      if (newPhase) {
        log('INFO', `Phase transition: ${currentPhase} -> ${newPhase}`, {
          from: currentPhase,
          to: newPhase,
        });
        this.broadcastMessage({
          type: 'PHASE_CHANGE',
          subject: `Phase changed to ${newPhase}`,
          body: `The project has transitioned from ${currentPhase} to ${newPhase}.`,
          priority: 'HIGH',
        });

        if (newPhase === 'COMPLETE') {
          log('INFO', 'PROJECT COMPLETE! All phases finished.');
          this.stop('Project complete');
          return;
        }
      }

      // 2. Resolve dependencies for any blocked/pending tasks
      this.resolveBlockedTasks();

      // 3. Dispatch ready tasks (up to concurrency limit)
      this.dispatchTasks();

      // 4. Check for stalled tasks
      this.checkStalledTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log('ERROR', `Tick error: ${message}`, {
        stack: err instanceof Error ? err.stack : undefined,
      });

      const orcState = this.stateManager.readOrchestratorState();
      orcState.errors.push({
        timestamp: new Date().toISOString(),
        message,
        stack: err instanceof Error ? err.stack : undefined,
        resolved: false,
      });
      this.stateManager.writeOrchestratorState(orcState);
    }
  }

  /**
   * Periodic heartbeat: recalculate progress, log status.
   */
  private heartbeat(): void {
    if (!this.running) return;

    const progress = this.stateManager.recalculateProgress();
    const stats = this.taskQueue.getTaskStats();

    log('INFO', `Heartbeat | Progress: ${progress.total}% | Active: ${stats.inProgress} | Queued: ${stats.queued} | Completed: ${stats.completed}/${stats.total}`);
  }

  // -----------------------------------------------------------------------
  // Task dispatching
  // -----------------------------------------------------------------------

  /**
   * Dispatch ready tasks to agents.
   */
  private dispatchTasks(): void {
    const orcState = this.stateManager.readOrchestratorState();
    const activeCount = orcState.activeTasks.length;

    if (activeCount >= MAX_CONCURRENT_TASKS) {
      return; // At capacity
    }

    const slotsAvailable = MAX_CONCURRENT_TASKS - activeCount;
    const readyTasks = this.taskQueue.getNextExecutableTasksForPhase(
      orcState.currentPhase,
      slotsAvailable,
    );

    for (const task of readyTasks) {
      this.dispatchTask(task);
    }
  }

  /**
   * Dispatch a single task to its assigned agent.
   */
  private dispatchTask(task: TaskDefinition): void {
    log('INFO', `Dispatching task: [${task.id}] "${task.title}" -> ${task.assignee}`, {
      taskId: task.id,
      assignee: task.assignee,
      priority: task.priority,
    });

    // Mark task as in-progress
    this.taskQueue.startTask(task.id);

    // Send assignment message to the agent
    this.sendMessage(task.assignee, {
      type: 'TASK_ASSIGN',
      subject: `Task assigned: ${task.title}`,
      body: JSON.stringify({
        taskId: task.id,
        title: task.title,
        description: task.description,
        acceptanceCriteria: task.acceptanceCriteria,
        tags: task.tags,
      }),
      priority: task.priority,
    });
  }

  // -----------------------------------------------------------------------
  // Dependency & blocked-task resolution
  // -----------------------------------------------------------------------

  /**
   * Re-check all blocked tasks to see if their dependencies are now met.
   */
  private resolveBlockedTasks(): void {
    const blocked = this.taskQueue.getTasksByStatus('BLOCKED');
    for (const task of blocked) {
      if (this.taskQueue.areDependenciesMet(task.id)) {
        this.taskQueue.enqueueTask(task.id);
        log('INFO', `Unblocked task: [${task.id}] "${task.title}"`);
      }
    }
  }

  /**
   * Check for tasks that have been IN_PROGRESS for too long (stalled).
   */
  private checkStalledTasks(): void {
    const inProgress = this.taskQueue.getTasksByStatus('IN_PROGRESS');
    const now = Date.now();
    const STALL_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

    for (const task of inProgress) {
      if (task.startedAt) {
        const elapsed = now - new Date(task.startedAt).getTime();
        if (elapsed > STALL_THRESHOLD_MS) {
          log('WARN', `Stalled task detected: [${task.id}] "${task.title}" (${Math.round(elapsed / 60000)}min)`, {
            taskId: task.id,
            elapsedMinutes: Math.round(elapsed / 60000),
          });
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Public API for sub-agents
  // -----------------------------------------------------------------------

  /**
   * Called by a sub-agent when it finishes a task.
   */
  onTaskCompleted(taskId: string, output: TaskOutput): void {
    const task = this.taskQueue.completeTask(taskId, output);
    if (!task) {
      log('ERROR', `Completed unknown task: ${taskId}`);
      return;
    }

    log('INFO', `Task completed: [${taskId}] "${task.title}"`, {
      filesCreated: output.filesCreated.length,
      filesModified: output.filesModified.length,
    });

    // Resolve downstream dependencies
    const unblocked = this.taskQueue.resolveDependencies(taskId);
    if (unblocked.length > 0) {
      log('INFO', `Unblocked ${unblocked.length} tasks after completing ${taskId}`, {
        unblocked: unblocked.map((t) => t.id),
      });
    }

    // Recalculate progress
    this.stateManager.recalculateProgress();
  }

  /**
   * Called by a sub-agent when a task fails.
   */
  onTaskFailed(taskId: string, reason: string): void {
    const task = this.taskQueue.failTask(taskId, reason);
    if (!task) {
      log('ERROR', `Failed unknown task: ${taskId}`);
      return;
    }

    if (task.status === 'FAILED') {
      log('ERROR', `Task permanently failed: [${taskId}] "${task.title}" - ${reason}`);
    } else {
      log('WARN', `Task failed, retrying: [${taskId}] "${task.title}" (attempt ${task.retryCount}/${task.maxRetries})`);
    }
  }

  // -----------------------------------------------------------------------
  // Messaging
  // -----------------------------------------------------------------------

  /**
   * Send a message to a specific agent.
   */
  private sendMessage(
    to: AgentRole,
    msg: Omit<AgentMessage, 'id' | 'timestamp' | 'from' | 'to'>,
  ): void {
    const fullMessage: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      from: 'orchestrator',
      to,
      ...msg,
    };

    // Persist to orchestrator message log
    const orcState = this.stateManager.readOrchestratorState();
    orcState.messageLog.push(fullMessage);

    // Keep log manageable (last 200 messages)
    if (orcState.messageLog.length > 200) {
      orcState.messageLog = orcState.messageLog.slice(-200);
    }

    this.stateManager.writeOrchestratorState(orcState);

    // Also write to agent-specific inbox file
    const inboxDir = path.resolve(import.meta.dirname, '..', 'state', 'inboxes');
    ensureDir(inboxDir);
    const inboxFile = path.join(inboxDir, `${to}.jsonl`);
    fs.appendFileSync(inboxFile, JSON.stringify(fullMessage) + '\n', 'utf-8');
  }

  /**
   * Broadcast a message to all agents.
   */
  private broadcastMessage(
    msg: Omit<AgentMessage, 'id' | 'timestamp' | 'from' | 'to'>,
  ): void {
    const roles: AgentRole[] = [
      'architect',
      'backend-dev',
      'frontend-dev',
      'integration',
      'testing',
      'devops',
      'research',
    ];
    for (const role of roles) {
      this.sendMessage(role, msg);
    }
  }

  // -----------------------------------------------------------------------
  // Progress reporting
  // -----------------------------------------------------------------------

  /**
   * Generate a structured progress report.
   */
  generateProgressReport(): ProgressReport {
    const orcState = this.stateManager.readOrchestratorState();
    const queue = this.stateManager.readTaskQueue();
    const progress = this.stateManager.recalculateProgress();

    const activeTasks = queue.tasks
      .filter((t) => t.status === 'IN_PROGRESS')
      .map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee,
        status: t.status,
      }));

    const recentlyCompleted = queue.tasks
      .filter((t) => t.status === 'COMPLETED' && t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        title: t.title,
        completedAt: t.completedAt!,
      }));

    const blockers = this.stateManager.getBlockedTasks().map((t) => ({
      taskId: t.id,
      reason: `Waiting on dependencies`,
      waitingOn: this.taskQueue.getUnmetDependencies(t.id),
    }));

    const nextUp = this.taskQueue
      .getNextExecutableTasks(5)
      .map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee,
      }));

    return {
      timestamp: new Date().toISOString(),
      phase: orcState.currentPhase,
      totalProgress: progress.total,
      phaseProgress: progress.phases[orcState.currentPhase],
      activeTasks,
      recentlyCompleted,
      blockers,
      nextUp,
    };
  }

  /**
   * Print a human-readable progress report to the console.
   */
  printProgressReport(): void {
    const report = this.generateProgressReport();
    const stats = this.taskQueue.getTaskStats();

    console.log('\n\x1b[1m========== PROGRESS REPORT ==========\x1b[0m');
    console.log(`Phase:    \x1b[36m${report.phase}\x1b[0m`);
    console.log(`Progress: \x1b[32m${report.totalProgress}%\x1b[0m total | \x1b[32m${report.phaseProgress}%\x1b[0m current phase`);
    console.log(`Tasks:    ${stats.completed}/${stats.total} done | ${stats.inProgress} active | ${stats.queued} queued | ${stats.blocked} blocked | ${stats.failed} failed`);

    if (report.activeTasks.length > 0) {
      console.log('\n\x1b[33mActive Tasks:\x1b[0m');
      for (const t of report.activeTasks) {
        console.log(`  - [${t.id}] ${t.title} (${t.assignee})`);
      }
    }

    if (report.nextUp.length > 0) {
      console.log('\n\x1b[36mNext Up:\x1b[0m');
      for (const t of report.nextUp) {
        console.log(`  - [${t.id}] ${t.title} (${t.assignee})`);
      }
    }

    if (report.blockers.length > 0) {
      console.log('\n\x1b[31mBlockers:\x1b[0m');
      for (const b of report.blockers) {
        console.log(`  - [${b.taskId}] waiting on: ${b.waitingOn.join(', ')}`);
      }
    }

    console.log('\x1b[1m======================================\x1b[0m\n');
  }

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------

  /**
   * Ensure all required state files exist.
   */
  private ensureInitialState(): void {
    const stateDir = path.resolve(import.meta.dirname, '..', 'state');
    ensureDir(stateDir);
    ensureDir(LOGS_DIR);

    // Orchestrator state
    const orcFile = path.join(stateDir, 'orchestrator-state.json');
    if (!fs.existsSync(orcFile)) {
      log('WARN', 'Orchestrator state not found, creating default.');
      const defaultState: OrchestratorState = {
        isRunning: false,
        currentPhase: 'INIT',
        activeTasks: [],
        completedTasks: [],
        failedTasks: [],
        blockedTasks: [],
        totalProgress: 0,
        phaseProgress: {
          INIT: 0,
          RESEARCH: 0,
          ARCHITECTURE: 0,
          CORE_BACKEND: 0,
          CORE_FRONTEND: 0,
          FEATURE_DEV: 0,
          INTEGRATIONS: 0,
          TESTING: 0,
          POLISH: 0,
          COMPLETE: 0,
        },
        messageLog: [],
        lastHeartbeat: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        errors: [],
      };
      fs.writeFileSync(orcFile, JSON.stringify(defaultState, null, 2) + '\n', 'utf-8');
    }

    // Task queue
    const queueFile = path.join(stateDir, 'task-queue.json');
    if (!fs.existsSync(queueFile)) {
      log('WARN', 'Task queue not found, creating default.');
      fs.writeFileSync(
        queueFile,
        JSON.stringify({ lastUpdatedAt: new Date().toISOString(), tasks: [], completedTaskIds: [], failedTaskIds: [] }, null, 2) + '\n',
        'utf-8',
      );
    }

    // Project state
    const projectState = this.stateManager.readProjectState();
    if (!projectState) {
      log('INFO', 'Initializing project state.');
      this.stateManager.initializeProjectState();
    }

    // Validate - check for circular dependencies
    const cycles = this.taskQueue.detectCircularDependencies();
    if (cycles.length > 0) {
      log('ERROR', `Circular dependencies detected: ${JSON.stringify(cycles)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const orchestrator = new Orchestrator();

  if (args.includes('--report')) {
    orchestrator.printProgressReport();
    return;
  }

  if (args.includes('--validate')) {
    const taskQueue = new TaskQueue(new StateManager());
    const cycles = taskQueue.detectCircularDependencies();
    if (cycles.length > 0) {
      console.error('Circular dependencies found:', cycles);
      process.exit(1);
    }
    const stats = taskQueue.getTaskStats();
    console.log('Task queue valid.');
    console.log(`Total: ${stats.total} | Pending: ${stats.pending} | Completed: ${stats.completed} | Failed: ${stats.failed}`);
    return;
  }

  await orchestrator.start();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default Orchestrator;
