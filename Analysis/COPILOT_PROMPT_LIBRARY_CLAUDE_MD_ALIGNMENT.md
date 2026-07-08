# Unified AI Instruction Standard (Claude + Copilot)

## TL;DR
For EOS 2.0 Prototype:

1. CLAUDE.md is the single source of truth for all AI coding instructions.
2. Copilot reads .github/copilot-instructions.md automatically as the repo adapter.
3. CI enforces sync via .github/workflows/instruction-sync-check.yml.
4. Any instruction change must update CLAUDE.md and .github/copilot-instructions.md together.

## Purpose
Define one operational standard so developers using Claude Code and developers using GitHub Copilot follow the same instructions every time.

## Scope
Applies to EOS 2.0 Prototype, with implementation work primarily under app/.

## Live implementation status
This standard is already implemented in-repo:

1. Canonical instruction file: CLAUDE.md
2. Copilot adapter file: .github/copilot-instructions.md
3. CI sync enforcement: .github/workflows/instruction-sync-check.yml

## How the model works

1. Single source of truth
- All instruction intent is authored in CLAUDE.md.

2. Tool adapter for Copilot
- .github/copilot-instructions.md mirrors CLAUDE.md in Copilot-friendly form.
- Conflict rule: if anything differs, CLAUDE.md wins.

3. CI guardrail
- The sync workflow fails if only one instruction file is changed.
- This prevents drift between Claude and Copilot behavior.

4. Workspace handling preference
- Ignore .claude and .vscode unless explicitly requested.

## Mandatory governance rule
When instruction guidance changes:

1. Edit CLAUDE.md first.
2. Update .github/copilot-instructions.md in the same change.
3. Ensure CI passes.
4. Include a short CLAUDE.md compliance/deviation note in handovers and PR summaries.

## Team workflow

1. Start work normally; Copilot auto-loads repo instructions.
2. Use the fallback starter prompt below only when extra reinforcement is needed.
3. In review, verify instruction sync and CLAUDE.md compliance summary.
4. Reject changes with unapproved frameworks or non-token styling.

## Copy-ready fallback starter prompt (Copilot)
Use this only if you want explicit reinforcement at chat start.

Please treat CLAUDE.md in the workspace root as the mandatory instruction source for this session.

Working rules:
1. Read and apply CLAUDE.md before making changes.
2. Follow EOS 2.0 stack constraints (Vite + React + TypeScript, React Router v6, mock/local data only, no backend unless asked).
3. Use inline styles with src/tokens.ts and CSS vars from src/tokens.css; avoid hard-coded JSX color values.
4. Keep file placement aligned with project structure:
- Shared components: src/components/
- Page components: src/pages/<PageName>/
- Mock data: src/data/
- Utilities/parsers: src/utils/
5. Do not introduce unapproved UI/state/CSS frameworks.
6. Preserve established EOS visual language unless explicitly instructed otherwise.
7. Validate in app/ with npm run build before final output.
8. Ignore .claude and .vscode unless explicitly requested.

Output expectations:
- State which CLAUDE.md rules were applied.
- Summarize changed files and why.
- Call out any intentional deviations.

## Acceptance checklist

- CLAUDE.md remains canonical
- .github/copilot-instructions.md is updated in lockstep with CLAUDE.md
- instruction-sync-check workflow passes
- No unapproved framework additions
- Token-based styling and correct file placement are used
- Build passes from app/
- Deviations are explicitly documented

## Ownership
Product Owner: Jamie Ladd
Engineering team: EOS 2.0 Prototype contributors
