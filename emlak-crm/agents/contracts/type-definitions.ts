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
// Agent Skill
// -----------------------------------------------------------------------------

/**
 * Represents a skill document that agents can reference during task execution.
 * Skills are markdown files in agents/skills/ that provide domain-specific
 * guidance, checklists, and code patterns.
 */
export interface AgentSkill {
  /** Unique skill identifier (e.g., 'code-review', 'tdd-workflow') */
  id: string;
  /** Human-readable skill name */
  name: string;
  /** Brief description of what the skill covers */
  description: string;
  /** Path to the skill markdown file relative to agents/ */
  filePath: string;
  /** Which agent roles typically use this skill */
  applicableRoles: AgentRole[];
  /** Which project phases this skill is most relevant in */
  applicablePhases: ProjectPhase[];
  /** Tags for searchability */
  tags: string[];
  /** Skill version (incremented when the skill document is updated) */
  version: number;
}

// -----------------------------------------------------------------------------
// Session Context
// -----------------------------------------------------------------------------

/**
 * Represents a saved session snapshot for resuming work across agent sessions.
 * Inspired by the "everything-claude-code" community pattern for continuity.
 */
export interface SessionContext {
  /** Unique session identifier */
  sessionId: string;
  /** ISO timestamp when the session was saved */
  savedAt: string;
  /** Which agent saved this session */
  agent: AgentRole;
  /** Human-readable summary of the session state */
  summary: string;

  /** What was accomplished in this session */
  accomplishments: string[];
  /** Files created, modified, or deleted during this session */
  filesChanged: SessionFileChange[];
  /** Blockers or pending decisions that need resolution */
  blockers: SessionBlocker[];
  /** Tasks that were being actively worked on */
  pendingTasks: SessionPendingTask[];

  /** Snapshot of the project state at save time */
  projectContext: SessionProjectContext;
  /** Git branch and commit state at save time */
  gitContext: SessionGitContext;
  /** Freeform notes for the next session */
  notes: string[];
}

export interface SessionFileChange {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  description: string;
}

export interface SessionBlocker {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  waitingOn?: string;
}

export interface SessionPendingTask {
  taskId: string;
  title: string;
  status: string;
  progress: number;
  nextSteps: string[];
}

export interface SessionProjectContext {
  phase: string;
  totalProgress: number;
  phaseProgress: number;
  activeTasks: number;
  completedTasks: number;
}

export interface SessionGitContext {
  branch: string;
  uncommittedChanges: number;
  lastCommit: string;
  lastCommitMessage: string;
}

// -----------------------------------------------------------------------------
// Learning System
// -----------------------------------------------------------------------------

/**
 * An instinct is a lightweight decision heuristic that agents accumulate
 * through experience. Instincts are probabilistic and context-dependent,
 * representing patterns that have been reinforced or contradicted over time.
 */
export interface LearningInstinct {
  /** Unique instinct identifier */
  instinctId: string;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Which agent originated this instinct */
  agent: AgentRole;

  /** Condition that triggers this instinct (e.g., "When I see X...") */
  trigger: string;
  /** Recommended action (e.g., "I should do Y...") */
  action: string;
  /** Reasoning behind the instinct (e.g., "Because Z happened in the past") */
  reason: string;

  /** Confidence score between 0.0 and 1.0 */
  confidence: number;
  /** Number of times this instinct was validated by positive outcomes */
  reinforcements: number;
  /** Number of times this instinct was contradicted by negative outcomes */
  contradictions: number;

  /** Categories this instinct applies to */
  categories: ('code' | 'architecture' | 'testing' | 'integration' | 'performance' | 'domain')[];
  /** Tags for searchability */
  tags: string[];

  /** Examples where this instinct was applied */
  examples: InstinctExample[];
}

export interface InstinctExample {
  taskId: string;
  outcome: 'positive' | 'negative' | 'neutral';
  notes: string;
}

/**
 * A learned pattern extracted from completed task work.
 */
export interface LearnedPattern {
  /** Unique pattern identifier */
  patternId: string;
  /** ISO timestamp when extracted */
  extractedAt: string;
  /** Task that produced this pattern */
  sourceTaskId: string;
  /** Agent that extracted it */
  sourceAgent: AgentRole;

  /** Pattern category */
  category: 'code' | 'architecture' | 'testing' | 'integration' | 'performance' | 'domain';

  /** The pattern details */
  pattern: {
    name: string;
    context: string;
    problem: string;
    solution: string;
    codeExample?: string;
    antiPattern?: string;
  };

  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Which areas of the codebase this pattern applies to */
  applicability: string[];
  /** Tags for searchability */
  tags: string[];
  /** Reinforcement count */
  reinforcements: number;
  /** Contradiction count */
  contradictions: number;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Domain knowledge entry - facts about Turkish real estate, portals, or regulations.
 */
export interface DomainKnowledgeEntry {
  id: string;
  category: 'portal' | 'regulation' | 'market' | 'technical' | 'process';
  topic: string;
  content: string;
  learnedFrom: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Heartbeat Configuration
// -----------------------------------------------------------------------------

/**
 * Configuration for the orchestrator heartbeat system and periodic sync jobs.
 */
export interface HeartbeatConfig {
  /** Orchestrator main tick interval in milliseconds */
  tickIntervalMs: number;
  /** Heartbeat (progress recalculation) interval in milliseconds */
  heartbeatIntervalMs: number;
  /** Maximum number of concurrent tasks the orchestrator will dispatch */
  maxConcurrentTasks: number;
  /** Time in milliseconds before a task is considered stalled */
  stallThresholdMs: number;

  /** Portal sync schedules */
  portalSync: {
    /** Sahibinden XML feed regeneration (cron expression) */
    sahibindenFeedCron: string;
    /** Hepsiemlak incremental sync (cron expression) */
    hepsiemlakIncrementalCron: string;
    /** Hepsiemlak full reconciliation (cron expression) */
    hepsiemlakFullSyncCron: string;
    /** Emlakjet incremental sync (cron expression) */
    emlakjetIncrementalCron: string;
    /** Emlakjet full reconciliation (cron expression) */
    emlakjetFullSyncCron: string;
    /** Portal health check interval (cron expression) */
    healthCheckCron: string;
  };

  /** Session auto-save schedule */
  sessionAutoSave: {
    /** Whether auto-save is enabled */
    enabled: boolean;
    /** Auto-save interval in milliseconds */
    intervalMs: number;
  };

  /** Learning system schedules */
  learning: {
    /** Pattern extraction runs after each task completion */
    extractAfterCompletion: boolean;
    /** Weekly review cron expression */
    weeklyReviewCron: string;
    /** Confidence recalculation interval (cron expression) */
    confidenceRecalcCron: string;
    /** Minimum confidence before archiving a pattern */
    archiveThreshold: number;
  };
}

/**
 * Default heartbeat configuration for the Emlak CRM agent system.
 */
export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  tickIntervalMs: 5_000,
  heartbeatIntervalMs: 30_000,
  maxConcurrentTasks: 5,
  stallThresholdMs: 30 * 60 * 1000,
  portalSync: {
    sahibindenFeedCron: '*/5 * * * *',
    hepsiemlakIncrementalCron: '*/10 * * * *',
    hepsiemlakFullSyncCron: '0 */2 * * *',
    emlakjetIncrementalCron: '*/15 * * * *',
    emlakjetFullSyncCron: '0 */3 * * *',
    healthCheckCron: '0 */6 * * *',
  },
  sessionAutoSave: {
    enabled: true,
    intervalMs: 10 * 60 * 1000,
  },
  learning: {
    extractAfterCompletion: true,
    weeklyReviewCron: '0 9 * * 1',
    confidenceRecalcCron: '0 0 * * *',
    archiveThreshold: 0.1,
  },
};

// -----------------------------------------------------------------------------
// Portal Sync Types
// -----------------------------------------------------------------------------

export interface PortalConfig {
  name: string;
  type: 'xml-feed' | 'rest-api';
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  enabled: boolean;
}

export interface PortalSyncResult {
  portal: string;
  syncType: 'incremental' | 'full' | 'feed-generation';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  propertiesCreated: number;
  propertiesUpdated: number;
  propertiesRemoved: number;
  errors: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface PortalHealth {
  portal: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  recentSyncs: number;
  recentFailures: number;
  totalErrors: number;
  lastSuccessfulSync: string | null;
  checkedAt: string;
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
