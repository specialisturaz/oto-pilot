// =============================================================================
// Agent Orchestrator - State Manager
// Reads/writes state files, handles phase transitions, calculates progress.
// =============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ProjectPhase,
  ProjectState,
  PhaseState,
  OrchestratorState,
  TaskQueue,
  TaskDefinition,
  PROJECT_PHASES,
} from '../contracts/type-definitions.js';

const AGENTS_DIR = path.resolve(__dirname, '..');
const STATE_DIR = path.join(AGENTS_DIR, 'state');

const ORCHESTRATOR_STATE_FILE = path.join(STATE_DIR, 'orchestrator-state.json');
const TASK_QUEUE_FILE = path.join(STATE_DIR, 'task-queue.json');
const PROJECT_STATE_FILE = path.join(AGENTS_DIR, '..', 'project-state.json');

// Phase ordering for transitions
const PHASE_ORDER: ProjectPhase[] = [
  'INIT',
  'RESEARCH',
  'ARCHITECTURE',
  'CORE_BACKEND',
  'CORE_FRONTEND',
  'FEATURE_DEV',
  'INTEGRATIONS',
  'TESTING',
  'POLISH',
  'COMPLETE',
];

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// StateManager class
// ---------------------------------------------------------------------------

export class StateManager {
  // -------------------------------------------------------------------------
  // Orchestrator State
  // -------------------------------------------------------------------------

  readOrchestratorState(): OrchestratorState {
    return readJsonFile<OrchestratorState>(ORCHESTRATOR_STATE_FILE);
  }

  writeOrchestratorState(state: OrchestratorState): void {
    state.lastHeartbeat = new Date().toISOString();
    writeJsonFile(ORCHESTRATOR_STATE_FILE, state);
  }

  updateOrchestratorState(patch: Partial<OrchestratorState>): OrchestratorState {
    const current = this.readOrchestratorState();
    const updated = { ...current, ...patch, lastHeartbeat: new Date().toISOString() };
    this.writeOrchestratorState(updated);
    return updated;
  }

  // -------------------------------------------------------------------------
  // Task Queue
  // -------------------------------------------------------------------------

  readTaskQueue(): TaskQueue {
    return readJsonFile<TaskQueue>(TASK_QUEUE_FILE);
  }

  writeTaskQueue(queue: TaskQueue): void {
    queue.lastUpdatedAt = new Date().toISOString();
    writeJsonFile(TASK_QUEUE_FILE, queue);
  }

  getTask(taskId: string): TaskDefinition | undefined {
    const queue = this.readTaskQueue();
    return queue.tasks.find((t) => t.id === taskId);
  }

  updateTask(taskId: string, patch: Partial<TaskDefinition>): TaskDefinition | undefined {
    const queue = this.readTaskQueue();
    const idx = queue.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return undefined;

    queue.tasks[idx] = { ...queue.tasks[idx], ...patch };
    this.writeTaskQueue(queue);
    return queue.tasks[idx];
  }

  // -------------------------------------------------------------------------
  // Project State
  // -------------------------------------------------------------------------

  readProjectState(): ProjectState | null {
    try {
      return readJsonFile<ProjectState>(PROJECT_STATE_FILE);
    } catch {
      return null;
    }
  }

  writeProjectState(state: ProjectState): void {
    state.lastUpdatedAt = new Date().toISOString();
    writeJsonFile(PROJECT_STATE_FILE, state);
  }

  initializeProjectState(): ProjectState {
    const now = new Date().toISOString();
    const phases: Record<string, PhaseState> = {};

    for (const phase of PHASE_ORDER) {
      phases[phase] = {
        status: phase === 'INIT' ? 'IN_PROGRESS' : 'NOT_STARTED',
        progress: 0,
        totalTasks: 0,
        completedTasks: 0,
        ...(phase === 'INIT' ? { startedAt: now } : {}),
      };
    }

    const state: ProjectState = {
      projectName: 'emlak-crm',
      version: '0.1.0',
      currentPhase: 'INIT',
      phases: phases as Record<ProjectPhase, PhaseState>,
      startedAt: now,
      lastUpdatedAt: now,
    };

    this.writeProjectState(state);
    return state;
  }

  // -------------------------------------------------------------------------
  // Phase Transitions
  // -------------------------------------------------------------------------

  /**
   * Return the index of a phase in the ordered list.
   */
  getPhaseIndex(phase: ProjectPhase): number {
    return PHASE_ORDER.indexOf(phase);
  }

  /**
   * Get the next phase after the given one, or null if at the end.
   */
  getNextPhase(phase: ProjectPhase): ProjectPhase | null {
    const idx = this.getPhaseIndex(phase);
    if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null;
    return PHASE_ORDER[idx + 1];
  }

  /**
   * Check whether all tasks for a given phase are completed.
   */
  isPhaseComplete(phase: ProjectPhase): boolean {
    const queue = this.readTaskQueue();
    const phaseTasks = queue.tasks.filter((t) => t.phase === phase);
    if (phaseTasks.length === 0) return true;
    return phaseTasks.every((t) => t.status === 'COMPLETED');
  }

  /**
   * Attempt to transition to the next phase. Returns the new phase or null
   * if the transition is not possible yet.
   */
  tryAdvancePhase(): ProjectPhase | null {
    const orcState = this.readOrchestratorState();
    const currentPhase = orcState.currentPhase;

    if (!this.isPhaseComplete(currentPhase)) {
      return null;
    }

    const nextPhase = this.getNextPhase(currentPhase);
    if (!nextPhase) return null;

    const now = new Date().toISOString();

    // Update orchestrator state
    this.updateOrchestratorState({ currentPhase: nextPhase });

    // Update project state
    const projectState = this.readProjectState();
    if (projectState) {
      projectState.currentPhase = nextPhase;
      projectState.phases[currentPhase].status = 'COMPLETED';
      projectState.phases[currentPhase].progress = 100;
      projectState.phases[currentPhase].completedAt = now;
      projectState.phases[nextPhase].status = 'IN_PROGRESS';
      projectState.phases[nextPhase].startedAt = now;

      if (nextPhase === 'COMPLETE') {
        projectState.completedAt = now;
      }

      this.writeProjectState(projectState);
    }

    return nextPhase;
  }

  // -------------------------------------------------------------------------
  // Progress Calculation
  // -------------------------------------------------------------------------

  /**
   * Calculate progress for a specific phase (0-100).
   */
  calculatePhaseProgress(phase: ProjectPhase): number {
    const queue = this.readTaskQueue();
    const phaseTasks = queue.tasks.filter((t) => t.phase === phase);
    if (phaseTasks.length === 0) return 100;

    const completed = phaseTasks.filter((t) => t.status === 'COMPLETED').length;
    return Math.round((completed / phaseTasks.length) * 100);
  }

  /**
   * Calculate total project progress (0-100) as weighted average.
   */
  calculateTotalProgress(): number {
    const queue = this.readTaskQueue();
    const totalTasks = queue.tasks.length;
    if (totalTasks === 0) return 0;

    const completedTasks = queue.tasks.filter((t) => t.status === 'COMPLETED').length;
    return Math.round((completedTasks / totalTasks) * 100);
  }

  /**
   * Recalculate and persist all progress values.
   */
  recalculateProgress(): { total: number; phases: Record<ProjectPhase, number> } {
    const phaseProgress: Record<string, number> = {};

    for (const phase of PHASE_ORDER) {
      phaseProgress[phase] = this.calculatePhaseProgress(phase);
    }

    const total = this.calculateTotalProgress();

    // Persist to orchestrator state
    this.updateOrchestratorState({
      totalProgress: total,
      phaseProgress: phaseProgress as Record<ProjectPhase, number>,
    });

    // Persist to project state
    const projectState = this.readProjectState();
    if (projectState) {
      const queue = this.readTaskQueue();
      for (const phase of PHASE_ORDER) {
        projectState.phases[phase].progress = phaseProgress[phase];
        const phaseTasks = queue.tasks.filter((t) => t.phase === phase);
        projectState.phases[phase].totalTasks = phaseTasks.length;
        projectState.phases[phase].completedTasks = phaseTasks.filter(
          (t) => t.status === 'COMPLETED',
        ).length;
      }
      this.writeProjectState(projectState);
    }

    return { total, phases: phaseProgress as Record<ProjectPhase, number> };
  }

  // -------------------------------------------------------------------------
  // Convenience queries
  // -------------------------------------------------------------------------

  /**
   * Get all tasks for the current phase.
   */
  getCurrentPhaseTasks(): TaskDefinition[] {
    const orcState = this.readOrchestratorState();
    const queue = this.readTaskQueue();
    return queue.tasks.filter((t) => t.phase === orcState.currentPhase);
  }

  /**
   * Get tasks that are ready to execute (dependencies met, not blocked).
   */
  getReadyTasks(): TaskDefinition[] {
    const queue = this.readTaskQueue();
    const completedIds = new Set(
      queue.tasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id),
    );

    return queue.tasks.filter((t) => {
      if (t.status !== 'PENDING' && t.status !== 'QUEUED') return false;
      return t.dependencies.every((dep) => completedIds.has(dep));
    });
  }

  /**
   * Get tasks that are currently blocked.
   */
  getBlockedTasks(): TaskDefinition[] {
    const queue = this.readTaskQueue();
    const completedIds = new Set(
      queue.tasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id),
    );

    return queue.tasks.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'FAILED' || t.status === 'CANCELLED') {
        return false;
      }
      return t.dependencies.some((dep) => !completedIds.has(dep));
    });
  }
}

export default StateManager;
