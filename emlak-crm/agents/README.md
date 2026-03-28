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
  skills/              Skill documents agents reference during work
    code-review.md     Code review checklist (security, architecture, TS, Prisma)
    tdd-workflow.md    TDD cycle with Vitest, RTL, and Playwright patterns
    database-review.md Prisma schema, indexes, N+1, Turkish locale, KVKK
    frontend-patterns.md Next.js 14 App Router, shadcn/ui, Zustand, React Query
    api-design.md      Express RESTful conventions, Zod, error standards, pagination
    portal-sync.md     Turkish portal integrations (Sahibinden, Hepsiemlak, Emlakjet)
    continuous-learning.md Pattern extraction, instincts, domain knowledge
  hooks/               Lifecycle hooks for development workflow
    pre-commit.sh      Pre-commit quality gate (types, lint, tests, Prisma)
    session-save.ts    Save current agent context for later resumption
    session-load.ts    Restore a previously saved session
  state/               Persistent state (JSON files)
    orchestrator-state.json
    task-queue.json
    current-session.json         Most recent session snapshot
    sessions/                    Historical session snapshots
    learned-patterns.jsonl       Extracted code/architecture patterns
    instincts.json               Agent decision heuristics
    domain-knowledge.json        Turkish RE domain facts
    learning-log.jsonl           Audit trail of learning events
    inboxes/                     Per-agent message inboxes (created at runtime)
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

## Skills System

Skills are detailed markdown documents in `agents/skills/` that provide domain-specific guidance to agents. Each skill contains checklists, code patterns, and decision frameworks that agents reference when executing tasks.

### Available Skills

| Skill | File | Used By | Description |
|---|---|---|---|
| Code Review | `skills/code-review.md` | All agents | Architecture compliance, OWASP/KVKK security, TypeScript best practices, Prisma optimization, domain terminology |
| TDD Workflow | `skills/tdd-workflow.md` | backend-dev, frontend-dev, testing | Red-Green-Refactor cycle, Vitest/RTL/Playwright patterns, test naming |
| Database Review | `skills/database-review.md` | backend-dev, architect | Prisma schema validation, index optimization, N+1 detection, Turkish locale, migration safety, KVKK retention |
| Frontend Patterns | `skills/frontend-patterns.md` | frontend-dev | App Router, Server/Client components, shadcn/ui, Zustand, React Query, Turkish i18n, responsive design |
| API Design | `skills/api-design.md` | backend-dev, architect | RESTful conventions, Zod validation, error standards, pagination, rate limiting, Turkish error messages |
| Portal Sync | `skills/portal-sync.md` | integration | Sahibinden XML, Hepsiemlak/Emlakjet REST, sync scheduling, conflict resolution, retry/recovery |
| Continuous Learning | `skills/continuous-learning.md` | orchestrator, all agents | Pattern extraction, instinct-based learning, domain knowledge accumulation, confidence scoring |

### How Skills Are Used

1. When a task is dispatched, the orchestrator attaches relevant skill references based on the task's tags and the assignee's role.
2. The assigned agent reads the skill document to understand the applicable patterns and checklists.
3. During code review, the reviewing agent uses `skills/code-review.md` as the evaluation rubric.
4. After task completion, the agent may update `skills/continuous-learning.md` with new patterns discovered.

### Adding a New Skill

1. Create a markdown file in `agents/skills/` following the existing format.
2. Register the skill in the `AgentSkill` type definition in `agents/contracts/type-definitions.ts`.
3. Document which roles and phases the skill applies to.
4. Reference the skill in relevant task definitions via tags.

## Hooks

Hooks are scripts that run at specific points in the development lifecycle, inspired by community patterns from the Claude Code ecosystem.

### Pre-Commit Hook

The pre-commit hook (`agents/hooks/pre-commit.sh`) runs before every git commit to catch quality issues early.

**What it checks:**
1. TypeScript type check (`tsc --noEmit`)
2. ESLint on changed files only (fast, targeted)
3. Affected unit tests (finds co-located test files for changed source files)
4. Prisma schema validation (only when `schema.prisma` is staged)
5. Sensitive data detection (blocks `.env`, credentials files)

**Installation:**
```bash
# Symlink the hook into .git/hooks/
ln -sf ../../agents/hooks/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Session Save/Load Hooks

These hooks provide session continuity across work sessions, allowing agents (and developers) to save their context and resume later.

**Save a session:**
```bash
# Auto-generate summary from current state
npx tsx agents/hooks/session-save.ts

# With manual context
npx tsx agents/hooks/session-save.ts \
  --agent backend-dev \
  --summary "Completed auth middleware, starting CRUD endpoints" \
  --accomplished "JWT middleware with refresh rotation" \
  --accomplished "RBAC middleware for 4 roles" \
  --blocker "Redis connection pooling config needed" \
  --note "Consider rate limiting before portal sync"
```

**Load a session:**
```bash
# Load most recent session
npx tsx agents/hooks/session-load.ts

# List all saved sessions
npx tsx agents/hooks/session-load.ts --list

# Load a specific session
npx tsx agents/hooks/session-load.ts --id session-20260328-120000-a1b2
```

**What gets saved:**
- Session ID and timestamp
- Which agent was active
- Accomplishments and summary
- Files changed (from git history)
- Blockers and pending decisions
- Active task states
- Project phase and progress
- Git branch and commit info
- Freeform notes

## Continuous Learning

The agent system accumulates knowledge over time through three mechanisms:

### 1. Pattern Extraction
After each task completion, the assigned agent extracts reusable patterns. These are stored in `agents/state/learned-patterns.jsonl` and include:
- Code patterns (e.g., "Use batch queries instead of loops for Prisma")
- Architecture decisions (e.g., "BFF endpoint for dashboard aggregation")
- Integration quirks (e.g., "Sahibinden requires plain text descriptions")

### 2. Instinct-Based Learning
Instincts are lightweight "if X then Y" heuristics with confidence scores. They are reinforced when they produce positive outcomes and weakened by contradictions. Stored in `agents/state/instincts.json`.

Example instincts:
- "When I see a Prisma query inside a loop, refactor to batch query" (confidence: 0.95)
- "When adding a new model, also add foreign key indexes" (confidence: 0.95)
- "When handling phone numbers, normalize to +90XXXXXXXXXX immediately" (confidence: 0.95)

### 3. Domain Knowledge
Facts about Turkish real estate, portal APIs, and regulations are stored in `agents/state/domain-knowledge.json`. This includes portal-specific field mappings, KVKK requirements, and market conventions.

### Confidence Scoring
All learned patterns carry a confidence score (0.0 to 1.0):
- **0.9+**: Very high confidence, always applied
- **0.7-0.89**: High confidence, applied unless context contradicts
- **0.5-0.69**: Medium confidence, applied only with strong context match
- **Below 0.3**: Flagged for review or archived

See `agents/skills/continuous-learning.md` for full details.

## Community Best Practices

This agent system integrates patterns from the Claude Code community:

### From "everything-claude-code"
- **Session persistence**: Save/load hooks for context continuity across sessions
- **Skill-based architecture**: Detailed markdown documents as reusable agent skills
- **Instinct learning**: Probabilistic heuristics that improve with experience

### From "claude-code-best-practices"
- **Pre-commit quality gates**: Targeted checks on changed files only (fast feedback)
- **Structured task output**: Every task produces typed `TaskOutput` with files created/modified
- **Phase-gated progression**: Strict phase ordering prevents premature work

### From Multi-Agent Orchestration Patterns
- **Priority-based dispatch**: Critical tasks always get dispatched first
- **Dependency resolution**: Automatic unblocking when prerequisites complete
- **Heartbeat monitoring**: Regular progress recalculation and stall detection
- **Message-based communication**: Agents communicate through inbox files, not shared state

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
- **`agents/state/current-session.json`** - Most recently saved session snapshot.
- **`agents/state/sessions/`** - Historical session snapshots for review.
- **`agents/state/learned-patterns.jsonl`** - Extracted patterns from completed work.
- **`agents/state/instincts.json`** - Agent decision heuristics with confidence scores.
- **`agents/state/domain-knowledge.json`** - Turkish real estate domain facts.
- **`project-state.json`** (project root) - High-level project phase tracking.

These files can be inspected at any time to understand the current state of the build.

## Type System

All agent system types are defined in `agents/contracts/type-definitions.ts`:

### Core Types
- `ProjectPhase`, `AgentRole`, `TaskStatus`, `Priority` - Enums for system state
- `TaskDefinition`, `TaskOutput` - Task structure and results
- `AgentMessage` - Inter-agent communication
- `OrchestratorState`, `ProjectState` - System state

### Skills & Learning Types
- `AgentSkill` - Skill document metadata
- `LearnedPattern` - Extracted code/architecture patterns
- `LearningInstinct` - Decision heuristics with confidence
- `DomainKnowledgeEntry` - Domain-specific facts

### Session Types
- `SessionContext` - Full session snapshot for save/load
- `SessionFileChange`, `SessionBlocker`, `SessionPendingTask` - Session details

### Configuration Types
- `HeartbeatConfig` - Orchestrator timing and schedule configuration
- `DEFAULT_HEARTBEAT_CONFIG` - Sensible defaults for all intervals

### Portal Types
- `PortalConfig` - Portal connection configuration
- `PortalSyncResult` - Sync operation outcome
- `PortalHealth` - Portal health status
