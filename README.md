# GitShield 🛡️

A **Secret Manager & Scanner for GitHub repositories**. GitShield detects
hardcoded secrets (API keys, passwords, tokens) and leaked `.env` files, then
uses the **Groq API** to explain each finding and recommend a fix.

Built with **Next.js (App Router, TypeScript, Tailwind CSS)**, **PostgreSQL +
Prisma**, **Groq** (`llama-3.3-70b-versatile`) and **Docker**.

---

## ✨ Features

- **Scan a GitHub repo URL** — public repositories are fetched via the GitHub
  API (`.env` and config files are prioritised) and audited automatically.
- **Scan pasted code / `.env` snippets** — instant feedback, great for
  pre-commit checks.
- **Two detection engines**
  - Deterministic **regex + Shannon-entropy** rules (always on, works offline).
  - **Groq AI** analysis for semantic detection, severity, explanations and
    remediation advice (used automatically when `GROQ_API_KEY` is set).
- **Severity-categorised results** — `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, with
  masked evidence so the UI never renders a usable credential.
- **Dark security-console dashboard** — totals, severity breakdown, recent
  alerts and full scan history.
- **Reported with a risk score** (0–100) per scan.

---

## 🏗️ Architecture

```
Next.js (App Router)          PostgreSQL
┌───────────────────────┐     ┌─────────────────┐
│ /            Dashboard │     │ Repository       │
│ /scan        Form      │◄───►│ ScanResult       │
│ /scans       History   │     │ (issues as jsonb)│
│ /scans/[id]  Results   │     └─────────────────┘
│                       │
│ API: /api/scan        │      ┌─────────────────┐
│      /api/scans       │◄────►│ Groq  (LLM)      │
│      /api/health      │      └─────────────────┘
└───────────────────────┘      ┌─────────────────┐
                               │ GitHub REST API  │
                               └─────────────────┘
```

**Scan pipeline** (`src/lib/scanner/index.ts`)

1. Resolve input → download repo files **or** use the pasted snippet.
2. Run the regex + entropy engine (`regex.ts`, `entropy.ts`).
3. Send files to Groq with a strict JSON system prompt (`groq.ts`).
4. Merge + dedupe findings, compute status & risk score.
5. Persist `Repository` + `ScanResult` via Prisma.

---

## 🚀 Quick start (Docker — recommended)

```bash
# 1. Configure environment
cp .env.example .env
#    ...then set GROQ_API_KEY (get a free key at https://console.groq.com/keys)

# 2. Build and run everything (Postgres + migrations + app)
docker compose up --build
```

Open **http://localhost:3000**.

The `app` container waits for Postgres to be healthy and for the `migrate`
service to apply the schema before starting.

> **Groq is optional.** Without `GROQ_API_KEY` GitShield still works using the
> regex/entropy engine — the UI clearly indicates "Regex-only mode".

---

## 💻 Local development

```bash
npm install

# Start a Postgres instance (or point DATABASE_URL at your own)
docker run --name gitshield-pg -e POSTGRES_USER=gitshield \
  -e POSTGRES_PASSWORD=gitshield -e POSTGRES_DB=gitshield -p 5432:5432 -d postgres:16-alpine

cp .env.example .env          # then edit GROQ_API_KEY / DATABASE_URL
npm run db:generate           # prisma generate
npm run db:migrate            # apply migrations (or: npm run db:migrate:dev)
npm run db:seed               # optional: add demo data

npm run dev                   # http://localhost:3000
```

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run smoke` | Detector smoke test (no DB required) |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:migrate:dev` | Create + apply a migration in development |
| `npm run db:seed` | Seed demo repositories/scans |

---

## 🔑 Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GROQ_API_KEY` | ⬜ | Enables AI analysis. Free key from console.groq.com |
| `GROQ_MODEL` | ⬜ | Primary model (default `llama-3.3-70b-versatile`) |
| `GROQ_FALLBACK_MODEL` | ⬜ | Retry model (default `llama-3.1-8b-instant`) |
| `GITHUB_TOKEN` | ⬜ | Raises GitHub API rate limit (public repos work without it) |
| `MAX_REPO_FILES` | ⬜ | Max files downloaded per repo (default `40`) |
| `MAX_FILE_BYTES` | ⬜ | Max size of a single file (default `102400`) |
| `MAX_TOTAL_BYTES` | ⬜ | Max total download per repo (default `2097152`) |
| `MAX_GROQ_CHARS` | ⬜ | Max characters sent to Groq per request (default `24000`) |

---

## 🔌 API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/scan` | Scan code or a repo. Body: `{ mode: "repo"\|"paste", repoUrl?, code?, filename?, label? }` |
| `GET` | `/api/scans` | Recent scan history (`?limit=`) |
| `GET` | `/api/scans/:id` | Full detail for one scan |
| `GET` | `/api/repositories` | All scanned repositories |
| `GET` | `/api/health` | Liveness + DB/Groq status |

Example:

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"mode":"paste","filename":".env","code":"AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"}'
```

---

## 🗄️ Database schema

```prisma
model Repository {
  id            String    @id @default(cuid())
  name          String
  url           String    @unique
  lastScannedAt DateTime?
  createdAt     DateTime  @default(now())
  scans         ScanResult[]
}

model ScanResult {
  id           String     @id @default(cuid())
  repositoryId String
  status       ScanStatus // SAFE | VULNERABLE
  sourceType   SourceType // REPOSITORY | PASTE
  issuesFound  Json
  filesScanned Int        @default(0)
  riskScore    Int        @default(0)
  aiSummary    String?
  createdAt    DateTime   @default(now())
}
```

---

## 🧪 Demo tips

- Paste [`sample/demo.env`](sample/demo.env) (or click **Load sample secrets**
  on the scan page) to trigger every detector.
- Try scanning a clean repo such as `https://github.com/octocat/Hello-World` to
  see a `SAFE` result.

---

## 📁 Project structure

```
src/
├─ app/                 # App Router pages + API routes
│  ├─ page.tsx          # Dashboard
│  ├─ scan/             # Scan form
│  ├─ scans/            # History + result view
│  └─ api/              # scan, scans, repositories, health
├─ actions/scan.ts      # Server Actions
├─ components/          # UI (Navbar, ScanForm, IssueCard, …)
├─ lib/
│  ├─ groq.ts           # Groq client + strict prompt + JSON parsing
│  ├─ github.ts         # GitHub repo fetcher
│  ├─ queries.ts        # Prisma read helpers
│  ├─ prisma.ts         # Prisma singleton
│  └─ scanner/          # regex + entropy engine
└─ types/               # Shared TypeScript types
prisma/                 # schema, migrations, seed
Dockerfile              # multi-stage production build
docker-compose.yml      # db + migrate + app
```
