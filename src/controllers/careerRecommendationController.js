const prisma = require('../config/prisma');

const normalizeText = (text) => {
  return text ? text.toString().trim().toLowerCase() : '';
};

const parseCommaSeparated = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map(item => normalizeText(item))
    .filter(Boolean);
};

const calculateMatchPercentage = (student, internship) => {
  const studentSkills = student.skills.map(skill => normalizeText(skill.name));
  const requiredSkills = parseCommaSeparated(internship.requiredSkills);

  let score = 0;

  let skillScore = 0;
  let matchedSkills = [];
  let missingSkills = [];

  if (requiredSkills.length > 0) {
    matchedSkills = requiredSkills.filter(skill => studentSkills.includes(skill));
    missingSkills = requiredSkills.filter(skill => !studentSkills.includes(skill));
    skillScore = (matchedSkills.length / requiredSkills.length) * 70;
  }

  score += skillScore;

  const studentDepartment = normalizeText(student.department);
  const studentSectorPrefs = parseCommaSeparated(student.sectorPreferences);
  const internshipDepartment = normalizeText(internship.department);
  const companyIndustry = normalizeText(internship.company?.industrySector);

  let preferenceScore = 0;

  if (
    studentDepartment &&
    internshipDepartment &&
    studentDepartment === internshipDepartment
  ) {
    preferenceScore += 8;
  }

  if (
    studentSectorPrefs.includes(internshipDepartment) ||
    studentSectorPrefs.includes(companyIndustry)
  ) {
    preferenceScore += 7;
  }

  score += preferenceScore;

  const studentLocationPrefs = parseCommaSeparated(student.locationPreferences);
  const internshipLocation = normalizeText(internship.location);
  const internshipWorkMode = normalizeText(internship.workMode);

  let locationScore = 0;

  if (
    studentLocationPrefs.includes(internshipLocation) ||
    studentLocationPrefs.includes(internshipWorkMode)
  ) {
    locationScore += 15;
  }

  score += locationScore;

  if (score > 100) score = 100;

  return {
    matchPercentage: Math.round(score),
    matchedSkills,
    missingSkills,
    requiredSkills
  };
};

const fetchExternalJobsForRecommendation = async (keyword = '', location = '') => {
  const response = await fetch('https://www.arbeitnow.com/api/job-board-api');
  const result = await response.json();

  let jobs = result.data || [];

  const keywordTokens = keyword
    .toLowerCase()
    .split(/[\s,]+/)
    .map(token => token.trim())
    .filter(token => token.length > 2);

  jobs = jobs.filter((job) => {
    const title = (job.title || '').toLowerCase();
    const company = (job.company_name || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    const tags = Array.isArray(job.tags) ? job.tags.join(' ').toLowerCase() : '';
    const searchableText = `${title} ${company} ${tags}`;

    const matchKeyword =
      keywordTokens.length === 0 ||
      keywordTokens.some(token => searchableText.includes(token));

    const matchLocation =
      !location || jobLocation.includes(location.toLowerCase());

    return matchKeyword && matchLocation;
  });

  return jobs;
};

const calculateExternalJobMatch = (student, job) => {
  const studentSkills = student.skills.map(skill => normalizeText(skill.name));
  const studentDepartment = normalizeText(student.department);
  const studentSectorPrefs = parseCommaSeparated(student.sectorPreferences);
  const studentLocationPrefs = parseCommaSeparated(student.locationPreferences);

  const title = normalizeText(job.title);
  const company = normalizeText(job.company_name);
  const location = normalizeText(job.location);
  const tags = Array.isArray(job.tags) ? job.tags.map(tag => normalizeText(tag)) : [];

  const searchableText = `${title} ${company} ${tags.join(' ')}`;

  let matchedSkills = studentSkills.filter(skill => {
    return searchableText.includes(skill) && skill.length > 2;
  });
  matchedSkills = [...new Set(matchedSkills)];

  let skillScore = 0;
  if (studentSkills.length > 0) {
    skillScore = matchedSkills.length > 0
    ? (matchedSkills.length / studentSkills.length) * 70
    : 0;
  }

  let preferenceScore = 0;

  if (studentDepartment && searchableText.includes(studentDepartment)) {
    preferenceScore += 5;
  }

  const sectorMatched = studentSectorPrefs.some(pref => searchableText.includes(pref));
  if (sectorMatched) {
    preferenceScore += 5;
  }

  let locationScore = 0;
  if (
    studentLocationPrefs.some(pref => location.includes(pref)) ||
    (job.remote === true && studentLocationPrefs.includes('remote'))
  ) {
    locationScore += 10;
  }

  let totalScore = skillScore + preferenceScore + locationScore;
  if (totalScore > 100) totalScore = 100;

  return {
    matchPercentage: Math.round(totalScore),
    matchedSkills
  };
};

const getRecommendedInternships = async (req, res) => {
  try {
    const studentId = req.session.student.id;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { skills: true }
    });

    if (!student) {
      req.flash('error_msg', 'Student not found.');
      return res.redirect('/student/dashboard');
    }

    const internships = await prisma.internship.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' }
    });

    const internalRecommendations = internships.map(internship => {
      const result = calculateMatchPercentage(student, internship);

      return {
        ...internship,
        matchPercentage: result.matchPercentage,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        requiredSkillsArray: result.requiredSkills
      };
    });

    internalRecommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const keywordParts = [
      student.department,
      student.sectorPreferences,
      student.skills.map(skill => skill.name).slice(0, 3).join(' ')
    ].filter(Boolean);

    const keyword = keywordParts.join(' ').trim();

    const location = '';

    const externalJobs = await fetchExternalJobsForRecommendation(keyword, location);

    let externalRecommendations = externalJobs.map(job => {
      const result = calculateExternalJobMatch(student, job);

      return {
          ...job,
         matchPercentage: result.matchPercentage,
         matchedSkills: result.matchedSkills
      };
    });

    externalRecommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const filteredExternal = externalRecommendations.filter(
        job => job.matchPercentage > 0
    );

    externalRecommendations =
         filteredExternal.length > 0
           ? filteredExternal
           : externalRecommendations.slice(0, 5);

    res.render('career-recommendations', {
      title: 'Recommended Internships',
      student,
      internalRecommendations: internalRecommendations.slice(0, 5),
      externalRecommendations: externalRecommendations.slice(0, 5)
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Could not load recommendations.');
    res.redirect('/student/dashboard');
  }
};

module.exports = {
  getRecommendedInternships
};