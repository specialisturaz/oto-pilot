#!/usr/bin/env bash
# =============================================================================
# Pre-Commit Hook for Emlak CRM
# =============================================================================
# Runs before each commit to ensure code quality. Install by copying or
# symlinking to .git/hooks/pre-commit:
#
#   ln -sf ../../agents/hooks/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed (commit blocked)
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# ---- Helper functions -------------------------------------------------------

print_header() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}

print_pass() {
  echo -e "  ${GREEN}PASS${NC} $1"
}

print_fail() {
  echo -e "  ${RED}FAIL${NC} $1"
  FAILURES=$((FAILURES + 1))
}

print_skip() {
  echo -e "  ${YELLOW}SKIP${NC} $1"
}

# ---- Get changed files ------------------------------------------------------

# Staged TypeScript/TSX files
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

# Staged Prisma schema changes
STAGED_PRISMA=$(git diff --cached --name-only --diff-filter=ACM | grep -E 'schema\.prisma$' || true)

# All staged files
STAGED_ALL=$(git diff --cached --name-only --diff-filter=ACM || true)

if [ -z "$STAGED_ALL" ]; then
  echo -e "${GREEN}No staged files to check. Proceeding with commit.${NC}"
  exit 0
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Emlak CRM - Pre-Commit Checks${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Staged files: $(echo "$STAGED_ALL" | wc -l | tr -d ' ')"

# ---- 1. TypeScript Type Check -----------------------------------------------

print_header "TypeScript Type Check"

if [ -n "$STAGED_TS_FILES" ]; then
  if npx tsc --noEmit --pretty 2>&1; then
    print_pass "TypeScript compilation successful"
  else
    print_fail "TypeScript type errors found"
  fi
else
  print_skip "No TypeScript files staged"
fi

# ---- 2. ESLint on Changed Files ---------------------------------------------

print_header "ESLint"

if [ -n "$STAGED_TS_FILES" ]; then
  # Run ESLint only on staged files for speed
  ESLINT_FILES=""
  for file in $STAGED_TS_FILES; do
    if [ -f "$file" ]; then
      ESLINT_FILES="$ESLINT_FILES $file"
    fi
  done

  if [ -n "$ESLINT_FILES" ]; then
    if npx eslint $ESLINT_FILES --max-warnings 0 2>&1; then
      print_pass "ESLint passed on $(echo "$STAGED_TS_FILES" | wc -l | tr -d ' ') file(s)"
    else
      print_fail "ESLint errors found"
    fi
  else
    print_skip "No existing TypeScript files to lint"
  fi
else
  print_skip "No TypeScript files staged"
fi

# ---- 3. Run Affected Tests --------------------------------------------------

print_header "Affected Tests"

if [ -n "$STAGED_TS_FILES" ]; then
  # Build a list of test files related to the changed source files
  TEST_PATTERNS=""
  for file in $STAGED_TS_FILES; do
    # Skip if the file is itself a test file
    if echo "$file" | grep -qE '\.test\.(ts|tsx)$'; then
      TEST_PATTERNS="$TEST_PATTERNS $file"
      continue
    fi

    # Look for a co-located test file
    dir=$(dirname "$file")
    base=$(basename "$file" .ts)
    base=$(basename "$base" .tsx)

    # Check common test file locations
    for candidate in \
      "$dir/${base}.test.ts" \
      "$dir/${base}.test.tsx" \
      "$dir/__tests__/${base}.test.ts" \
      "$dir/__tests__/${base}.test.tsx" \
      "tests/unit/${base}.test.ts" \
    ; do
      if [ -f "$candidate" ]; then
        TEST_PATTERNS="$TEST_PATTERNS $candidate"
      fi
    done
  done

  if [ -n "$TEST_PATTERNS" ]; then
    if npx vitest run $TEST_PATTERNS --reporter=verbose 2>&1; then
      print_pass "All affected tests passed"
    else
      print_fail "Some tests failed"
    fi
  else
    print_skip "No test files found for changed files"
  fi
else
  print_skip "No TypeScript files staged"
fi

# ---- 4. Prisma Schema Validation --------------------------------------------

print_header "Prisma Schema"

if [ -n "$STAGED_PRISMA" ]; then
  if npx prisma validate 2>&1; then
    print_pass "Prisma schema is valid"
  else
    print_fail "Prisma schema has errors"
  fi

  # Also check if prisma client needs regeneration
  if npx prisma generate --dry-run 2>&1 | grep -q "already up to date"; then
    print_pass "Prisma client is up to date"
  else
    echo -e "  ${YELLOW}WARN${NC} Prisma client may need regeneration (run: npx prisma generate)"
  fi
else
  print_skip "No Prisma schema changes"
fi

# ---- 5. Check for Sensitive Data --------------------------------------------

print_header "Sensitive Data Check"

SENSITIVE_PATTERNS='(password|secret|api_key|apiKey|private_key|privateKey|DATABASE_URL|REDIS_URL)[\s]*[=:][\s]*["\x27][^\s]+'

SENSITIVE_FOUND=false
for file in $STAGED_ALL; do
  if [ -f "$file" ]; then
    # Skip known config files
    if echo "$file" | grep -qE '\.(env\.example|env\.template|md)$'; then
      continue
    fi
    if echo "$file" | grep -qE '(\.env|credentials|secrets)'; then
      print_fail "Potentially sensitive file staged: $file"
      SENSITIVE_FOUND=true
    fi
  fi
done

if [ "$SENSITIVE_FOUND" = false ]; then
  print_pass "No sensitive files detected in staging"
fi

# ---- Results ----------------------------------------------------------------

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}  COMMIT BLOCKED: $FAILURES check(s) failed${NC}"
  echo -e "${RED}  Fix the issues above and try again.${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 1
else
  echo -e "${GREEN}  ALL CHECKS PASSED${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 0
fi
