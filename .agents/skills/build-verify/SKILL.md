---
name: build-verify
description: "Quick build and test verification after code changes. Triggers after editing JS/JSX/TS/TSX files, after agent tasks complete, or when the user asks to verify, check, or test changes. Run this after every significant code change to catch issues early."
metadata:
  bashPattern:
    - "npm\\s+run\\s+(build|test|lint)"
---

## 1. Quick Verify (after small changes)

```bash
npm run build 2>&1 | tail -20
```

- Build passes: report success, move on
- Build fails: read the error, identify file and line, fix it

## 2. Full Verify (after phase completion or agent work)

```bash
npm run build && npm test
```

- Build must pass with zero errors
- Tests must pass with no regressions
- Either fails: stop, diagnose, fix before proceeding

## 3. Common Build Errors in this project

- Missing import → check if file was renamed/moved
- "Cannot find module" → check if the export name changed
- "X is not a function" → check if default/named export changed
- JSX element type error → check if component was renamed

## 4. Error Triage

- 1–3 errors: fix inline, re-run build
- 4+ errors: likely systemic (wrong import path pattern, missing shim) — diagnose root cause first
- Test failures: check if test references old names (bikes vs items, hotels vs venues)

## 5. Post-Verify Report

Pass:
```
✅ Build: passed (0 errors)
✅ Tests: passed (X/X)
```

Fail:
```
❌ Build: failed
   Error: [exact error]
   File: [file:line]
   Fix: [what needs to change]
```
