# Agent Notes

## Goal

Recreate this repository as a standalone, project-agnostic `cloudflare-build-config` package.

## Constraints

- Do not hardcode machine-local absolute paths.
- Do not assume a specific monorepo layout such as `apps/*` or `services/*`.
- Prefer explicit configuration and CLI flags over repo-specific conventions.
- Keep the package small, composable, and publishable.

## Implementation Direction

- Keep the CLI thin.
- Split config loading, schema validation, Cloudflare API access, diffing, and output formatting into separate modules.
- Add tests before wiring real Cloudflare mutations.
- Preserve a strong `--dry-run` mode.

## Handoff

- The initial scaffold is intentionally incomplete.
- Use `docs/recreate-plan.md` as the implementation brief for the next agent.

