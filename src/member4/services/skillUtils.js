function normalizeSkillName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\.js$/i, '.js')
    .replace(/\s+/g, ' ');
}

function inferCategory(name) {
  const n = normalizeSkillName(name);
  if (['javascript', 'typescript', 'python', 'java', 'c++'].some((k) => n.includes(k))) return 'Programming';
  if (['react', 'node', 'express', 'django', 'spring'].some((k) => n.includes(k))) return 'Framework';
  if (['mysql', 'sql', 'mongodb', 'postgresql', 'database'].some((k) => n.includes(k))) return 'Database';
  if (['git', 'docker', 'aws', 'linux'].some((k) => n.includes(k))) return 'Tool';
  if (['css', 'tailwind', 'figma', 'html'].some((k) => n.includes(k))) return 'Frontend/UI';
  if (['machine learning', 'data'].some((k) => n.includes(k))) return 'Data';
  return 'Concept';
}

function displayStudentName(student) {
  if (!student) return 'Unknown Student';
  if (student.name) return student.name;
  return [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email || `Student #${student.id}`;
}

function displayCompanyName(internship) {
  return internship?.company?.companyName || internship?.companyName || 'Unknown Company';
}

function skillListFromInternship(internship) {
  if (!internship) return [];
  const linkedSkills = internship.member4RequiredSkills || internship.requiredSkills;
  if (Array.isArray(linkedSkills) && linkedSkills.length > 0) {
    return linkedSkills
      .map((row) => row.skill?.name)
      .filter(Boolean);
  }
  if (internship.skillTags) {
    return internship.skillTags.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function scoreToFivePoint(row) {
  if (!row) return 0;
  if (typeof row.score === 'number' && row.score > 0) return row.score;
  if (typeof row.level === 'number' && row.level > 0) return row.level;
  if (typeof row.chatScore === 'number' && row.chatScore > 0) return Math.round((row.chatScore / 20) * 10) / 10;
  return 0;
}

function scoreToPercent(row) {
  if (!row) return 0;
  if (typeof row.chatScore === 'number' && row.chatScore > 0) return row.chatScore;
  if (typeof row.score === 'number' && row.score > 0) return Math.round(Math.min(row.score, 5) * 20);
  if (typeof row.level === 'number' && row.level > 0) return Math.round(Math.min(row.level, 5) * 20);
  return 0;
}

module.exports = {
  normalizeSkillName,
  inferCategory,
  displayStudentName,
  displayCompanyName,
  skillListFromInternship,
  scoreToFivePoint,
  scoreToPercent,
};
