// =============================================================================
// Agent System - Shared Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Project Phases
// -----------------------------------------------------------------------------

export const PROJECT_PHASES = [
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
] as const;

export type ProjectPhase = (typeof PROJECT_PHASES)[number];

// -----------------------------------------------------------------------------
// Agent Roles
// -----------------------------------------------------------------------------

export const AGENT_ROLES = [
  'orchestrator',
  'architect',
  'backend-dev',
  'frontend-dev',
  'integration',
  'testing',
  'devops',
  'research',
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

// -----------------------------------------------------------------------------
// Message & Priority
// -----------------------------------------------------------------------------

export const MESSAGE_TYPES = [
  'TASK_ASSIGN',
  'TASK_COMPLETE',
  'TASK_FAILED',
  'STATUS_UPDATE',
  'DEPENDENCY_MET',
  'PHASE_CHANGE',
  'ERROR',
  'INFO',
  'QUERY',
  'RESPONSE',
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type Priority = (typeof PRIORITIES)[number];

export const TASK_STATUSES = [
  'PENDING',
  'QUEUED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

// -----------------------------------------------------------------------------
// Agent Message
// -----------------------------------------------------------------------------

export interface AgentMessage {
  id: string;
  timestamp: string;
  from: AgentRole;
  to: AgentRole | 'all';
  type: MessageType;
  priority: Priority;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  replyTo?: string;
}

// -----------------------------------------------------------------------------
// Task Definition
// -----------------------------------------------------------------------------

export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  phase: ProjectPhase;
  assignee: AgentRole;
  priority: Priority;
  status: TaskStatus;
  dependencies: string[];
  estimatedMinutes: number;
  tags: string[];
  acceptanceCriteria: string[];
  output?: TaskOutput;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
}

export interface TaskOutput {
  filesCreated: string[];
  filesModified: string[];
  summary: string;
  artifacts?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Project State
// -----------------------------------------------------------------------------

export interface PhaseDefinition {
  phase: ProjectPhase;
  label: string;
  description: string;
  order: number;
  requiredTaskIds: string[];
}

export interface ProjectState {
  projectName: string;
  version: string;
  currentPhase: ProjectPhase;
  phases: Record<ProjectPhase, PhaseState>;
  startedAt: string;
  lastUpdatedAt: string;
  completedAt?: string;
}

export interface PhaseState {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progress: number; // 0 - 100
  startedAt?: string;
  completedAt?: string;
  totalTasks: number;
  completedTasks: number;
}

// -----------------------------------------------------------------------------
// Task Queue
// -----------------------------------------------------------------------------

export interface TaskQueue {
  lastUpdatedAt: string;
  tasks: TaskDefinition[];
  completedTaskIds: string[];
  failedTaskIds: string[];
}

// -----------------------------------------------------------------------------
// Orchestrator State
// -----------------------------------------------------------------------------

export interface OrchestratorState {
  isRunning: boolean;
  currentPhase: ProjectPhase;
  activeTasks: string[];
  completedTasks: string[];
  failedTasks: string[];
  blockedTasks: string[];
  totalProgress: number;
  phaseProgress: Record<ProjectPhase, number>;
  messageLog: AgentMessage[];
  lastHeartbeat: string;
  startedAt: string;
  errors: OrchestratorError[];
}

export interface OrchestratorError {
  timestamp: string;
  taskId?: string;
  agent?: AgentRole;
  message: string;
  stack?: string;
  resolved: boolean;
}

// -----------------------------------------------------------------------------
// Agent Configuration
// -----------------------------------------------------------------------------

export interface AgentConfig {
  role: AgentRole;
  name: string;
  description: string;
  capabilities: string[];
  maxConcurrentTasks: number;
  phases: ProjectPhase[];
}

// -----------------------------------------------------------------------------
// Progress Report
// -----------------------------------------------------------------------------

export interface ProgressReport {
  timestamp: string;
  phase: ProjectPhase;
  totalProgress: number;
  phaseProgress: number;
  activeTasks: {
    id: string;
    title: string;
    assignee: AgentRole;
    status: TaskStatus;
  }[];
  recentlyCompleted: {
    id: string;
    title: string;
    completedAt: string;
  }[];
  blockers: {
    taskId: string;
    reason: string;
    waitingOn: string[];
  }[];
  nextUp: {
    id: string;
    title: string;
    assignee: AgentRole;
  }[];
}
