# Member 3 Integration Notes

Member 3 is integrated into the shared main project as a namespaced module under `/member3`.

## Member 3 features

1. Student Skill Progress Tracker
   - Page: `/member3/skill-tracker`
   - API: `/member3/api/students`
   - Uses the shared `student` table plus `member3_*` skill, course, and progress tables.

2. Skill Demand Analytics Dashboard
   - Page: `/member3/analytics`
   - API: `/member3/api/analytics`
   - Reads shared internship records and calculates skill demand/category trends.

3. Location-Based Internship Filtering
   - Page: `/member3/location`
   - API: `/member3/api/internships`
   - Reads shared internship location and work mode data.

4. Internship Completion Certificate Generator
   - Page: `/member3/certificate`
   - API: `/member3/api/certificates`
   - Generates PDFs into `src/public/member3/certificates` and records them in the shared `certificate` table.

## Main merged files

- `src/routes/member3Routes.js`
- `src/routes/member3/*`
- `src/controllers/member3/*`
- `src/public/member3/*`
- `prisma/schema.prisma`
- `prisma/seed.js`

## Setup

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Then open:

```text
http://localhost:3000/member3
```
