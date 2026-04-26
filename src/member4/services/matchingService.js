const prisma = require('../config/prisma');
const { normalizeSkillName, displayStudentName, displayCompanyName } = require('./skillUtils');

const includeInternship = {
  company: true,
  member4RequiredSkills: { include: { skill: true } },
};

const includeStudent = {
  member4Skills: { include: { skill: true } },
};

function normalizeInternship(internship) {
  return {
    ...internship,
    companyName: displayCompanyName(internship),
    requiredSkills: internship.member4RequiredSkills || [],
  };
}

function normalizeStudent(student) {
  return {
    ...student,
    skills: student.member4Skills || [],
  };
}

function calculateMatch(student, internship) {
  const requiredSkills = internship.requiredSkills || [];
  const requiredNames = requiredSkills.map((row) => row.skill && row.skill.name).filter(Boolean);

  if (requiredNames.length === 0) {
    return {
      studentId: student.id,
      studentName: displayStudentName(student),
      department: student.department || '',
      internshipId: internship.id,
      internshipTitle: internship.title,
      matchPercentage: 100,
      matchedCount: 0,
      requiredCount: 0,
      matchedSkills: [],
      missingSkills: [],
      explanation: 'No specific skills are required, so every student qualifies.',
    };
  }

  const studentSkillSet = new Set((student.skills || [])
    .map((row) => normalizeSkillName(row.skill && row.skill.name))
    .filter(Boolean));

  const uniqueRequired = [];
  const seen = new Set();
  for (const name of requiredNames) {
    const normalized = normalizeSkillName(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueRequired.push({ original: name, normalized });
  }

  const matchedSkills = [];
  const missingSkills = [];
  for (const required of uniqueRequired) {
    if (studentSkillSet.has(required.normalized)) matchedSkills.push(required.original);
    else missingSkills.push(required.original);
  }

  const matchedCount = matchedSkills.length;
  const requiredCount = uniqueRequired.length;
  const matchPercentage = requiredCount > 0
    ? Math.round((matchedCount / requiredCount) * 1000) / 10
    : 100;

  let explanation;
  if (matchPercentage === 100) explanation = `Perfect match: has all ${requiredCount} required skills.`;
  else if (matchPercentage >= 75) explanation = `Strong match: ${matchedCount}/${requiredCount} skills present. Missing: ${missingSkills.join(', ')}.`;
  else if (matchPercentage >= 50) explanation = `Good match: ${matchedCount}/${requiredCount} skills present. Missing: ${missingSkills.join(', ')}.`;
  else if (matchPercentage >= 25) explanation = `Partial match: only ${matchedCount}/${requiredCount} required skills present.`;
  else if (matchPercentage > 0) explanation = `Low match: only ${matchedCount}/${requiredCount} required skills present.`;
  else explanation = `No match: none of the ${requiredCount} required skills are on the profile.`;

  return {
    studentId: student.id,
    studentName: displayStudentName(student),
    department: student.department || '',
    internshipId: internship.id,
    internshipTitle: internship.title,
    matchPercentage,
    matchedCount,
    requiredCount,
    matchedSkills,
    missingSkills,
    explanation,
  };
}

async function listInternships() {
  const internships = await prisma.internship.findMany({
    where: { status: 'ACTIVE' },
    include: includeInternship,
    orderBy: { id: 'asc' },
  });
  return internships.map(normalizeInternship);
}

async function getRankedStudents(internshipId) {
  const id = parseInt(internshipId, 10);
  if (Number.isNaN(id)) throw new Error('Invalid internship ID');

  const internshipRow = await prisma.internship.findUnique({ where: { id }, include: includeInternship });
  if (!internshipRow) throw new Error(`Internship #${id} not found`);

  const students = await prisma.student.findMany({ include: includeStudent, orderBy: { id: 'asc' } });
  const internship = normalizeInternship(internshipRow);
  const rankedStudents = students.map((student) => calculateMatch(normalizeStudent(student), internship));

  rankedStudents.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
    return a.studentName.localeCompare(b.studentName);
  });

  let rank = 1;
  for (let i = 0; i < rankedStudents.length; i += 1) {
    if (i > 0 && rankedStudents[i].matchPercentage < rankedStudents[i - 1].matchPercentage) rank = i + 1;
    rankedStudents[i].rank = rank;
  }

  const stats = {
    totalStudents: rankedStudents.length,
    perfectMatch: rankedStudents.filter((row) => row.matchPercentage === 100).length,
    strongMatch: rankedStudents.filter((row) => row.matchPercentage >= 75 && row.matchPercentage < 100).length,
    goodMatch: rankedStudents.filter((row) => row.matchPercentage >= 50 && row.matchPercentage < 75).length,
    partialMatch: rankedStudents.filter((row) => row.matchPercentage >= 25 && row.matchPercentage < 50).length,
    lowMatch: rankedStudents.filter((row) => row.matchPercentage < 25).length,
    averageMatch: rankedStudents.length
      ? Math.round((rankedStudents.reduce((sum, row) => sum + row.matchPercentage, 0) / rankedStudents.length) * 10) / 10
      : 0,
    dataSource: 'shared Prisma database',
  };

  return { internship, rankedStudents, stats };
}

async function getTopMatches(internshipId, limit = 5) {
  const data = await getRankedStudents(internshipId);
  return { ...data, rankedStudents: data.rankedStudents.slice(0, limit) };
}

async function getFirstInternshipId() {
  const internships = await listInternships();
  return internships.length ? internships[0].id : null;
}

module.exports = {
  calculateMatch,
  getRankedStudents,
  getTopMatches,
  listInternships,
  getFirstInternshipId,
};
