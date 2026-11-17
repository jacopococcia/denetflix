# Denetflix

> **Answer a few questions. Find your next retro movie night.**

Denetflix is a fast, mobile-first web app that recommends up to **7 accessible, entertaining movies from the 1960s, 1970s, 1980s, and 1990s** based on a short 7-question quiz.

---

## Features

- **7-Question Playful Quiz**: Covers decade, genres, mood, attention/pacing, popularity tier, viewing context, and deal-breaker exclusions.
- **Transparent Deterministic Scoring**: Ranks 1960–1999 films cleanly by match weights while enforcing genre/decade variety and hard exclusion penalties.
- **Honest Availability & Posters**: Supports TMDB movie metadata, posters, and regional JustWatch watch-provider lookups without ever fabricating streaming availability.
- **Physical Disc Links**: Generates safely encoded Amazon.com DVD/Blu-ray search links with affiliate tag `jr0605-20` and clear affiliate disclosure.
- **Optional Server-Side Gemini AI Polish**: Enhances the intro, 3 pros, and 1 playful catch using `@google/genai` (`gemini-4-hydrogen`) with strict JSON schema validation and factual guardrails.
- **Zero-Config Fallback Mode**: Includes a curated local dataset of 30+ verified 1960s–1990s crowd-pleasers so the app works immediately offline or on static hosting.

---

## 1. Install Dependencies

Requires Node.js 20+ (Node 22 recommended):

```bash
npm install
```

## 2. Create Your Environment File

Copy `.env.example` to `.env` (never commit `.env` to Git):

```bash
cp .env.example .env
```

## 3. API Keys & Configuration

| Variable | Where Used | Required? | Purpose |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server / Serverless Proxy | Optional | Generates personalized result intros, 3 pros, and 1 catch via `@google/genai` (`gemini-4-hydrogen`). |
| `TMDB_API_KEY` | Server / Serverless Proxy | Optional | Fetches live 1960–1999 metadata, posters, and JustWatch regional watch providers. |
| `VITE_TMDB_API_KEY` | Client (Static Build) | Optional | Allows static GitHub Pages builds without a backend proxy to call TMDB directly (note: visible in browser bundles). |
| `VITE_API_BASE_URL` | Client (Static Build) | Optional | Base URL of your serverless proxy (e.g., Cloudflare Worker or Vercel Function) for `/api/gemini/recommend` and `/api/tmdb/*`. |
| `VITE_DEFAULT_COUNTRY` | Client | Optional | Two-letter ISO country code default for streaming checks (defaults to `US`). |
| `VITE_BASE_PATH` | Vite Build | Optional | Public base path for GitHub Pages subpath hosting (e.g., `/denetflix/`). Defaults to `/`. |

If neither `GEMINI_API_KEY` nor `TMDB_API_KEY` is provided, Denetflix automatically runs in **Curated Demo Mode** using `src/data/fallbackMovies.ts` and marks availability honestly as unverified.

## 4. Run Locally

Start the full-stack development server (Express API proxy + Vite middleware on port 3000):

```bash
npm run dev
```

Run tests and TypeScript typechecking:

```bash
npm test
npm run lint
```

## 5. Build for Production

Generate the static production bundle in `dist/`:

```bash
npm run build
```

To run the included Node/Express server with the production build:

```bash
npm start
```

## 6. Deploy to GitHub Pages

1. Push this repository to GitHub with `main` as your default branch.
2. In your GitHub repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. (Optional) Under **Settings → Secrets and variables → Actions**, add:
   - Variable `VITE_DEFAULT_COUNTRY` (e.g., `US`, `GB`, `DE`)
   - Variable `VITE_API_BASE_URL` (your serverless proxy URL, if using one)
   - Secret `VITE_TMDB_API_KEY` (only if you intentionally want direct client-side TMDB queries without a proxy)
4. Push to `main` (or trigger **Deploy Denetflix to GitHub Pages** manually from the **Actions** tab).

## 7. Configure Repository Name / Vite Base Path

The included workflow `.github/workflows/deploy.yml` automatically sets:

```yaml
VITE_BASE_PATH: /${{ github.event.repository.name }}/
```

If you deploy to a custom domain or user/organization root site (`username.github.io`), change `VITE_BASE_PATH` in `.github/workflows/deploy.yml` to `/` (or pass `VITE_BASE_PATH=/ npm run build` locally).

## 8. Secure Proxy Architecture for Static GitHub Pages

**Important security rule:** GitHub Pages only serves static files and **cannot safely store server-side secrets** such as `GEMINI_API_KEY` or a private `TMDB_API_KEY`.

To keep secrets off the browser while still hosting the frontend on GitHub Pages:

1. Deploy a lightweight serverless proxy implementing the three routes in `server.ts`:
   - `POST /api/tmdb/discover`
   - `GET /api/tmdb/availability/:tmdbId`
   - `POST /api/gemini/recommend`
2. Host that proxy on any lightweight platform:
   - **Cloudflare Workers**
   - **Vercel Functions** (`/api/*.ts`)
   - **Netlify Functions**
   - **Firebase Functions**
3. Enable CORS on your proxy for your `https://<username>.github.io` origin and set `VITE_API_BASE_URL` to your proxy URL when building for GitHub Pages.

## 9. External Services Used

- **TMDB (The Movie Database)**: Verified movie metadata, release dates, directors, runtimes, poster images, and regional Watch Providers (JustWatch data).
- **Google Gemini API (`@google/genai`)**: Server-side JSON generation for playful personalized intros, 3 specific pros, and 1 honest catch from verified metadata.
- **Amazon.com Search**: Physical DVD/Blu-ray lookup links.

## 10. How Affiliate Links Are Generated

`src/services/amazonService.ts` constructs safely URL-encoded Amazon search URLs using the pattern:

```
https://www.amazon.com/s?k={URL_ENCODED_TITLE}+{YEAR}+DVD+Blu-ray&tag=jr0605-20
```

Each card and the site footer include a clear affiliate disclosure and never claim unverified disc stock.

## 11. Replacing or Expanding Fallback Movie Data

Edit `src/data/fallbackMovies.ts` to add, remove, or update entries. Each entry uses the `Movie` TypeScript interface in `src/types/movie.ts` (requiring factual `title`, `year` between `1960` and `1999`, `director`, `runtimeMinutes`, `genres`, `synopsis`, and curated fallback `defaultPros` / `defaultCon`).
