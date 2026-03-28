# Continuous Learning Skill

Agents reference this document to accumulate domain knowledge, extract patterns from completed tasks, and improve decision-making over time. The learning system follows an instinct-based model where observations from real work feed back into agent behavior.

---

## 1. Pattern Extraction from Completed Tasks

After every task reaches COMPLETED status, the assigned agent MUST run a pattern extraction pass. This captures what worked, what did not, and any reusable patterns discovered.

### Extraction Template
```json
{
  "patternId": "pattern-{timestamp}-{short-hash}",
  "extractedAt": "2026-03-28T12:00:00Z",
  "sourceTaskId": "task-xyz",
  "sourceAgent": "backend-dev",
  "category": "code | architecture | testing | integration | performance | domain",
  "pattern": {
    "name": "Descriptive name of the pattern",
    "context": "When does this pattern apply?",
    "problem": "What problem does it solve?",
    "solution": "What is the approach?",
    "codeExample": "Optional code snippet demonstrating the pattern",
    "antiPattern": "What to avoid (if applicable)"
  },
  "confidence": 0.8,
  "applicability": ["backend", "frontend", "database", "integration"],
  "tags": ["prisma", "n-plus-one", "optimization"]
}
```

### Storage
Extracted patterns are saved to `agents/state/learned-patterns.jsonl` (JSON Lines format, one pattern per line). This file grows over time and serves as the collective knowledge base.

```typescript
// Example: saving a learned pattern
import * as fs from 'node:fs';
import * as path from 'node:path';

const PATTERNS_FILE = path.resolve(__dirname, '../state/learned-patterns.jsonl');

function savePattern(pattern: LearnedPattern): void {
  const line = JSON.stringify(pattern) + '\n';
  fs.appendFileSync(PATTERNS_FILE, line, 'utf-8');
}
```

### When to Extract

| Trigger | What to Extract |
|---|---|
| Task completed successfully | Effective approaches, reusable code patterns |
| Task failed then succeeded on retry | What caused the failure, how it was fixed |
| Code review found issues | Common mistakes to avoid |
| Performance issue discovered | Optimization techniques |
| Portal sync edge case handled | Portal-specific quirks |
| Database query optimized | Query patterns, index strategies |

---

## 2. Instinct-Based Learning

Instincts are lightweight decision heuristics that agents accumulate. Unlike formal rules, instincts are probabilistic and context-dependent. They represent "gut feelings" backed by experience.

### Instinct Structure
```json
{
  "instinctId": "instinct-{id}",
  "createdAt": "2026-03-28T12:00:00Z",
  "updatedAt": "2026-03-28T14:00:00Z",
  "agent": "backend-dev",
  "trigger": "When I see X...",
  "action": "I should do Y...",
  "reason": "Because in the past, Z happened",
  "confidence": 0.7,
  "reinforcements": 3,
  "contradictions": 0,
  "examples": [
    {
      "taskId": "task-123",
      "outcome": "positive",
      "notes": "Applied this instinct, result was good"
    }
  ]
}
```

### Instinct Categories

#### Code Quality Instincts
```
TRIGGER: Prisma query inside a loop
ACTION:  Refactor to use include or batch query
REASON:  N+1 queries caused 800ms response times in property list endpoint
CONFIDENCE: 0.95
```

```
TRIGGER: Function longer than 50 lines
ACTION:  Extract helper functions, consider service decomposition
REASON:  Long functions in commission-service.ts led to 3 bugs during testing
CONFIDENCE: 0.80
```

```
TRIGGER: Catch block with generic error type
ACTION:  Add specific error handling, at minimum log the error type
REASON:  Swallowed errors in portal sync caused silent data loss
CONFIDENCE: 0.90
```

#### Architecture Instincts
```
TRIGGER: New model needs to be added to Prisma schema
ACTION:  Also add indexes for foreign keys and common query patterns
REASON:  Forgot indexes on PortalListing.propertyId; query took 2s until indexed
CONFIDENCE: 0.95
```

```
TRIGGER: Frontend component needs data from multiple endpoints
ACTION:  Consider adding a BFF (Backend For Frontend) endpoint that aggregates the data
REASON:  Dashboard page made 7 API calls; reduced to 1 with BFF endpoint
CONFIDENCE: 0.75
```

#### Domain Instincts (Turkish Real Estate)
```
TRIGGER: Property price comparison or sorting
ACTION:  Always normalize to TRY before comparing (use daily exchange rates)
REASON:  Properties listed in USD sorted incorrectly when mixed with TRY listings
CONFIDENCE: 0.90
```

```
TRIGGER: Address/location data from user input
ACTION:  Validate against Il/Ilce/Mahalle hierarchy; do not trust free-text input
REASON:  Users entered "Kadikoy" for both Istanbul and a neighborhood in Yalova
CONFIDENCE: 0.85
```

```
TRIGGER: Commission calculation
ACTION:  Check if deal has both buyer and seller commission entries; warn if missing
REASON:  Several deals had only seller-side commission; buyer-side was lost
CONFIDENCE: 0.80
```

```
TRIGGER: Phone number from form input
ACTION:  Normalize to +90XXXXXXXXXX format immediately on input
REASON:  Users enter as 0555..., 555..., +90555...; inconsistent formats break dedup
CONFIDENCE: 0.95
```

### Reinforcement and Decay

When an instinct proves correct in a new context:
```typescript
function reinforceInstinct(instinctId: string, taskId: string, outcome: 'positive' | 'negative'): void {
  const instinct = loadInstinct(instinctId);

  if (outcome === 'positive') {
    instinct.reinforcements += 1;
    instinct.confidence = Math.min(0.99, instinct.confidence + 0.05);
  } else {
    instinct.contradictions += 1;
    instinct.confidence = Math.max(0.1, instinct.confidence - 0.1);
  }

  instinct.examples.push({ taskId, outcome, notes: '' });
  instinct.updatedAt = new Date().toISOString();

  saveInstinct(instinct);
}
```

Instincts with confidence below 0.3 are flagged for review. Instincts with confidence below 0.1 are automatically archived.

---

## 3. Domain Knowledge Accumulation

### Turkish Real Estate Knowledge Base
Agents accumulate domain-specific knowledge that does not change often but is critical for correct behavior.

#### Static Knowledge (embedded in agents)

**Property Types and Their Characteristics**
```json
{
  "DAIRE": {
    "description": "Apartment unit (most common in Turkey)",
    "typicalMetreKare": [50, 200],
    "hasAidat": true,
    "hasKatInfo": true,
    "commonFeatures": ["asansor", "otopark", "guvenlik", "yuzme-havuzu"]
  },
  "VILLA": {
    "description": "Detached villa",
    "typicalMetreKare": [150, 500],
    "hasAidat": false,
    "hasKatInfo": false,
    "commonFeatures": ["bahce", "garaj", "yuzme-havuzu", "somineli"]
  },
  "ARSA": {
    "description": "Land plot",
    "typicalMetreKare": [200, 10000],
    "hasAidat": false,
    "hasKatInfo": false,
    "specialFields": ["adaNo", "parselNo", "imarDurumu", "gabari"]
  }
}
```

**Deal Pipeline Stage Durations (Learned)**
```json
{
  "averageStageDurations": {
    "INQUIRY_TO_SHOWING": "3-5 days",
    "SHOWING_TO_NEGOTIATION": "1-2 weeks",
    "NEGOTIATION_TO_OFFER": "1-3 weeks",
    "OFFER_TO_DEPOSIT": "1-3 days",
    "DEPOSIT_TO_CONTRACT": "1-2 weeks",
    "CONTRACT_TO_TAPU": "2-4 weeks",
    "TOTAL_AVERAGE": "2-3 months for sales"
  },
  "source": "Accumulated from 150+ completed deals in test data",
  "lastUpdated": "2026-03-28"
}
```

**Portal-Specific Knowledge**
```json
{
  "sahibinden": {
    "maxImages": 20,
    "maxTitleLength": 100,
    "maxDescriptionLength": 4000,
    "requiredFields": ["title", "price", "category", "il", "ilce"],
    "quirks": [
      "Description must be plain text (no HTML)",
      "Price must be integer for TRY",
      "Images must be JPEG or PNG, max 5MB each",
      "Feed is pulled by their servers, not pushed"
    ]
  },
  "hepsiemlak": {
    "maxImages": 30,
    "maxTitleLength": 150,
    "requiredFields": ["baslik", "fiyat", "emlakTipi", "il", "ilce"],
    "quirks": [
      "API returns 429 aggressively; respect Retry-After header",
      "Location IDs must match their internal hierarchy (not our UUIDs)",
      "Status updates may take 5-10 minutes to reflect"
    ]
  }
}
```

### Dynamic Knowledge (accumulated during runtime)

Dynamic knowledge is captured in `agents/state/domain-knowledge.json`:

```json
{
  "lastUpdated": "2026-03-28T12:00:00Z",
  "entries": [
    {
      "id": "dk-001",
      "category": "portal",
      "topic": "Sahibinden category mapping for isyeri",
      "content": "Isyeri (workplace) maps to 'isyeri-satilik' for sales and 'isyeri-kiralik' for rental. There is no separate sub-category for 'ofis' in sahibinden; use 'isyeri-satilik-ofis' instead.",
      "learnedFrom": "task-portal-001",
      "confidence": 0.9
    },
    {
      "id": "dk-002",
      "category": "regulation",
      "topic": "KVKK consent requirements for phone marketing",
      "content": "Under KVKK Article 5(2)(c), existing customer relationships allow contact for similar services. However, cold outreach requires explicit opt-in consent with a recorded timestamp.",
      "learnedFrom": "research-kvkk-001",
      "confidence": 0.85
    }
  ]
}
```

---

## 4. Confidence Scoring for Learned Patterns

### Confidence Scale

| Range | Label | Meaning |
|---|---|---|
| 0.90 - 1.00 | Very High | Well-tested, multiple reinforcements, no contradictions |
| 0.70 - 0.89 | High | Proven in practice, minor exceptions possible |
| 0.50 - 0.69 | Medium | Works in most cases, needs more validation |
| 0.30 - 0.49 | Low | Tentative, may not generalize well |
| 0.00 - 0.29 | Very Low | Unreliable, needs rethinking or archiving |

### Confidence Calculation
```typescript
function calculateConfidence(pattern: LearnedPattern): number {
  const base = 0.5; // Start at medium confidence

  // Reinforcement bonus: +0.05 per positive outcome, diminishing
  const reinforcementBonus = Math.min(0.4, pattern.reinforcements * 0.05);

  // Contradiction penalty: -0.1 per negative outcome
  const contradictionPenalty = pattern.contradictions * 0.1;

  // Age decay: patterns older than 30 days without reinforcement lose confidence
  const daysSinceUpdate = (Date.now() - new Date(pattern.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  const ageDecay = daysSinceUpdate > 30 ? Math.min(0.2, (daysSinceUpdate - 30) * 0.002) : 0;

  // Scope bonus: patterns that apply to multiple areas are more valuable
  const scopeBonus = Math.min(0.1, (pattern.applicability.length - 1) * 0.03);

  const confidence = Math.max(0, Math.min(1,
    base + reinforcementBonus - contradictionPenalty - ageDecay + scopeBonus,
  ));

  return Math.round(confidence * 100) / 100;
}
```

### Using Confidence in Decision-Making
```typescript
function shouldApplyPattern(pattern: LearnedPattern, context: TaskContext): boolean {
  // Always apply very high confidence patterns
  if (pattern.confidence >= 0.9) return true;

  // Apply high confidence patterns unless context explicitly contradicts
  if (pattern.confidence >= 0.7) return !contextContradictsPattern(pattern, context);

  // Medium confidence: apply only if context strongly matches
  if (pattern.confidence >= 0.5) return contextStronglyMatches(pattern, context);

  // Low confidence: skip, but log that the pattern was considered
  logPatternConsidered(pattern, context, 'skipped-low-confidence');
  return false;
}
```

---

## 5. Learning Workflow

### After Each Task Completion
1. **Extract**: Identify 0-3 patterns from the completed work.
2. **Compare**: Check if similar patterns already exist in `learned-patterns.jsonl`.
3. **Merge or Create**: If a similar pattern exists, reinforce it. Otherwise, create a new one.
4. **Update Instincts**: If the task validated or contradicted any instincts, update their confidence.
5. **Domain Knowledge**: If new domain facts were discovered, add to `domain-knowledge.json`.

### Weekly Review (Automated)
The orchestrator runs a weekly review of the learning system:
1. Archive patterns with confidence < 0.1.
2. Flag patterns with confidence < 0.3 for human review.
3. Recalculate confidence scores for all active patterns.
4. Generate a summary of new learnings for the week.
5. Identify knowledge gaps (areas where few patterns exist).

### Knowledge Query
Agents can query the knowledge base before starting a task:
```typescript
function queryRelevantPatterns(task: TaskDefinition): LearnedPattern[] {
  const allPatterns = loadAllPatterns();

  return allPatterns
    .filter((p) => {
      // Match by tags
      const tagMatch = p.tags.some((tag) => task.tags.includes(tag));
      // Match by applicability
      const areaMatch = p.applicability.some((area) =>
        task.assignee.includes(area) || task.tags.includes(area),
      );
      // Minimum confidence threshold
      const confident = p.confidence >= 0.5;

      return (tagMatch || areaMatch) && confident;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}
```

---

## 6. Files and Storage

| File | Purpose | Format |
|---|---|---|
| `agents/state/learned-patterns.jsonl` | All extracted patterns | JSON Lines |
| `agents/state/instincts.json` | Agent decision heuristics | JSON array |
| `agents/state/domain-knowledge.json` | Domain-specific facts | JSON object |
| `agents/state/learning-log.jsonl` | Audit trail of learning events | JSON Lines |

### Initialization
If these files do not exist, the orchestrator creates them with empty initial content during startup. Agents MUST handle the case where files are empty or missing.
