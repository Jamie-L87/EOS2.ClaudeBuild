# EOS 2.0 Prototype - Copilot Instructions

CLAUDE.md at the repository root is the canonical AI instruction source for this project.

If any guidance in this file conflicts with CLAUDE.md, follow CLAUDE.md.

## Mandatory behavior

- Read and apply CLAUDE.md before proposing or making code changes.
- Follow project stack constraints: Vite + React + TypeScript, React Router v6.
- Use inline styles with tokens from app/src/tokens.ts and CSS variables from app/src/tokens.css.
- Avoid hard-coded color values in JSX; use token references.
- Keep structure consistent:
  - Shared components: app/src/components/
  - Pages: app/src/pages/<PageName>/
  - Mock data: app/src/data/
  - Utilities/parsers: app/src/utils/
- No backend integration unless explicitly requested.
- Do not add unapproved frameworks (UI libs, state libs, CSS frameworks).
- Preserve established EOS visual language unless explicitly instructed otherwise.
- Validate from app/ with npm run build before finalizing.
- Ignore .claude and .vscode unless explicitly requested by the user.

## Mixed-tool governance (Claude + Copilot)

- Claude users and Copilot users both follow CLAUDE.md as source of truth.
- Any instruction update must edit CLAUDE.md first, then update this file in the same change.
- CI workflow .github/workflows/instruction-sync-check.yml enforces paired updates.
- In handovers and PR descriptions, include a short CLAUDE.md compliance summary and intentional deviations.
