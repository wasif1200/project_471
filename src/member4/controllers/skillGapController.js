const prisma = require('../config/prisma');
const {
  inferCategory,
  normalizeSkillName,
  displayStudentName,
  displayCompanyName,
  skillListFromInternship,
  scoreToFivePoint,
} = require('../services/skillUtils');

async function getAllInternships(req, res, next) {
  try {
    const internships = await prisma.internship.findMany({
      where: { status: 'ACTIVE' },
      include: { company: true, member4RequiredSkills: { include: { skill: true } } },
      orderBy: { id: 'asc' },
    });

    res.json({
      success: true,
      data: internships.map((internship) => ({
        id: internship.id,
        title: internship.title,
        company: displayCompanyName(internship),
        location: internship.location,
        type: internship.workMode || (internship.isRemote ? 'Remote' : 'On-site'),
        skills: skillListFromInternship(internship),
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function getStudent(req, res, next) {
  try {
    const studentId = parseInt(req.params.id, 10);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { member4Skills: { include: { skill: true } } },
    });

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    res.json({
      success: true,
      data: {
        id: student.id,
        name: displayStudentName(student),
        email: student.email,
        department: student.department,
        semester: student.semester,
        skills: student.member4Skills.map((row) => ({
          name: row.skill.name,
          score: scoreToFivePoint(row),
          category: row.skill.category || inferCategory(row.skill.name),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

function generateRecommendations(missingSkills) {
  const courseMap = {
    javascript: ['JavaScript ES6+, async/await, DOM manipulation', 'Core language for web development', 'JavaScript Full Course', 'YOUTUBE', 'https://www.youtube.com/watch?v=PkZNo7MFNFg'],
    react: ['Components, hooks, state management, React Router', 'Common frontend internship requirement', 'React Full Course', 'YOUTUBE', 'https://www.youtube.com/watch?v=bMknfKXIFA8'],
    'react.js': ['Components, hooks, state management, React Router', 'Common frontend internship requirement', 'React Full Course', 'YOUTUBE', 'https://www.youtube.com/watch?v=bMknfKXIFA8'],
    'node.js': ['Express.js, middleware, async patterns, REST APIs', 'Required for backend API work', 'Node.js and Express Full Course', 'YOUTUBE', 'https://www.youtube.com/watch?v=Oe421EPjeBE'],
    mysql: ['SQL queries, joins, indexes, transactions', 'Essential for relational data storage', 'SQL Full Database Course', 'YOUTUBE', 'https://www.youtube.com/watch?v=HXV3zeQKqGY'],
    sql: ['SQL queries, joins, indexes, transactions', 'Essential for relational data storage', 'SQL Full Database Course', 'YOUTUBE', 'https://www.youtube.com/watch?v=HXV3zeQKqGY'],
    git: ['Branching, merging, pull requests, GitHub workflow', 'Used by almost every software team', 'Git and GitHub for Beginners', 'YOUTUBE', 'https://www.youtube.com/watch?v=RGOj5yH7evk'],
    python: ['Python syntax, data structures, OOP, pandas basics', 'Used for backend, automation, and data roles', 'Python for Everybody', 'COURSERA', 'https://www.coursera.org/specializations/python'],
    docker: ['Containers, Dockerfile basics, docker compose', 'Helps run and deploy backend apps reliably', 'Docker for Beginners', 'YOUTUBE', 'https://www.youtube.com/results?search_query=docker+for+beginners'],
    figma: ['Wireframes, components, prototyping, UI handoff', 'Useful for UI/UX and frontend collaboration', 'Figma for Beginners', 'YOUTUBE', 'https://www.youtube.com/results?search_query=figma+for+beginners'],
  };

  return missingSkills.map((skill) => {
    const key = normalizeSkillName(skill.skillName).replace('rest apis', 'rest api');
    const info = courseMap[key] || courseMap[key.replace('/tailwind', '')] || [
      `Study ${skill.skillName} fundamentals and build one small project`,
      'This skill appears in the selected internship requirements',
      `${skill.skillName} tutorial`,
      'YOUTUBE',
      `https://www.youtube.com/results?search_query=${encodeURIComponent(skill.skillName + ' tutorial')}`,
    ];

    return {
      skillName: skill.skillName,
      status: 'Missing',
      yourLevel: skill.yourLevel,
      requiredLevel: skill.requiredLevel,
      gap: skill.gap,
      whatToLearn: info[0],
      whyItMatters: info[1],
      suggestedCourse: { name: info[2], platform: info[3], url: info[4] },
    };
  });
}

async function getSkillGap(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const internshipId = parseInt(req.params.internshipId, 10);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { member4Skills: { include: { skill: true } } },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { company: true, member4RequiredSkills: { include: { skill: true } } },
    });
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });

    const studentSkillMap = new Map(
      student.member4Skills.map((row) => [normalizeSkillName(row.skill.name), scoreToFivePoint(row)])
    );

    const requiredSkillNames = skillListFromInternship(internship);
    const matched = [];
    const weak = [];
    const missing = [];

    requiredSkillNames.forEach((skillName) => {
      const key = normalizeSkillName(skillName);
      const category = inferCategory(skillName);
      const yourLevel = studentSkillMap.get(key) || 0;
      const requiredLevel = 3;
      const gap = Math.max(0, requiredLevel - yourLevel);

      const row = { skillName, skillCategory: category, yourLevel, requiredLevel, gap, status: 'Matched' };
      if (!yourLevel) {
        missing.push({ ...row, status: 'Missing' });
      } else if (yourLevel < requiredLevel) {
        weak.push({ ...row, status: 'Weak' });
      } else {
        matched.push(row);
      }
    });

    const totalRequired = requiredSkillNames.length;
    const readiness = totalRequired > 0
      ? Math.round(((matched.length + weak.length * 0.5) / totalRequired) * 100)
      : 100;
    const allSkills = [...matched, ...weak, ...missing];

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: displayStudentName(student),
          department: student.department || 'CSE',
          semester: student.semester || '-',
        },
        internship: {
          id: internship.id,
          title: internship.title,
          company: displayCompanyName(internship),
          location: internship.location,
          type: internship.workMode || (internship.isRemote ? 'Remote' : 'On-site'),
          description: internship.roleDescription,
        },
        summary: {
          totalRequired,
          matchedCount: matched.length,
          weakCount: weak.length,
          missingCount: missing.length,
          readiness,
        },
        skills: { matched, weak, missing },
        charts: {
          labels: allSkills.map((s) => s.skillName),
          yourLevels: allSkills.map((s) => s.yourLevel),
          requiredLevels: allSkills.map((s) => s.requiredLevel),
          statusColors: allSkills.map((s) => s.status === 'Matched' ? '#22c55e' : s.status === 'Weak' ? '#f59e0b' : '#ef4444'),
          doughnut: {
            labels: ['Matched', 'Weak', 'Missing'],
            data: [matched.length, weak.length, missing.length],
            colors: ['#22c55e', '#f59e0b', '#ef4444'],
          },
        },
        recommendations: generateRecommendations([...weak, ...missing]),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllInternships, getStudent, getSkillGap };
