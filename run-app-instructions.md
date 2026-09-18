# Run SaveTheDates locally

Run commands from the repository root. This is one Next.js application; F001 needs no database, provider accounts, secrets, or `.env` file. Do not set `NODE_ENV` manually. Demo data is available only in development.

## Prerequisites

- Direct running and checks: Node.js **24.11.0** and npm **11.6.1** (the Node installer includes npm). `.nvmrc`, `packageManager`, and `package-lock.json` record the toolchain and dependencies. Compatible Node 24/npm 11 releases are accepted by the package engines.
- Container running: Docker Engine/Desktop with Linux containers and Docker Compose v2. The Dockerfile uses Node 24.11.0 with npm 11.6.1; host Node is optional for running the container.
- Windows PowerShell: use `npm.cmd` and `npx.cmd` wherever the commands below say `npm` and `npx` if script execution policy blocks their `.ps1` wrappers. No policy change is needed.
- Ports: 3000 for local development, 3100 for the automated browser server, 3001 for the production smoke example.

## Docker development

```sh
docker compose up --build -d
docker compose logs -f app
```

Open http://localhost:3000/demo. The first request compiles the page. Stop following logs with Ctrl+C; the container remains running. `src/`, `fixtures/`, and `public/` are mounted for local edits; rebuild after changing dependencies or root configuration. Container dependencies and Next.js output are separate from the host checkout.

With host Node installed, `node scripts/smoke-development.mjs` checks the demo, image response, and unknown-slug 404 in the running development container.

```sh
docker compose down
```

This stops and removes the project's application container/network; there is no database or persistent customer data in this slice.

## Direct Node.js development

Stop the Docker app first if it occupies port 3000.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/demo. Stop with Ctrl+C. To use another port: `npm run dev -- --port 3002`.

Development routes:

| Route | Purpose |
| --- | --- |
| `/` | Clearly labelled local preview entry |
| `/demo` | Modern Minimal announcement with a local photograph |
| `/demo-no-photo` | No photo or optional message |
| `/demo-long-names` | Long names and no photo |
| `/preview-photo` | Development-only photo response |

Unknown slugs return 404. All pages are currently noindex; there is no sitemap. All fixtures are fictional. Production returns 404 for every demo slug and the photo route. Details, RSVP, account creation, and publication are future features.

## Checks

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, route generation/TypeScript, Vitest, and the production build, in that order. The browser suite starts/stops its own development server on port 3100; leave that port free. Run the build and browser suite sequentially so generated Next.js files are not rebuilt during browser checks. On Linux CI, use `npx playwright install --with-deps chromium` for browser system dependencies. Tests use Chromium at desktop and mobile viewport sizes; they do not establish Safari compatibility.

Individual checks are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Browser screenshots and failure traces are under ignored `test-results/`; `npx playwright show-report` opens the HTML report. CI is defined in `.github/workflows/ci.yml`, including development and production container smoke checks.

## Production container smoke check

```sh
docker build --target production -t save-the-dates:local .
docker run -d --name save-the-dates-smoke -p 127.0.0.1:3001:3000 save-the-dates:local
npm run smoke -- http://127.0.0.1:3001
docker stop save-the-dates-smoke
docker rm save-the-dates-smoke
```

Run the smoke command after the container reports ready (`docker logs save-the-dates-smoke`). It verifies the home page and 404 responses for the demo variants, photo, and an unknown wedding. This image uses Next.js standalone output and runs as the non-root `node` user. No production deployment or external services are configured yet.

For a direct production smoke check, run `npm run build`, then `npm start -- --port 3001` in a terminal; run the same smoke command in a second terminal. Stop with Ctrl+C. Both start the standalone server; direct `npm start` first copies the public and built static assets into the standalone directory using a cross-platform Node script.

## Verification record

F001 verification results and any outstanding checks are recorded in [the backlog](docs/backlog.md#f001---save-the-date-preview). Asset sources and licences are in [fixtures/README.md](fixtures/README.md).
