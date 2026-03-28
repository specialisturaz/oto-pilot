# Emlak CRM - Agent Orchestration System

An automated task coordination system for building the Turkish Real Estate CRM. The orchestrator manages a task queue, resolves dependencies, dispatches work to specialized sub-agents, and tracks project progress through defined phases.

## Architecture

```
agents/
  contracts/           Shared type definitions for all agents
    type-definitions.ts
  orchestrator/        Main orchestrator and supporting modules
    index.ts           Entry point - main loop, dispatching, reporting
    task-manager.ts    Priority queue, dependency resolution, task lifecycle
    state-manager.ts   File I/O, phase transitions, progress calculation
  state/               Persistent state (JSON files)
    orchestrator-state.json
    task-queue.json
    inboxes/           Per-agent message inboxes (created at runtime)
  logs/                Daily log files (created at runtime)
  architect/           Architect agent workspace
  backend-dev/         Backend developer agent workspace
  frontend-dev/        Frontend developer agent workspace
  integration/         Integration specialist agent workspace
  testing/             Testing agent workspace
  devops/              DevOps agent workspace
  research/            Research agent workspace
```

## Project Phases

The project progresses through these phases in order:

| # | Phase | Description |
|---|-------|-------------|
| 1 | INIT | Project scaffolding, type definitions, agent setup |
| 2 | RESEARCH | Portal APIs, KVKK compliance, Turkish address data |
| 3 | ARCHITECTURE | Database schema, backend/frontend architecture |
| 4 | CORE_BACKEND | Express server, auth, CRUD APIs |
| 5 | CORE_FRONTEND | Next.js app, auth UI, main pages |
| 6 | FEATURE_DEV | Messaging, calendar, notifications, commissions |
| 7 | INTEGRATIONS | Portal adapters, email service, file uploads |
| 8 | TESTING | API tests, E2E tests |
| 9 | POLISH | Localization, performance, seed data |
| 10 | COMPLETE | All work finished |

A phase completes when all its tasks reach the COMPLETED status. The orchestrator then automatically transitions to the next phase.

## How to Start the Orchestrator

```bash
# From the project root:
npm run agent:start

# Or directly:
npx tsx agents/orchestrator/index.ts

# View current progress without starting the loop:
npx tsx agents/orchestrator/index.ts --report

# Validate the task queue (check for circular dependencies):
npx tsx agents/orchestrator/index.ts --validate
```

## How It Works

### Main Loop

The orchestrator runs a periodic tick (every 5 seconds):

1. **Phase check** - If all tasks in the current phase are done, transition to the next phase.
2. **Dependency resolution** - Re-check blocked tasks to see if their dependencies are now met.
3. **Task dispatching** - Pick the highest-priority ready tasks and dispatch them (up to the concurrency limit of 5).
4. **Stall detection** - Flag tasks that have been IN_PROGRESS for more than 30 minutes.

A separate heartbeat (every 30 seconds) recalculates and logs overall progress.

### Task Lifecycle

```
PENDING  ->  QUEUED  ->  IN_PROGRESS  ->  COMPLETED
                |                |
                v                v
             BLOCKED          FAILED (retry or permanent)
                                |
                                v
                            CANCELLED
```

- **PENDING**: Created but dependencies not yet checked.
- **QUEUED**: Dependencies met, waiting for dispatch.
- **IN_PROGRESS**: Dispatched to an agent.
- **BLOCKED**: Waiting on unmet dependencies.
- **COMPLETED**: Finished successfully with output recorded.
- **FAILED**: Failed after exhausting retries (max 2 retries per task).
- **CANCELLED**: Manually cancelled.

### Priority Queue

Tasks are sorted by priority weight (CRITICAL > HIGH > MEDIUM > LOW), then by creation date (oldest first). The orchestrator always dispatches the highest-priority ready tasks first.

### Dependency Resolution

Each task lists its dependencies by task ID. A task cannot start until all its dependencies are COMPLETED. When a task completes, the orchestrator checks all downstream tasks and unblocks any whose dependencies are now fully satisfied.

## How Agents Communicate

Agents communicate through JSON files:

1. **Task assignment**: The orchestrator writes a message to `agents/state/inboxes/{agent-role}.jsonl`.
2. **Task completion**: The agent calls `orchestrator.onTaskCompleted(taskId, output)` with the list of files created/modified and a summary.
3. **Task failure**: The agent calls `orchestrator.onTaskFailed(taskId, reason)`.
4. **Broadcast messages**: Phase changes and other announcements are sent to all agent inboxes.

Messages follow the `AgentMessage` interface defined in `agents/contracts/type-definitions.ts`.

## How to Add a New Agent

1. Create a directory under `agents/` for the agent (e.g., `agents/my-agent/`).

2. Add the role to the `AGENT_ROLES` array in `agents/contracts/type-definitions.ts`:
   ```typescript
   export const AGENT_ROLES = [
     // ... existing roles
     'my-agent',
   ] as const;
   ```

3. Create the agent entry point (e.g., `agents/my-agent/index.ts`):
   ```typescript
   import * as fs from 'node:fs';
   import * as path from 'node:path';
   import type { AgentMessage } from '../contracts/type-definitions.js';

   const INBOX = path.resolve(import.meta.dirname, '..', 'state', 'inboxes', 'my-agent.jsonl');

   function readInbox(): AgentMessage[] {
     if (!fs.existsSync(INBOX)) return [];
     return fs.readFileSync(INBOX, 'utf-8')
       .trim()
       .split('\n')
       .filter(Boolean)
       .map((line) => JSON.parse(line));
   }

   // Process assigned tasks...
   ```

4. Add tasks to `agents/state/task-queue.json` with `"assignee": "my-agent"`.

5. The orchestrator will automatically dispatch tasks to the agent's inbox when dependencies are met.

## State Files

All state is persisted as JSON for transparency and debuggability:

- **`agents/state/orchestrator-state.json`** - Orchestrator runtime state (active tasks, progress, message log, errors).
- **`agents/state/task-queue.json`** - All task definitions with status, dependencies, and output.
- **`project-state.json`** (project root) - High-level project phase tracking.

These files can be inspected at any time to understand the current state of the build.
