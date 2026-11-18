# Astro Hub

Astro Hub is a Node-powered astronomy web app with static pages, a NASA APOD proxy, login/register support, favorites, and a quiz leaderboard.

## Run locally

```bash
npm install
npm start
```

Then open `http://127.0.0.1:3001`.

## Environment variables

- `PORT` - server port, defaults to `3001`
- `NASA_API_KEY` - optional NASA API key, falls back to `DEMO_KEY`
- `ASTROHUB_TOKEN_SECRET` - optional secret for signed auth tokens

## Data storage

Runtime data is stored in `web app/data/astrohub.json`:

- registered users
- favorites per user
- leaderboard entries

## Deploy notes

This app is ready for a simple Node deployment.

### Render

- Build command: `npm install`
- Start command: `npm start`
- Add `NASA_API_KEY` in the dashboard with a key from https://api.nasa.gov/ (the public `DEMO_KEY` is heavily rate-limited)
- Add `ASTROHUB_TOKEN_SECRET` as a long random value

### Railway / VPS

- Install dependencies with `npm install`
- Start with `npm start`
- Make sure the platform sets `PORT`

## Production checklist

- Set `NASA_API_KEY`
- Set `ASTROHUB_TOKEN_SECRET`
- Keep `web app/data/astrohub.json` writable
- Confirm `/api/health` returns `200`
