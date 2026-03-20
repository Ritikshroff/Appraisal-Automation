# Cybermedia Appraisal Platform

Secure, role-based internal appraisal platform for Cybermedia built with Next.js App Router, Tailwind CSS, Prisma, PostgreSQL, NextAuth, and OpenAI.

## Stack

- Frontend: Next.js 16 App Router + Tailwind CSS
- Backend: Next.js API routes
- Database: PostgreSQL + Prisma ORM + `@prisma/adapter-pg`
- AI: OpenAI Responses API with deterministic fallback when `OPENAI_API_KEY` is absent

## Features

- Email and password authentication with persistent sessions via NextAuth
- Strict role-based access for `EMPLOYEE`, `MANAGER`, and `CEO`
- Team-based organization with fixed manager ownership
- Structured appraisal flow: Employee submission -> Manager review -> CEO final decision
- Support for work and salary appraisals across multiple cycles
- Multi-step appraisal forms with long answers, KRAs, skill ratings, manager review, and CEO decision
- AI-generated summary, sentiment, strengths, weaknesses, and risk signals
- Role-based dashboards for employees, managers, and the CEO
- Seeded demo teams, employees, managers, CEO, and appraisal data

## Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Update database and auth values in `.env`:

```bash
DATABASE_URL="..."
DIRECT_URL="..."
AUTH_SECRET="replace-with-a-long-random-secret"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.2"
```

3. Push the schema and seed the database:

```bash
pnpm exec prisma db push --url "$DIRECT_URL"
pnpm run db:seed
```

4. Start the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Demo Credentials

All seeded users use the same password:

```bash
Cybermedia@123
```

Sample accounts:

- CEO: `meera.kapoor@cmrsl.example`
- Tech Manager: `anita.rao@cmrsl.example`
- Employee: `rahul.sharma@cmrsl.example`

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

## API Endpoints

- `GET /api/dashboard`
- `GET /api/appraisals?appraisalId=<id>`
- `POST /api/appraisals/save`
- `POST /api/appraisals/submit`

## Notes

- The app remains functional without `OPENAI_API_KEY` by falling back to deterministic analysis logic.
- Signup creates employee accounts only. Manager and CEO access comes from seeded internal users.
- All server routes enforce role-based access before reading or mutating appraisal data.
