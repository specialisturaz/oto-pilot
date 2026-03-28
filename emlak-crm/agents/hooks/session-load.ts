// =============================================================================
// Session Load Hook
// =============================================================================
// Loads a previously saved session context from agents/state/ and displays a
// summary of where the project stands. Used to resume work after a break.
//
// Usage:
//   npx tsx agents/hooks/session-load.ts               # Load most recent session
//   npx tsx agents/hooks/session-load.ts --list         # List all saved sessions
//   npx tsx agents/hooks/session-load.ts --id <id>      # Load a specific session
// =============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';

import type {
  SessionSnapshot,
  PendingTask,
  Blocker,
  FileChange,
} from './session-save.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENTS_DIR = path.resolve(__dirname, '..');
const STATE_DIR = path.join(AGENTS_DIR, 'state');
const SESSIONS_DIR = path.join(STATE_DIR, 'sessions');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');
const TASK_QUEUE_FILE = path.join(STATE_DIR, 'task-queue.json');
const ORCHESTRATOR_STATE_FILE = path.join(STATE_DIR, 'orchestrator-state.json');

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonSafe<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} gun once`;
  if (hours > 0) return `${hours} saat once`;
  if (minutes > 0) return `${minutes} dakika once`;
  return 'az once';
}

// ---------------------------------------------------------------------------
// List Sessions
// ---------------------------------------------------------------------------

function listSessions(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.log(`${C.yellow}No saved sessions found.${C.reset}`);
    return;
  }

  const files = fs.readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    console.log(`${C.yellow}No saved sessions found.${C.reset}`);
    return;
  }

  console.log(`\n${C.bold}${C.cyan}━━━ Saved Sessions (${files.length}) ━━━${C.reset}\n`);

  for (const file of files.slice(0, 20)) {
    const session = readJsonSafe<SessionSnapshot>(path.join(SESSIONS_DIR, file));
    if (!session) continue;

    const age = timeAgo(session.savedAt);
    const taskCount = session.pendingTasks.length;
    const blockerCount = session.blockers.length;

    console.log(
      `  ${C.blue}${session.sessionId}${C.reset}  ${C.dim}${age}${C.reset}`,
    );
    console.log(
      `    ${C.white}Agent: ${session.agent}  |  Phase: ${session.projectContext.phase}  |  Progress: ${session.projectContext.totalProgress}%${C.reset}`,
    );
    console.log(
      `    ${C.dim}${session.summary.slice(0, 100)}${session.summary.length > 100 ? '...' : ''}${C.reset}`,
    );
    if (taskCount > 0 || blockerCount > 0) {
      console.log(
        `    ${taskCount > 0 ? `${C.yellow}${taskCount} pending task(s)${C.reset}` : ''}${blockerCount > 0 ? `  ${C.red}${blockerCount} blocker(s)${C.reset}` : ''}`,
      );
    }
    console.log('');
  }

  if (files.length > 20) {
    console.log(`  ${C.dim}... and ${files.length - 20} more sessions${C.reset}\n`);
  }
}

// ---------------------------------------------------------------------------
// Load and Display Session
// ---------------------------------------------------------------------------

function loadSession(sessionId?: string): void {
  let session: SessionSnapshot | null = null;

  if (sessionId) {
    // Load specific session
    const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
    session = readJsonSafe<SessionSnapshot>(sessionFile);
    if (!session) {
      console.error(`${C.red}Session not found: ${sessionId}${C.reset}`);
      process.exit(1);
    }
  } else {
    // Load most recent session
    session = readJsonSafe<SessionSnapshot>(CURRENT_SESSION_FILE);
    if (!session) {
      console.log(`${C.yellow}No current session found. Use --list to see available sessions.${C.reset}`);
      return;
    }
  }

  displaySession(session);
  displayCurrentState(session);
  displayActionItems(session);
}

function displaySession(session: SessionSnapshot): void {
  const age = timeAgo(session.savedAt);

  console.log(`\n${C.bold}${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  console.log(`${C.bold}${C.cyan}  Session Restored: ${session.sessionId}${C.reset}`);
  console.log(`${C.bold}${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  console.log(`  ${C.dim}Saved: ${formatTimestamp(session.savedAt)} (${age})${C.reset}`);
  console.log(`  ${C.dim}Agent: ${session.agent}${C.reset}`);
  console.log(`  ${C.dim}Branch: ${session.gitContext.branch} @ ${session.gitContext.lastCommit}${C.reset}`);
  console.log('');

  // Summary
  console.log(`${C.bold}  Summary${C.reset}`);
  console.log(`  ${session.summary}`);
  console.log('');

  // Accomplishments
  if (session.accomplishments.length > 0) {
    console.log(`${C.bold}${C.green}  Accomplished${C.reset}`);
    for (const item of session.accomplishments) {
      console.log(`  ${C.green}+${C.reset} ${item}`);
    }
    console.log('');
  }

  // Files changed
  if (session.filesChanged.length > 0) {
    console.log(`${C.bold}  Files Changed (${session.filesChanged.length})${C.reset}`);
    const displayCount = Math.min(session.filesChanged.length, 15);
    for (const fc of session.filesChanged.slice(0, displayCount)) {
      const icon =
        fc.action === 'created' ? `${C.green}+` :
        fc.action === 'deleted' ? `${C.red}-` :
        `${C.yellow}~`;
      console.log(`  ${icon}${C.reset} ${fc.path}`);
    }
    if (session.filesChanged.length > displayCount) {
      console.log(`  ${C.dim}... and ${session.filesChanged.length - displayCount} more${C.reset}`);
    }
    console.log('');
  }

  // Blockers
  if (session.blockers.length > 0) {
    console.log(`${C.bold}${C.red}  Blockers${C.reset}`);
    for (const blocker of session.blockers) {
      const severityColor =
        blocker.severity === 'critical' ? C.red :
        blocker.severity === 'high' ? C.yellow :
        C.white;
      console.log(`  ${severityColor}[${blocker.severity.toUpperCase()}]${C.reset} ${blocker.description}`);
      if (blocker.waitingOn) {
        console.log(`    ${C.dim}Waiting on: ${blocker.waitingOn}${C.reset}`);
      }
    }
    console.log('');
  }

  // Notes
  if (session.notes.length > 0) {
    console.log(`${C.bold}  Notes${C.reset}`);
    for (const note of session.notes) {
      console.log(`  ${C.dim}>${C.reset} ${note}`);
    }
    console.log('');
  }
}

function displayCurrentState(session: SessionSnapshot): void {
  // Read live orchestrator state to compare with saved session
  const liveOrcState = readJsonSafe<any>(ORCHESTRATOR_STATE_FILE);
  const liveQueue = readJsonSafe<any>(TASK_QUEUE_FILE);

  console.log(`${C.bold}${C.cyan}  Current Project State${C.reset}`);

  if (liveOrcState) {
    const savedPhase = session.projectContext.phase;
    const currentPhase = liveOrcState.currentPhase || 'UNKNOWN';
    const phaseChanged = savedPhase !== currentPhase;

    console.log(
      `  Phase: ${phaseChanged ? `${C.yellow}${savedPhase} -> ${currentPhase}${C.reset}` : currentPhase}`,
    );
    console.log(`  Progress: ${liveOrcState.totalProgress || 0}% overall`);
    console.log(`  Active: ${(liveOrcState.activeTasks || []).length} task(s)`);
    console.log(`  Completed: ${(liveOrcState.completedTasks || []).length} task(s)`);

    if ((liveOrcState.errors || []).filter((e: any) => !e.resolved).length > 0) {
      const unresolved = liveOrcState.errors.filter((e: any) => !e.resolved);
      console.log(`  ${C.red}Unresolved errors: ${unresolved.length}${C.reset}`);
    }
  } else {
    console.log(`  ${C.dim}(Orchestrator state not available)${C.reset}`);
  }

  console.log('');
}

function displayActionItems(session: SessionSnapshot): void {
  // Read live task queue
  const liveQueue = readJsonSafe<any>(TASK_QUEUE_FILE);
  const pendingFromQueue: PendingTask[] = [];

  if (liveQueue?.tasks) {
    for (const task of liveQueue.tasks) {
      if (task.status === 'IN_PROGRESS' || task.status === 'QUEUED' || task.status === 'PENDING') {
        pendingFromQueue.push({
          taskId: task.id,
          title: task.title,
          status: task.status,
          progress: task.status === 'IN_PROGRESS' ? 50 : 0,
          nextSteps: task.acceptanceCriteria || [],
        });
      }
    }
  }

  // Merge saved pending tasks with live queue
  const allPending = pendingFromQueue.length > 0 ? pendingFromQueue : session.pendingTasks;

  if (allPending.length > 0) {
    console.log(`${C.bold}${C.yellow}  Pending Tasks (${allPending.length})${C.reset}`);
    for (const task of allPending.slice(0, 10)) {
      const statusColor =
        task.status === 'IN_PROGRESS' ? C.blue :
        task.status === 'QUEUED' ? C.yellow :
        C.dim;
      console.log(`  ${statusColor}[${task.status}]${C.reset} ${task.taskId}: ${task.title}`);

      if (task.nextSteps.length > 0) {
        for (const step of task.nextSteps.slice(0, 3)) {
          console.log(`    ${C.dim}- ${step}${C.reset}`);
        }
        if (task.nextSteps.length > 3) {
          console.log(`    ${C.dim}... and ${task.nextSteps.length - 3} more criteria${C.reset}`);
        }
      }
    }
    if (allPending.length > 10) {
      console.log(`  ${C.dim}... and ${allPending.length - 10} more task(s)${C.reset}`);
    }
  } else {
    console.log(`${C.green}  No pending tasks. Ready for new work.${C.reset}`);
  }

  // Check for uncommitted changes
  try {
    const { execSync } = require('node:child_process');
    const gitStatus = execSync('git status --porcelain', {
      encoding: 'utf-8',
      cwd: path.resolve(AGENTS_DIR, '..'),
      timeout: 5000,
    }).trim();

    if (gitStatus) {
      const changeCount = gitStatus.split('\n').filter(Boolean).length;
      console.log('');
      console.log(`${C.yellow}  Git: ${changeCount} uncommitted change(s) detected${C.reset}`);
      console.log(`  ${C.dim}Run 'git status' to see details${C.reset}`);
    }
  } catch {
    // Git not available; skip
  }

  console.log(`\n${C.bold}${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.includes('-l')) {
    listSessions();
    return;
  }

  let sessionId: string | undefined;
  const idIndex = args.indexOf('--id');
  if (idIndex !== -1 && args[idIndex + 1]) {
    sessionId = args[idIndex + 1];
  }

  loadSession(sessionId);
}

main().catch((err) => {
  console.error('Error loading session:', err);
  process.exit(1);
});
