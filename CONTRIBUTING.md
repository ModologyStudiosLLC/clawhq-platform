# Deployment

## Branch strategy
- `main` — production. Merge here only when ready to ship.
- `staging` — test branch. Push freely, check Cloudflare preview.
- Feature branches — open PRs to `staging`, then promote staging → main.

## Landing page
Auto-deploys to Cloudflare Pages on every push to `main` that touches `landing/`.

## Dashboard
No auto-deploy to production. Run locally with Docker Compose.
Build check runs on every PR to catch TypeScript errors before merge.

## Secrets needed in GitHub
- `CLOUDFLARE_API_TOKEN` — from Cloudflare dashboard → My Profile → API Tokens → Create Token (use "Edit Cloudflare Workers" template)
- `CLOUDFLARE_ACCOUNT_ID` — from Cloudflare dashboard URL or Overview page

## Adding environment variables
Never commit secrets. Add to `.env` locally (gitignored) and to Cloudflare Pages env vars in the dashboard for production.
