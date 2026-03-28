// =============================================================================
// Session Save Hook
// =============================================================================
// Persists the current agent session context to agents/state/ so that work
// can be resumed later. Inspired by the "everything-claude-code" community
// pattern for session continuity.
//
// Usage:
//   npx tsx agents/hooks/session-save.ts
//   npx tsx agents/hooks/session-save.ts --agent backend-dev
//   npx tsx agents/hooks/session-save.ts --summary "Completed auth middleware"
// =============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionSnapshot {
  sessionId: string;
  savedAt: string;
  agent: string;
  summary: string;

  // What was accomplished in this session
  accomplishments: string[];

  // Files that were created or modified
  filesChanged: FileChange[];

  // Blockers or pending decisions
  blockers: Blocker[];

  // Pending tasks that were being worked on
  pendingTasks: PendingTask[];

  // Current project phase and progress
  projectContext: ProjectContext;

  // Active branch and git status
  gitContext: GitContext;

  // Any learned patterns or notes for future sessions
  notes: string[];
}

interface FileChange {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  description: string;
}

interface Blocker {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  waitingOn?: string;
}

interface PendingTask {
  taskId: string;
  title: string;
  status: string;
  progress: number; // 0-100
  nextSteps: string[];
}

interface ProjectContext {
  phase: string;
  totalProgress: number;
  phaseProgress: number;
  activeTasks: number;
  completedTasks: number;
}

interface GitContext {
  branch: string;
  uncommittedChanges: number;
  lastCommit: string;
  lastCommitMessage: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENTS_DIR = path.resolve(__dirname, '..');
const STATE_DIR = path.join(AGENTS_DIR, 'state');
const SESSIONS_DIR = path.join(STATE_DIR, 'sessions');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');
const ORCHESTRATOR_STATE_FILE = path.join(STATE_DIR, 'orchestrator-state.json');
const TASK_QUEUE_FILE = path.join(STATE_DIR, 'task-queue.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const rand = Math.random().toString(36).slice(2, 6);
  return `session-${date}-${time}-${rand}`;
}

function execSync(command: string): string {
  try {
    const { execSync: exec } = require('node:child_process');
    return exec(command, {
      encoding: 'utf-8',
      cwd: path.resolve(AGENTS_DIR, '..'),
      timeout: 10000,
    }).trim();
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Context Gathering
// ---------------------------------------------------------------------------

function gatherProjectContext(): ProjectContext {
  const orcState = readJsonSafe<any>(ORCHESTRATOR_STATE_FILE);

  if (!orcState) {
    return {
      phase: 'UNKNOWN',
      totalProgress: 0,
      phaseProgress: 0,
      activeTasks: 0,
      completedTasks: 0,
    };
  }

  const currentPhase = orcState.currentPhase || 'UNKNOWN';
  const phaseProgress = orcState.phaseProgress?.[currentPhase] || 0;

  return {
    phase: currentPhase,
    totalProgress: orcState.totalProgress || 0,
    phaseProgress,
    activeTasks: (orcState.activeTasks || []).length,
    completedTasks: (orcState.completedTasks || []).length,
  };
}

function gatherGitContext(): GitContext {
  const branch = execSync('git rev-parse --abbrev-ref HEAD') || 'unknown';
  const uncommittedRaw = execSync('git status --porcelain');
  const uncommittedChanges = uncommittedRaw ? uncommittedRaw.split('\n').filter(Boolean).length : 0;
  const lastCommit = execSync('git rev-parse --short HEAD') || 'unknown';
  const lastCommitMessage = execSync('git log -1 --pretty=%s') || 'unknown';

  return {
    branch,
    uncommittedChanges,
    lastCommit,
    lastCommitMessage,
  };
}

function gatherFilesChanged(): FileChange[] {
  const changes: FileChange[] = [];

  // Get recently modified files (last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const gitLog = execSync(
    `git log --since="${twoHoursAgo.toISOString()}" --name-status --pretty=format:""`,
  );

  if (!gitLog) return changes;

  const lines = gitLog.split('\n').filter(Boolean);
  const seen = new Set<string>();

  for (const line of lines) {
    const match = line.match(/^([AMDRC])\t(.+)$/);
    if (match && !seen.has(match[2])) {
      seen.add(match[2]);
      const actionMap: Record<string, FileChange['action']> = {
        A: 'created',
        M: 'modified',
        D: 'deleted',
        R: 'modified',
        C: 'created',
      };
      changes.push({
        path: match[2],
        action: actionMap[match[1]] || 'modified',
        description: '', // Filled by the caller if needed
      });
    }
  }

  return changes;
}

function gatherPendingTasks(): PendingTask[] {
  const queue = readJsonSafe<any>(TASK_QUEUE_FILE);
  if (!queue?.tasks) return [];

  return queue.tasks
    .filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'QUEUED')
    .map((t: any) => ({
      taskId: t.id,
      title: t.title,
      status: t.status,
      progress: t.status === 'IN_PROGRESS' ? 50 : 0,
      nextSteps: t.acceptanceCriteria || [],
    }));
}

function generateAutoSummary(context: ProjectContext, git: GitContext, pending: PendingTask[]): string {
  const parts: string[] = [];

  parts.push(`Phase: ${context.phase} (${context.totalProgress}% overall)`);

  if (pending.length > 0) {
    parts.push(
      `Active tasks: ${pending.map((t) => t.title).join(', ')}`,
    );
  }

  parts.push(`Branch: ${git.branch} (${git.lastCommitMessage})`);

  if (git.uncommittedChanges > 0) {
    parts.push(`${git.uncommittedChanges} uncommitted change(s)`);
  }

  return parts.join(' | ');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  let agentName = 'orchestrator';
  let manualSummary = '';
  const blockers: Blocker[] = [];
  const accomplishments: string[] = [];
  const notes: string[] = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agent':
        agentName = args[++i] || 'orchestrator';
        break;
      case '--summary':
        manualSummary = args[++i] || '';
        break;
      case '--blocker':
        blockers.push({
          id: `blocker-${Date.now()}-${blockers.length}`,
          description: args[++i] || '',
          severity: 'medium',
        });
        break;
      case '--accomplished':
        accomplishments.push(args[++i] || '');
        break;
      case '--note':
        notes.push(args[++i] || '');
        break;
    }
  }

  // Gather context
  const projectContext = gatherProjectContext();
  const gitContext = gatherGitContext();
  const filesChanged = gatherFilesChanged();
  const pendingTasks = gatherPendingTasks();

  // Build session snapshot
  const sessionId = generateSessionId();
  const summary = manualSummary || generateAutoSummary(projectContext, gitContext, pendingTasks);

  const snapshot: SessionSnapshot = {
    sessionId,
    savedAt: new Date().toISOString(),
    agent: agentName,
    summary,
    accomplishments,
    filesChanged,
    blockers,
    pendingTasks,
    projectContext,
    gitContext,
    notes,
  };

  // Save to sessions directory (historical)
  ensureDir(SESSIONS_DIR);
  const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
  fs.writeFileSync(sessionFile, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  // Save as current session (for quick resume)
  fs.writeFileSync(CURRENT_SESSION_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  // Console output
  console.log('\n\x1b[36m━━━ Session Saved ━━━\x1b[0m');
  console.log(`  ID:       ${sessionId}`);
  console.log(`  Agent:    ${agentName}`);
  console.log(`  Summary:  ${summary}`);
  console.log(`  Phase:    ${projectContext.phase} (${projectContext.totalProgress}% overall)`);
  console.log(`  Branch:   ${gitContext.branch}`);
  console.log(`  Files:    ${filesChanged.length} changed`);
  console.log(`  Pending:  ${pendingTasks.length} task(s)`);
  console.log(`  Blockers: ${blockers.length}`);
  console.log(`  File:     ${sessionFile}`);
  console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
}

main().catch((err) => {
  console.error('Error saving session:', err);
  process.exit(1);
});

export type { SessionSnapshot, FileChange, Blocker, PendingTask, ProjectContext, GitContext };
