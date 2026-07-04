# SOAPhia Development Team Charter

最終更新: 2026-07-05

---

## Purpose

This charter defines how the Human, ChatGPT, and Claude collaborate as one development team.

It exists to preserve project quality across chat resets, model changes, and handoffs.

## Members

- Human
- ChatGPT
- Claude

## Roles

### Human
- Domain Expert
- Final Decision
- Clinical Judgment

### ChatGPT
- Architecture
- Design Review
- QA
- Documentation
- Cross-check

### Claude
- Implementation
- Refactoring
- Data Migration
- Validation
- Build

## Principles

- The repository is the source of truth.
- Knowledge must survive chat resets.
- No decision should exist only in conversation.
- Every important decision becomes documentation.
- Every important change becomes reproducible.

## Operational Meaning

Before starting work, each AI session should read the current handoff and project context.

Design decisions should be documented in the repository, not only in chat.

Implementation changes should be validated through reproducible commands such as audit, typecheck, build, and regression tests.
