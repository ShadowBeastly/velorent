---
name: refactor-delegate
description: "Delegate refactoring tasks to sub-agents with proper guardrails, verification, and rollback safety. Use this skill when orchestrating multi-phase refactoring, delegating code changes to agents, or coordinating parallel agent work. Triggers on agent delegation, refactoring orchestration, and multi-phase code migrations."
---

# refactor-delegate

Use this skill to safely delegate refactoring tasks from an orchestrator (Opus) to focused Sonnet sub-agents. It provides the task template, decision rules, verification steps, and error recovery protocol every delegation must follow.

---

## 1. Agent Task Template

Every sub-agent delegation MUST use this exact structure. Fill in the bracketed sections before spawning.

```
You are a focused refactoring agent. Your task is precisely scoped — do NOT touch files outside your assignment.

## Task
[exact task description from the plan]

## Files to Read First
[list of files the agent must read before making changes]

## Files to Modify
[exact list of files the agent may change — NOTHING else]

## Rules
- Read ALL listed files before making any changes
- Only modify files in the "Files to Modify" list
- Keep backward compatibility — old exports/names must still work
- Run `npm run build` when done — it must pass with zero errors
- If build fails, fix the errors before reporting back
- Do NOT add comments like "// removed" or "// deprecated" — just make the change
- Do NOT refactor surrounding code — only change what's specified

## Verification
Run: npm run build && npm test
Both must pass. If they don't, fix the issues.

## Report Back
List exactly which files you changed and what you changed in each.
```

---

## 2. Parallel vs Sequential Decision Matrix

Before spawning agents, decide execution order using this matrix.

**Run sequentially when:**
- Task B reads or imports output from Task A
- The refactor touches DB schema or migrations (migrations must run in order)
- Two tasks share a utility file or type definition
- A task renames an export that another task consumes

**Run in parallel when:**
- Tasks operate on completely different files
- Tasks have no shared state or shared imports
- Concerns are independent (e.g., updating `locivaNavigationItems.js` while updating a settings page)

**Never run in parallel:**
- Two agents assigned to modify the same file — always sequential

When in doubt, run sequentially. The cost of a merge conflict or broken import is higher than the time saved.

---

## 3. Verification Protocol

Run this checklist after every agent reports back, before proceeding to the next phase.

```
1. Read each changed file — does the change match the task description exactly?
2. npm run build — must complete with zero errors
3. npm test — no regressions introduced
4. If a migration file was written — validate with the supabase-migrate checklist
5. If UI components changed — confirm all imports resolve and no components are missing
```

Do not mark a phase complete until all five checks pass.

---

## 4. Error Recovery

When an agent returns with problems, follow this protocol:

| Problem | Response |
|---|---|
| Agent introduced build errors | Spawn new agent with: error output + original task + fix instruction |
| Agent modified files outside the assignment | `git checkout` the unauthorized files, re-delegate the original task |
| Agent broke tests | Spawn new agent with: test output + original task + fix instruction |

Max 2 retry attempts per task. If the second retry also fails, stop and escalate to the user with a summary of what was tried and what failed.

Do not attempt a third automated retry — manual review is required at that point.

---

## 5. Commit Protocol

After each completed and verified phase:

1. Stage only the files changed in that phase — never `git add -A`
2. Use this commit message format: `refactor(phase-X.Y): [kurze Beschreibung]`
3. Push to remote after each full phase completes

Example: `refactor(phase-1.2): extract booking helpers into shared util`

---

## Quick Reference

```
Plan phases
  └─ For each phase: decide parallel vs sequential
       └─ Spawn agent(s) with full task template
            └─ Agent reports back
                 └─ Run verification protocol
                      ├─ Pass → commit + next phase
                      └─ Fail → error recovery (max 2 retries)
```
