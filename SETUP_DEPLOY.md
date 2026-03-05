# MotorXLive — Deploy Guide (from Render Part 1 Step D)

This repo is ready for:
- Render: Docker Web Service (`api/`) + Render Postgres (HA) via `render.yaml`
- Vercel: Next.js (`web/`) + `/api/*` rewrite

## Render (Blueprint)
1) Render → New → Blueprint → select this repo → Apply.
2) Set `MOTORXLIVE_MASTER_KEY` on `motorxlive-api`.
3) Verify `https://<service>.onrender.com/healthz`.

## Vercel
1) Vercel → Add New → Project → select repo → Root Directory `web` → Deploy.
2) Edit `web/vercel.json` destination to your Render URL → commit/push.

## Local test
`docker compose -f docker-compose.local.yml up --build`
Then open `http://localhost:10000/healthz`.
