const prisma = require('../config/prisma');
const { normalizeSkillName, displayStudentName, scoreToPercent } = require('./skillUtils');

function quickActions() {
  return [
    'Show my profile summary',
    'Suggest courses for my skills',
    'Find internships that match me',
    'Help me improve my resume',
    'Make me a 7-day study plan',
    'How can I track my skill progress?'
  ];
}

function buildResponse({ intent, reply, suggestions = quickActions(), relatedCourses = [], relatedInternships = [] }) {
  return { intent, reply, suggestions, relatedCourses, relatedInternships };
}

async function getStudentSnapshot(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      member4Skills: {
        include: { skill: { include: { courseResources: { where: { isActive: true }, orderBy: { id: 'asc' } } } } },
        orderBy: { chatScore: 'desc' },
      },
    },
  });
  if (!student) return null;

  const skills = student.member4Skills.map((row) => ({
    id: row.skill.id,
    name: row.skill.name,
    category: row.skill.category || 'General',
    score: scoreToPercent(row),
    isCompleted: row.isCompleted,
    courses: row.skill.courseResources || [],
  }));

  const strongSkills = skills.filter((s) => s.score >= 75).sort((a, b) => b.score - a.score);
  const improvingSkills = skills.filter((s) => s.score < 75).sort((a, b) => a.score - b.score);

  return {
    id: student.id,
    name: displayStudentName(student),
    email: student.email,
    department: student.department,
    university: student.university || student.universityName,
    semester: student.semester,
    targetRole: student.targetRole,
    bio: student.bio,
    experience: student.experience,
    interests: student.interests,
    skills,
    strongSkills,
    improvingSkills,
    strongestSkill: [...skills].sort((a, b) => b.score - a.score)[0] || null,
    weakestSkill: [...skills].sort((a, b) => a.score - b.score)[0] || null,
  };
}

function skillSummary(skills) {
  if (!skills.length) return 'No skills are tracked yet.';
  return skills.map((s) => `- ${s.name}: ${s.score}/100${s.isCompleted ? ' (completed)' : ''}`).join('\n');
}

async function getRelatedCourses(snapshot) {
  if (!snapshot) return [];
  const weakSkillIds = snapshot.improvingSkills.slice(0, 4).map((s) => s.id);
  if (!weakSkillIds.length) return [];
  const courses = await prisma.member4CourseResource.findMany({
    where: { skillId: { in: weakSkillIds }, isActive: true },
    include: { skill: true },
    orderBy: [{ difficulty: 'asc' }, { id: 'asc' }],
    take: 8,
  });
  return courses.map((course) => ({
    title: course.title,
    platform: course.platform,
    url: course.courseUrl,
    duration: `${course.estimatedHours} hours`,
    skill: course.skill.name,
    isFree: course.platform === 'YOUTUBE',
  }));
}

async function getRelatedInternships(snapshot) {
  const internships = await prisma.internship.findMany({
    where: { status: 'ACTIVE' },
    include: { company: true, member4RequiredSkills: { include: { skill: true } } },
    orderBy: { id: 'asc' },
  });

  if (!snapshot) {
    return internships.slice(0, 4).map((i) => ({
      title: i.title,
      company: i.company?.companyName || i.companyName || 'Unknown Company',
      location: i.isRemote ? 'Remote' : (i.location || 'Not set'),
      duration: i.duration || (i.durationMonths ? `${i.durationMonths} months` : 'Not set'),
      skills: i.member4RequiredSkills.map((row) => row.skill.name),
      applyUrl: i.applyUrl || '#',
    }));
  }

  const studentSkillNames = new Set(snapshot.skills.map((s) => normalizeSkillName(s.name)));
  return internships
    .map((i) => {
      const skills = i.member4RequiredSkills.map((row) => row.skill.name);
      const matched = skills.filter((name) => studentSkillNames.has(normalizeSkillName(name)));
      return { internship: i, skills, matched, score: matched.length };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ internship, skills, matched }) => ({
      title: internship.title,
      company: internship.company?.companyName || internship.companyName || 'Unknown Company',
      location: internship.isRemote ? 'Remote' : (internship.location || 'Not set'),
      duration: internship.duration || (internship.durationMonths ? `${internship.durationMonths} months` : 'Not set'),
      skills,
      matchedSkills: matched,
      applyUrl: internship.applyUrl || '#',
    }));
}

async function getSuggestionsForStudent(studentId) {
  const snapshot = await getStudentSnapshot(studentId);
  if (!snapshot) return quickActions();
  const suggestions = quickActions();
  if (snapshot.weakestSkill) suggestions.unshift(`Improve ${snapshot.weakestSkill.name}`);
  if (snapshot.targetRole) suggestions.unshift(`Prepare for ${snapshot.targetRole}`);
  return [...new Set(suggestions)].slice(0, 8);
}

async function buildBotResponse(intent, studentId, userMessage = '') {
  const snapshot = await getStudentSnapshot(studentId);
  const relatedCourses = await getRelatedCourses(snapshot);
  const relatedInternships = await getRelatedInternships(snapshot);

  if (!snapshot) {
    return buildResponse({
      intent,
      reply: 'Hi! I can help with internships, skills, courses, resumes, and study plans. Use demo Student ID 1, 2, or 3 to get personalized guidance.',
    });
  }

  if (intent === 'greeting') {
    return buildResponse({
      intent,
      reply:
        `Hi ${snapshot.name}! I can help you prepare for ${snapshot.targetRole || 'internships'}.\n\n` +
        `Your strongest area is ${snapshot.strongestSkill?.name || 'not set'} and your next improvement area is ${snapshot.weakestSkill?.name || 'not set'}.`,
      suggestions: await getSuggestionsForStudent(studentId),
    });
  }

  if (intent === 'profile_summary_help') {
    return buildResponse({
      intent,
      reply:
        `Profile summary for ${snapshot.name}\n\n` +
        `Department: ${snapshot.department || 'Not set'}\n` +
        `University: ${snapshot.university || 'Not set'}\n` +
        `Semester: ${snapshot.semester || 'Not set'}\n` +
        `Target role: ${snapshot.targetRole || 'Not set'}\n\n` +
        `Skills:\n${skillSummary(snapshot.skills)}`,
      suggestions: await getSuggestionsForStudent(studentId),
    });
  }

  if (intent === 'resume_help') {
    const strong = snapshot.strongSkills.slice(0, 4).map((s) => s.name).join(', ') || 'your strongest skills';
    const improve = snapshot.improvingSkills.slice(0, 3).map((s) => s.name).join(', ') || 'your weakest skills';
    return buildResponse({
      intent,
      reply:
        `For a ${snapshot.targetRole || 'student internship'} resume, place ${strong} near the top and prove them with projects.\n\n` +
        `Next, improve ${improve}. Add one project bullet for each major skill, such as what you built, what tools you used, and the result. Keep it one page and use measurable points where possible.`,
      suggestions: await getSuggestionsForStudent(studentId),
    });
  }

  if (intent === 'internship_search_help') {
    return buildResponse({
      intent,
      reply:
        `I found internships that best connect with your current skills. Prioritize roles where you already match several required skills, then use the skill suggestions page to close the missing gaps.`,
      suggestions: await getSuggestionsForStudent(studentId),
      relatedInternships,
    });
  }

  if (intent === 'course_suggestion_help' || intent === 'skill_progress_help') {
    return buildResponse({
      intent,
      reply:
        `Your best next focus is ${snapshot.weakestSkill?.name || 'your lowest scored skill'}. Start with a beginner course, mark it in progress, then complete it from the Skill Suggestions page to update your progress.`,
      suggestions: await getSuggestionsForStudent(studentId),
      relatedCourses,
    });
  }

  if (intent === 'study_plan_help') {
    const focus = snapshot.improvingSkills.slice(0, 2).map((s) => s.name).join(' and ') || 'your target skills';
    return buildResponse({
      intent,
      reply:
        `7-day plan for ${focus}:\n` +
        `Day 1: Review fundamentals and make notes.\n` +
        `Day 2: Complete one beginner course section.\n` +
        `Day 3: Build a tiny practice task.\n` +
        `Day 4: Add a second feature or solve 5 exercises.\n` +
        `Day 5: Connect the skill to an internship-style project.\n` +
        `Day 6: Polish your project and write resume bullets.\n` +
        `Day 7: Recheck your gaps and apply to one matching internship.`,
      suggestions: await getSuggestionsForStudent(studentId),
    });
  }

  return buildResponse({
    intent,
    reply:
      `I can help with skill gaps, course progress, internship matching, study planning, and resume advice. For your profile, a good next step is improving ${snapshot.weakestSkill?.name || 'your lowest scored skill'}.`,
    suggestions: await getSuggestionsForStudent(studentId),
  });
}

module.exports = { buildBotResponse, getSuggestionsForStudent, getStudentSnapshot };
