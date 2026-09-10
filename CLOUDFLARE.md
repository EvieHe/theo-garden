# Cloudflare deployment

This fork migrates `theo-garden` from GitHub Pages to a Cloudflare Worker with Static Assets.

## Architecture

```text
Browser
  -> Cloudflare Worker
      -> static HTML/CSS/JS via ASSETS binding
      -> /api/login and signed HttpOnly session
      -> /api/github/* proxy
          -> EvieHe/theo-notes (private GitHub repository)
```

The browser no longer receives the real GitHub PAT. The legacy encrypted token files in `notes/` and `dates/` contain only a harmless placeholder so the historical static source no longer exposes the real credential, even in encrypted form on the new fork.

## Required Worker secrets

Set these once in Cloudflare:

```bash
npx wrangler secret put SITE_PASS
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GITHUB_TOKEN
```

- `SITE_PASS`: the 4-digit site passcode.
- `SESSION_SECRET`: a long random value used to sign login sessions. Example generation: `openssl rand -base64 48`.
- `GITHUB_TOKEN`: a fine-grained GitHub PAT scoped only to `EvieHe/theo-notes`, with Contents read/write and Metadata read.

After migration, revoke the old PAT that was previously encrypted in the public repository.

## First deploy

```bash
npm install
npx wrangler login
npm run deploy
```

The Worker name is `theo-garden`. Static assets and Worker code deploy together.

## Automatic deploys from GitHub

`.github/workflows/deploy-cloudflare.yml` deploys every push to `main`.

Add these GitHub Actions repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token only needs permission to edit/deploy Workers for the target account.

## Compatibility layer

The current pages are large legacy single-file HTML applications. To minimize migration risk, the Worker temporarily rewrites their GitHub API calls at the edge so that existing notes/dates functionality keeps working while the PAT stays server-side.

When the 2.0 UI refactor is done, remove the compatibility HTML transform in `src/worker.js` and replace the legacy GitHub helpers with first-class `/api/*` calls.

## Data repository

All existing notes/date data remains in:

`EvieHe/theo-notes` (private, branch `main`)

No data migration to D1/R2 is required for this phase.
