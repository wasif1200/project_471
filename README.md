# Internship + Skill Gap Analyzer — Merged Main

This is the merged GitHub-ready main project containing:

- **Member 3:** `SKILL PROGRESS TRACKER`
  - Student Skill Progress Tracker
  - Skill Demand Analytics Dashboard
  - Location-Based Internship Filtering
  - Internship Completion Certificate Generator
- **Member 4:** `SKILL ANALYZER`
  - Skill Gap Analysis
  - Skill-Based Internship Matching
  - Personalized Skill Suggestions
  - AI Chatbot Assistant

The project uses **one Express app, one Prisma schema, and one shared database**.

## Quick start for local development

```bash
npm install
cp .env.example .env
# Put a real PostgreSQL connection string in .env
npm run db:push
npm run db:seed
npm run dev
```

Open:

```text
http://localhost:3000
```

The home page has two separate module bars/buttons:

```text
SKILL PROGRESS TRACKER  -> /member3
SKILL ANALYZER          -> /member4
```

## Vercel deployment

This project is prepared for Vercel with:

- `api/index.js` — Vercel serverless function entrypoint
- `src/app.js` — Express app exported without `app.listen()`
- `src/server.js` — local development server only
- `vercel.json` — rewrites all routes to the Express function and includes views/static assets
- `postinstall: prisma generate` — generates Prisma Client during install/build

### Required Vercel environment variables

Add these in **Vercel Dashboard -> Project -> Settings -> Environment Variables**:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
SESSION_SECRET="use_a_long_random_secret"
OPENAI_API_KEY="optional_only_if_using_chatbot"
OPENAI_MODEL="gpt-3.5-turbo"
ENABLE_DEADLINE_JOB="false"
```

Important: Vercel should use a hosted PostgreSQL database such as Prisma Postgres, Neon, Supabase, Railway, or another hosted Postgres provider. Do not use `file:./dev.db` on Vercel.

### First database setup

After creating the hosted database and setting `DATABASE_URL`, run this once from your local terminal using the same production database URL:

```bash
npx prisma db push
node prisma/seed.js
```

For a real production app, prefer migrations later:

```bash
npx prisma migrate deploy
```

## Demo data

The seed file creates demo students, companies, skills, internships, course suggestions, Member 3 progress data, and Member 4 analyzer data.

Demo password for seeded student/company accounts:

```text
demo123
```

Useful seeded student emails:

```text
ayesha.frontend@student.com
siam.backend@student.com
nabila.data@student.com
wasif.fullstack@student.com
sara.beginner@student.com
```

## Important merged files

- `src/app.js` — Express app setup exported for Vercel
- `src/server.js` — local server entrypoint
- `api/index.js` — Vercel function entrypoint
- `src/routes/member3Routes.js` — Member 3 module routes
- `src/routes/member4Routes.js` — Member 4 module routes
- `prisma/schema.prisma` — one unified Prisma schema
- `prisma/seed.js` — one idempotent seed file for both members
- `src/views/home.ejs` — unified landing page
- `src/public/member3/member3-theme.css` and `src/public/member4/css/app.css` — consistent UI styling

## Notes for GitHub upload

Do not commit `node_modules/`, generated database files such as `prisma/dev.db`, or your local `.env` if it contains private values.

## File uploads note

The app avoids writing to the deployed project folder on Vercel. Temporary uploaded/generated files go to `/tmp` on Vercel, because serverless functions do not provide permanent local disk storage. For a permanent production upload system, connect external storage such as Vercel Blob, S3, Cloudinary, or Supabase Storage.
