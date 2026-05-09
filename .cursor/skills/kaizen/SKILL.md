---
name: kaizen
description: >-
  Guides continuous improvement, error proofing, standardization, and just-in-time
  delivery for code and process. Use when improving code quality, refactoring,
  architecture decisions, validation, error handling, or discussing incremental
  workflow improvements.
risk: unknown
source: community
date_added: '2026-02-27'
disable-model-invocation: true
---

# Kaizen: Continuous Improvement

## Overview

Small improvements, continuously. Error-proof by design. Follow what works. Build only what's needed.

**Core principle:** Many small improvements beat one big change. Prevent errors at design time, not with fixes.

## When to Use

**Always applied for:**

- Code implementation and refactoring
- Architecture and design decisions
- Process and workflow improvements
- Error handling and validation

**Philosophy:** Quality through incremental progress and prevention, not perfection through massive effort.

Additional TypeScript-heavy examples: [reference.md](reference.md).

## The Four Pillars

### 1. Continuous Improvement (Kaizen)

Small, frequent improvements compound into major gains.

#### Principles

**Incremental over revolutionary:**

- Make smallest viable change that improves quality
- One improvement at a time
- Verify each change before next
- Build momentum through small wins

**Always leave code better:**

- Fix small issues as you encounter them
- Refactor while you work (within scope)
- Update outdated comments
- Remove dead code when you see it

**Iterative refinement:**

- First version: make it work
- Second pass: make it clear
- Third pass: make it efficient
- Don't try all three at once

#### Good example

Each step is complete, tested, and working.

```typescript
// Iteration 1: Make it work
const calculateTotal = (items: Item[]) => {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
};

// Iteration 2: Make it clear (refactor)
const calculateTotal = (items: Item[]): number => {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

// Iteration 3: Make it robust (add validation)
const calculateTotal = (items: Item[]): number => {
  if (!items?.length) return 0;

  return items.reduce((total, item) => {
    if (item.price < 0 || item.quantity < 0) {
      throw new Error('Price and quantity must be non-negative');
    }
    return total + (item.price * item.quantity);
  }, 0);
};
```

#### Bad example

Overwhelming, error-prone, hard to verify.

```typescript
// Trying to do everything at once
const calculateTotal = (items: Item[]): number => {
  // Validate, optimize, add features, handle edge cases all together
  if (!items?.length) return 0;
  const validItems = items.filter(item => {
    if (item.price < 0) throw new Error('Negative price');
    if (item.quantity < 0) throw new Error('Negative quantity');
    return item.quantity > 0; // Also filtering zero quantities
  });
  // Plus caching, plus logging, plus currency conversion...
  return validItems.reduce(/* ... */); // Too many concerns at once
};
```

#### In Practice

**When implementing features:**

1. Start with simplest version that works
2. Add one improvement (error handling, validation, etc.)
3. Test and verify
4. Repeat if time permits
5. Don't try to make it perfect immediately

**When refactoring:**

- Fix one smell at a time
- Commit after each improvement
- Keep tests passing throughout
- Stop when "good enough" (diminishing returns)

**When reviewing code:**

- Suggest incremental improvements (not rewrites)
- Prioritize: critical → important → nice-to-have
- Focus on highest-impact changes first
- Accept "better than before" even if not perfect

### 2. Poka-Yoke (Error Proofing)

Design systems that prevent errors at compile/design time, not runtime.

#### Principles

**Make errors impossible:**

- Type system catches mistakes
- Compiler enforces contracts
- Invalid states unrepresentable
- Errors caught early (left of production)

**Design for safety:**

- Fail fast and loudly
- Provide helpful error messages
- Make correct path obvious
- Make incorrect path difficult

**Defense in layers:**

1. Type system (compile time)
2. Validation (runtime, early)
3. Guards (preconditions)
4. Error boundaries (graceful degradation)

#### Type system error proofing — Good

Type system prevents entire classes of errors.

```typescript
// Error: string status can be any value
type OrderBad = {
  status: string; // Can be "pending", "PENDING", "pnding", anything!
  total: number;
};

// Good: Only valid states possible
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';
type Order = {
  status: OrderStatus;
  total: number;
};

// Better: States with associated data
type Order =
  | { status: 'pending'; createdAt: Date }
  | { status: 'processing'; startedAt: Date; estimatedCompletion: Date }
  | { status: 'shipped'; trackingNumber: string; shippedAt: Date }
  | { status: 'delivered'; deliveredAt: Date; signature: string };

// Now impossible to have shipped without trackingNumber
```

More patterns (non-empty arrays, validation order, branded types, guard clauses, fail-fast config): [reference.md](reference.md).

#### In Practice

**When designing APIs:**

- Use types to constrain inputs
- Make invalid states unrepresentable
- Return `Result<T, E>` instead of throwing (when that is the project pattern)
- Document preconditions in types

**When handling errors:**

- Validate at system boundaries
- Use guards for preconditions
- Fail fast with clear messages
- Log context for debugging

**When configuring:**

- Required over optional with unsafe defaults
- Validate all config at startup
- Fail deployment if config invalid
- Don't allow partial configurations

### 3. Standardized Work

Follow established patterns. Document what works. Make good practices easy to follow.

#### Principles

**Consistency over cleverness:**

- Follow existing codebase patterns
- Don't reinvent solved problems
- New pattern only if significantly better
- Team agreement on new patterns

**Documentation lives with code:**

- README for setup and architecture
- Project rules / agent docs for AI coding conventions
- Comments for "why", not "what"
- Examples for complex patterns

**Automate standards:**

- Linters enforce style
- Type checks enforce contracts
- Tests verify behavior
- CI/CD enforces quality gates

API consistency, anti-patterns, and shared `Result`-style error handling: [reference.md](reference.md).

#### Documentation standards — Good

Documents why, when, and how.

```typescript
/**
 * Retries an async operation with exponential backoff.
 *
 * Why: Network requests fail temporarily; retrying improves reliability
 * When to use: External API calls, database operations
 * When not to use: User input validation, internal function calls
 */
const retry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  /* ... */
};
```

#### In Practice

**Before adding new patterns:**

- Search codebase for similar problems solved
- Check project conventions (rules, `AGENT.md`, etc.)
- Discuss with team if breaking from pattern
- Update docs when introducing new pattern

**When writing code:**

- Match existing file structure
- Use same naming conventions
- Follow same error handling approach
- Import from same locations

**When reviewing:**

- Check consistency with existing code
- Point to examples in codebase
- Suggest aligning with standards
- Update project docs if new standard emerges

### 4. Just-In-Time (JIT)

Build what's needed now. No more, no less. Avoid premature optimization and over-engineering.

#### Principles

**YAGNI (You Aren't Gonna Need It):**

- Implement only current requirements
- No "just in case" features
- No "we might need this later" code
- Delete speculation

**Simplest thing that works:**

- Start with straightforward solution
- Add complexity only when needed
- Refactor when requirements change
- Don't anticipate future needs

**Optimize when measured:**

- No premature optimization
- Profile before optimizing
- Measure impact of changes
- Accept "good enough" performance

#### YAGNI — Good

Simple, meets current need.

```typescript
const logError = (error: Error) => {
  console.error(error.message);
};
```

#### YAGNI — Bad

Building for imaginary future requirements.

```typescript
interface LogTransport {
  write(level: LogLevel, message: string, meta?: LogMetadata): Promise<void>;
}

class Logger {
  private transports: LogTransport[] = [];
  // Many layers for "maybe we'll need it"
}
```

#### When to add complexity

- Current requirement demands it
- Pain points identified through use
- Measured performance issues
- Multiple use cases emerged

#### Complexity only when needed — Good

Start with `$${amount.toFixed(2)}`; add currency symbols only when required; switch to `Intl.NumberFormat` only when localization is required. Each step responds to a real requirement.

#### Premature abstraction — Bad

Massive abstraction for uncertain future.

```typescript
abstract class BaseCRUDService<T> {
  abstract getAll(): Promise<T[]>;
  abstract getById(id: string): Promise<T>;
  /* ... */
}
// Building entire ORM for a single table
```

#### Premature abstraction — Good

Abstract only when pattern proven across 3+ cases.

```typescript
const getUsers = async (): Promise<User[]> => {
  return db.query('SELECT * FROM users');
};

const getUserById = async (id: string): Promise<User | null> => {
  return db.query('SELECT * FROM users WHERE id = $1', [id]);
};
```

#### Performance optimization

Ship a simple `users.filter(u => u.isActive)` when profiling says it is fast enough. Do not add caches, indexes, or exotic structures until measurement proves a bottleneck.

#### In Practice

**When implementing:**

- Solve the immediate problem
- Use straightforward approach
- Resist "what if" thinking
- Delete speculative code

**When optimizing:**

- Profile first, optimize second
- Measure before and after
- Document why optimization needed
- Keep simple version in tests

**When abstracting:**

- Wait for 3+ similar cases (Rule of Three)
- Make abstraction as simple as possible
- Prefer duplication over wrong abstraction
- Refactor when pattern clear

## Integration with Commands

The Kaizen skill guides how you work. The commands provide structured analysis:

- **`/why`**: Root cause analysis (5 Whys)
- **`/cause-and-effect`**: Multi-factor analysis (Fishbone)
- **`/plan-do-check-act`**: Iterative improvement cycles
- **`/analyse-problem`**: Comprehensive documentation (A3)
- **`/analyse`**: Smart method selection (Gemba/VSM/Muda)

Use commands for structured problem-solving. Apply skill for day-to-day development.

## Red Flags

**Violating Continuous Improvement:**

- "I'll refactor it later" (never happens)
- Leaving code worse than you found it
- Big bang rewrites instead of incremental

**Violating Poka-Yoke:**

- "Users should just be careful"
- Validation after use instead of before
- Optional config with no validation

**Violating Standardized Work:**

- "I prefer to do it my way"
- Not checking existing patterns
- Ignoring project conventions

**Violating Just-In-Time:**

- "We might need this someday"
- Building frameworks before using them
- Optimizing without measuring

## Remember

**Kaizen is about:**

- Small improvements continuously
- Preventing errors by design
- Following proven patterns
- Building only what's needed

**Not about:**

- Perfection on first try
- Massive refactoring projects
- Clever abstractions
- Premature optimization

**Mindset:** Good enough today, better tomorrow. Repeat.

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
