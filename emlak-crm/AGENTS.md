# AGENTS.md - Emlak CRM Agent Framework

> Adapted from [obra/superpowers](https://github.com/obra/superpowers) and [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) for the Emlak CRM Turkish real estate project.

## Overview

This project uses a subagent-driven development approach. Agents are specialized Claude Code instances with defined responsibilities, model assignments, and tool permissions. Use the appropriate agent for each task to get focused, high-quality output.

## Available Agents

### Critical Review Agents (Model: Opus)

These agents perform judgment-heavy tasks requiring deep analysis.

| Agent | File | Purpose | Tools |
|-------|------|---------|-------|
| **code-reviewer** | .claude/agents/code-reviewer.md | Reviews completed work against plans and coding standards | Read, Grep, Glob |
| **security-auditor** | .claude/agents/security-auditor.md | Security audits: auth, access control, KVKK compliance | Read, Grep, Glob |
| **database-reviewer** | .claude/agents/database-reviewer.md | Prisma schema, queries, migrations, multi-tenant isolation | Read, Grep, Glob, Bash |

### Development Agents (Model: Sonnet)

These agents write code, run tests, and build features.

| Agent | File | Purpose | Tools |
|-------|------|---------|-------|
| **frontend-developer** | .claude/agents/frontend-developer.md | Next.js pages, React components, TailwindCSS | Read, Write, Edit, Bash, Glob, Grep |
| **backend-developer** | configured in settings.json | Express routes, services, Prisma queries | Read, Write, Edit, Bash, Glob, Grep |
| **test-runner** | .claude/agents/test-runner.md | Vitest and Playwright tests, TDD workflow | Read, Write, Edit, Bash, Glob, Grep |
| **performance-analyzer** | .claude/agents/performance-analyzer.md | Bottleneck identification, optimization | Read, Grep, Glob, Bash |
| **prisma-specialist** | configured in settings.json | Schema design, migrations, complex queries | Read, Write, Edit, Bash, Glob, Grep |

## Available Skills

Skills are reference guides loaded by agents. Located in .claude/skills/.

| Skill | File | When to Use |
|-------|------|-------------|
| **prisma-postgresql** | .claude/skills/prisma-postgresql.md | Schema, queries, migrations, PostgreSQL |
| **nextjs-react** | .claude/skills/nextjs-react.md | Pages, components, state, forms |
| **express-api** | .claude/skills/express-api.md | Routes, middleware, controllers, services |
| **typescript-patterns** | .claude/skills/typescript-patterns.md | Types, Zod schemas, strict mode |
| **docker-deployment** | .claude/skills/docker-deployment.md | Docker, CI/CD, nginx, production |

## Auto-Loaded Skills

These skills are loaded automatically (configured in .claude/settings.json):

- **verification-before-completion** (superpowers pattern): Never claim work is complete without running verification commands. Evidence before assertions.
- **systematic-debugging** (superpowers pattern): Follow four-phase process for any bug: Root Cause -> Pattern Analysis -> Hypothesis -> Implementation.

## Workflow Patterns

### Subagent-Driven Development (Recommended)

1. **Plan** -- Break work into independent tasks
2. **Dispatch** -- Fresh subagent per task with precise context
3. **Implement** -- Subagent implements using TDD, commits
4. **Review (Spec)** -- code-reviewer checks implementation matches spec
5. **Review (Quality)** -- code-reviewer checks code quality, security, performance
6. **Fix** -- Implementer fixes any issues found
7. **Repeat** -- Next task until all complete
8. **Final Review** -- Full implementation review before merge

### TDD Workflow

All implementation follows Red-Green-Refactor:

1. **RED:** Write a failing test that describes expected behavior
2. **Verify RED:** Run the test, confirm it fails for the right reason
3. **GREEN:** Write minimal code to make the test pass
4. **Verify GREEN:** Run the test, confirm it passes
5. **REFACTOR:** Clean up code while keeping tests green
6. **COMMIT:** Commit the working increment

### Verification Protocol

Before claiming any work is complete:

1. Run the relevant test command
2. Read the full output
3. Confirm the actual result matches the claim
4. Only then state the result

NO shortcuts. NO "should pass". NO "looks correct". Run the command.

## Model Assignment Strategy

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Architecture decisions | Opus | Requires broad understanding and design judgment |
| Code review | Opus | Must catch subtle bugs and architectural violations |
| Security audit | Opus | Critical findings require deep analysis |
| Database review | Opus | Schema and query optimization need expert judgment |
| Feature implementation | Sonnet | Well-specified tasks with clear boundaries |
| Test writing | Sonnet | Needs good test design |
| Bug fixes | Sonnet | Follow systematic debugging then implement |
| Performance analysis | Sonnet | Measurement-driven systematic process |
| Linting/formatting | Haiku | Mechanical operations |
| File search/exploration | Haiku | Simple lookup tasks |

## Tool Permissions by Role

| Role | Read | Write | Edit | Bash | Glob | Grep |
|------|------|-------|------|------|------|------|
| Reviewers | Yes | No | No | No | Yes | Yes |
| DB reviewer | Yes | No | No | Yes (queries) | Yes | Yes |
| Developers | Yes | Yes | Yes | Yes | Yes | Yes |
| Test runner | Yes | Yes | Yes | Yes | Yes | Yes |
| Perf analyzer | Yes | No | No | Yes (profiling) | Yes | Yes |

## Project-Specific Context

All agents should be aware of:

- **Domain:** Turkish real estate (emlak) -- see CLAUDE.md for terminology
- **Multi-tenant:** All data scoped by Office (emlak ofisi)
- **Deal Pipeline:** INQUIRY -> SHOWING -> NEGOTIATION -> OFFER -> DEPOSIT -> CONTRACT -> TAPU_TRANSFER -> COMPLETED
- **Commissions:** 2% buyer + 2% seller for sales, 1 month rent for rentals
- **Portals:** sahibinden.com, hepsiemlak.com, emlakjet, zingat, endeksa
- **Locations:** 81 Il (provinces), 973 Ilce (districts), Mahalle (neighborhoods)
- **Currency:** TRY primary, USD/EUR/GBP supported
- **Timezone:** Europe/Istanbul (store UTC, display local)
- **Language:** Turkish UI labels, English code identifiers

## Hooks (in .claude/settings.json)

- **SessionStart:** Prints environment info (Node version, git branch)
- **PreCommit:** Runs ESLint on staged TypeScript files

## File Structure

    .claude/
      agents/
        code-reviewer.md
        security-auditor.md
        database-reviewer.md
        frontend-developer.md
        test-runner.md
        performance-analyzer.md
      skills/
        prisma-postgresql.md
        nextjs-react.md
        express-api.md
        typescript-patterns.md
        docker-deployment.md
      settings.json
