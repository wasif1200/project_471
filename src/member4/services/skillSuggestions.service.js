// src/services/skillSuggestions.service.js
const prisma = require("../config/prisma");

function toInt(value) {
  return typeof value === "number" ? value : parseInt(value, 10);
}

// ─────────────────────────────────────────────────────────────
// 1. Identify skill gaps for a student
//    If internshipId provided -> analyse that internship only
//    Otherwise -> union of ALL internship requirements
// ─────────────────────────────────────────────────────────────
async function getSkillGaps(studentId, internshipId) {
  const normalizedStudentId = toInt(studentId);
  const normalizedInternshipId = internshipId == null || internshipId === "" ? null : toInt(internshipId);

  if (!normalizedStudentId || normalizedStudentId < 1) {
    throw new Error("Invalid studentId.");
  }

  let requirementWhere = {};

  if (normalizedInternshipId !== null) {
    if (!normalizedInternshipId || normalizedInternshipId < 1) {
      throw new Error("Invalid internshipId.");
    }

    const internship = await prisma.internship.findUnique({
      where: { id: normalizedInternshipId },
      select: { id: true },
    });

    if (!internship) {
      throw new Error("Internship not found.");
    }

    requirementWhere = { internshipId: normalizedInternshipId };
  }

  // Fetch all required skills (across relevant internships)
  const requirements = await prisma.member4InternshipSkillRequirement.findMany({
    where: requirementWhere,
    include: {
      skill: true,
      internship: { select: { id: true, title: true } },
    },
  });

  if (!requirements.length) return [];

  // Fetch student's current skill scores
  const studentSkills = await prisma.member4StudentSkill.findMany({
    where: { studentId: normalizedStudentId },
    include: { skill: true },
  });

  const scoreMap = {};
  for (const ss of studentSkills) {
    scoreMap[ss.skillId] = ss.score;
  }

  // Deduplicate skills; keep the highest requiredScore across internships
  const gapMap = {};
  for (const req of requirements) {
    const current = scoreMap[req.skillId] ?? 0;
    const gap = req.requiredScore - current;

    if (gap > 0) {
      if (!gapMap[req.skillId] || gapMap[req.skillId].requiredScore < req.requiredScore) {
        gapMap[req.skillId] = {
          skillId: req.skillId,
          skillName: req.skill.name,
          currentScore: current,
          requiredScore: req.requiredScore,
          gap: parseFloat(gap.toFixed(1)),
          internships: [],
        };
      }

      if (!gapMap[req.skillId].internships.includes(req.internship.title)) {
        gapMap[req.skillId].internships.push(req.internship.title);
      }
    }
  }

  return Object.values(gapMap).sort((a, b) => b.gap - a.gap);
}

// ─────────────────────────────────────────────────────────────
// 2. Get course recommendations for a set of skill IDs
//    Also attach per-student progress statuses
// ─────────────────────────────────────────────────────────────
function normalizeCourseText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[‐-―]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCourseSignature(course) {
  const normalizedTitle = normalizeCourseText(course.title);
  const normalizedUrl = String(course.courseUrl ?? "").trim().toLowerCase();
  return `${course.skillId}::${course.platform}::${normalizedTitle}::${normalizedUrl}`;
}

function getStatusRank(status) {
  if (status === "COMPLETED") return 3;
  if (status === "IN_PROGRESS") return 2;
  return 1;
}

function pickBetterCourseRecord(current, candidate) {
  const currentRank = getStatusRank(current.status);
  const candidateRank = getStatusRank(candidate.status);

  if (candidateRank !== currentRank) {
    return candidateRank > currentRank ? candidate : current;
  }

  if ((candidate.scoreAwarded ? 1 : 0) !== (current.scoreAwarded ? 1 : 0)) {
    return candidate.scoreAwarded ? candidate : current;
  }

  return candidate.id < current.id ? candidate : current;
}

async function getCourseRecommendations(studentId, skillIds) {
  const normalizedStudentId = toInt(studentId);
  if (!skillIds.length) return {};

  const courses = await prisma.member4CourseResource.findMany({
    where: { skillId: { in: skillIds }, isActive: true },
    include: { skill: true },
    orderBy: [{ skillId: "asc" }, { difficulty: "asc" }, { id: "asc" }],
  });

  const courseIds = courses.map((c) => c.id);
  const progress = await prisma.member4StudentCourseProgress.findMany({
    where: { studentId: normalizedStudentId, courseResourceId: { in: courseIds } },
  });

  const progressMap = {};
  for (const p of progress) {
    progressMap[p.courseResourceId] = p;
  }

  const dedupedBySignature = {};
  for (const course of courses) {
    const prog = progressMap[course.id];
    const payload = {
      id: course.id,
      skillId: course.skillId,
      title: course.title,
      platform: course.platform,
      courseUrl: course.courseUrl,
      difficulty: course.difficulty,
      estimatedHours: course.estimatedHours,
      description: course.description,
      scoreBoost: course.scoreBoost,
      status: prog?.status ?? "NOT_STARTED",
      scoreAwarded: prog?.scoreAwarded ?? false,
      startedAt: prog?.startedAt ?? null,
      completedAt: prog?.completedAt ?? null,
    };

    const signature = getCourseSignature(payload);
    if (!dedupedBySignature[signature]) {
      dedupedBySignature[signature] = payload;
      continue;
    }

    dedupedBySignature[signature] = pickBetterCourseRecord(dedupedBySignature[signature], payload);
  }

  const grouped = {};
  for (const course of Object.values(dedupedBySignature)) {
    if (!grouped[course.skillId]) grouped[course.skillId] = [];
    grouped[course.skillId].push(course);
  }

  for (const skillId of Object.keys(grouped)) {
    grouped[skillId].sort((a, b) => {
      const rankDiff = getStatusRank(b.status) - getStatusRank(a.status);
      if (rankDiff !== 0) return rankDiff;
      return a.id - b.id;
    });
  }

  return grouped;
}

// ─────────────────────────────────────────────────────────────
// 3. Main aggregation: skill gaps + courses
// ─────────────────────────────────────────────────────────────
async function getSkillSuggestions(studentId, internshipId) {
  const gaps = await getSkillGaps(studentId, internshipId);
  const skillIds = gaps.map((g) => g.skillId);
  const coursesBySkill = await getCourseRecommendations(studentId, skillIds);

  return gaps.map((gap) => ({
    ...gap,
    courses: coursesBySkill[gap.skillId] ?? [],
  }));
}

// ─────────────────────────────────────────────────────────────
// 4. Mark course as IN_PROGRESS
// ─────────────────────────────────────────────────────────────
async function startCourse(studentId, courseId) {
  const normalizedStudentId = toInt(studentId);
  const normalizedCourseId = toInt(courseId);

  const course = await prisma.member4CourseResource.findUnique({ where: { id: normalizedCourseId } });
  if (!course || !course.isActive) throw new Error("Course not found.");

  const existing = await prisma.member4StudentCourseProgress.findUnique({
    where: {
      studentId_courseResourceId: {
        studentId: normalizedStudentId,
        courseResourceId: normalizedCourseId,
      },
    },
  });

  if (existing?.status === "COMPLETED") {
    throw new Error("You have already completed this course.");
  }

  return prisma.member4StudentCourseProgress.upsert({
    where: {
      studentId_courseResourceId: {
        studentId: normalizedStudentId,
        courseResourceId: normalizedCourseId,
      },
    },
    update: { status: "IN_PROGRESS", startedAt: existing?.startedAt ?? new Date() },
    create: {
      studentId: normalizedStudentId,
      courseResourceId: normalizedCourseId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 5. Mark course COMPLETED + conditionally boost skill score
// ─────────────────────────────────────────────────────────────
async function completeCourse(studentId, courseId, confirmed) {
  const normalizedStudentId = toInt(studentId);
  const normalizedCourseId = toInt(courseId);

  if (!confirmed) throw new Error("Completion must be confirmed by the student.");

  const course = await prisma.member4CourseResource.findUnique({
    where: { id: normalizedCourseId },
    include: { skill: true },
  });
  if (!course || !course.isActive) throw new Error("Course not found.");

  const existing = await prisma.member4StudentCourseProgress.findUnique({
    where: {
      studentId_courseResourceId: {
        studentId: normalizedStudentId,
        courseResourceId: normalizedCourseId,
      },
    },
  });

  if (existing?.status === "COMPLETED" && existing?.scoreAwarded) {
    throw new Error("You have already completed this course and received the score boost.");
  }

  const progress = await prisma.member4StudentCourseProgress.upsert({
    where: {
      studentId_courseResourceId: {
        studentId: normalizedStudentId,
        courseResourceId: normalizedCourseId,
      },
    },
    update: { status: "COMPLETED", completedAt: new Date(), scoreAwarded: true },
    create: {
      studentId: normalizedStudentId,
      courseResourceId: normalizedCourseId,
      status: "COMPLETED",
      completedAt: new Date(),
      scoreAwarded: true,
      startedAt: new Date(),
    },
  });

  const currentSkillRecord = await prisma.member4StudentSkill.findUnique({
    where: {
      studentId_skillId: {
        studentId: normalizedStudentId,
        skillId: course.skillId,
      },
    },
  });

  const currentScore = currentSkillRecord?.score ?? 1;
  const newScore = Math.min(5, parseFloat((currentScore + course.scoreBoost).toFixed(1)));

  const updatedSkill = await prisma.member4StudentSkill.upsert({
    where: {
      studentId_skillId: {
        studentId: normalizedStudentId,
        skillId: course.skillId,
      },
    },
    update: { score: newScore },
    create: { studentId: normalizedStudentId, skillId: course.skillId, score: newScore },
  });

  return {
    progress,
    skillUpdate: {
      skillName: course.skill.name,
      previousScore: currentScore,
      newScore: updatedSkill.score,
      scoreBoost: course.scoreBoost,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 6. Course history for a student
// ─────────────────────────────────────────────────────────────
async function getCourseHistory(studentId) {
  const normalizedStudentId = toInt(studentId);

  const history = await prisma.member4StudentCourseProgress.findMany({
    where: { studentId: normalizedStudentId },
    include: {
      courseResource: {
        include: { skill: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return history.map((h) => ({
    courseId: h.courseResourceId,
    courseTitle: h.courseResource.title,
    platform: h.courseResource.platform,
    courseUrl: h.courseResource.courseUrl,
    skillName: h.courseResource.skill.name,
    difficulty: h.courseResource.difficulty,
    estimatedHours: h.courseResource.estimatedHours,
    status: h.status,
    scoreAwarded: h.scoreAwarded,
    startedAt: h.startedAt,
    completedAt: h.completedAt,
  }));
}

module.exports = {
  getSkillSuggestions,
  startCourse,
  completeCourse,
  getCourseHistory,
};
