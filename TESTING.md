# P0 Regression Safety Net

This project treats the backend/data contract as the stable boundary. The current HTML/CSS DOM is intentionally **not** frozen because the frontend will be heavily redesigned.

## What must stay green

1. Runtime secrets are bound in Cloudflare.
2. `notes/index.json` is readable through the Worker storage layer and matches the notes contract.
3. `dates/ideas.json` is readable through the Worker storage layer and matches the date-ideas contract.
4. Protected pages redirect anonymous visitors to login.
5. Stable `/api/v1/*` data APIs reject anonymous access.
6. Invalid login credentials are rejected.
7. Legacy GitHub proxy remains session-protected during the migration period.
8. GitHub paths are allowlisted to `EvieHe/theo-notes` only.
9. Test writes, when used, are restricted to `_test/` and cannot target real relationship data.
10. Static deployment excludes source, tests, CI files, docs, node_modules and Wrangler temporary files.

## CI flow

```text
pull request:  contract tests
main push:     contract tests -> deploy -> production smoke
```

`/api/ready` is intentionally content-free. It performs a server-side read of the private storage and returns only readiness booleans, item counts and upstream status codes. This lets CI detect disappearing historical data without exposing private note text or requiring a human to copy diagnostics.

## Frontend rewrite rule

New frontend code should call the stable Worker API instead of GitHub directly. The legacy `/api/github/*` bridge exists only to keep the old pages working during migration and should be removed after the React/Living Digital Garden rewrite is complete.
