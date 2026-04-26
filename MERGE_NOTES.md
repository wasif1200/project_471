# Merge Notes

## What was merged

- Member 3 project was used as the base Express application.
- Member 4 Skill Analyzer was integrated under `/member4` instead of running as a separate app.
- Member 3 remains under `/member3`.

## Database work

- Replaced separate database setups with one Prisma schema at `prisma/schema.prisma`.
- Member 3 tables are namespaced with `member3_` table names.
- Member 4 tables are namespaced with `member4_` table names.
- Shared entities such as students, companies, internships, applications, and certificates remain shared.
- `prisma/seed.js` is idempotent and avoids duplicate seed data by using unique keys and upserts.

## UI work

- Home page recreated with the dark purple style from the provided sample image.
- Added two module bars/buttons on the home page:
  - `SKILL PROGRESS TRACKER` for Member 3
  - `SKILL ANALYZER` for Member 4
- Member 3 static pages now load a shared Member 3 theme stylesheet.
- Member 4 routes and static assets are mounted consistently under `/member4`.

## Validation performed

- JavaScript syntax checks were run on the main server, Member 4 controllers/services, Member 3 routes/controllers, and the unified seed file.
- Archive was checked for zero-byte files; only the expected `.gitkeep` placeholder remains empty.

## Local validation still required

The sandbox environment did not have the installed npm dependencies or external npm access, so Prisma Client generation, `prisma db push`, and actually starting the Express server must be run locally with:

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```
