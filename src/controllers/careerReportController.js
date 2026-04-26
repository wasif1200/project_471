const prisma = require('../config/prisma');
const PDFDocument = require('pdfkit');

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
  let matchedSkills = [];
  let missingSkills = [];

  if (requiredSkills.length > 0) {
    matchedSkills = requiredSkills.filter(skill => studentSkills.includes(skill));
    missingSkills = requiredSkills.filter(skill => !studentSkills.includes(skill));
    score += (matchedSkills.length / requiredSkills.length) * 70;
  }

  const studentDepartment = normalizeText(student.department);
  const studentSectorPrefs = parseCommaSeparated(student.sectorPreferences);
  const internshipDepartment = normalizeText(internship.department);
  const companyIndustry = normalizeText(internship.company?.industrySector);

  if (
    studentDepartment &&
    internshipDepartment &&
    studentDepartment === internshipDepartment
  ) {
    score += 8;
  }

  if (
    studentSectorPrefs.includes(internshipDepartment) ||
    studentSectorPrefs.includes(companyIndustry)
  ) {
    score += 7;
  }

  const studentLocationPrefs = parseCommaSeparated(student.locationPreferences);
  const internshipLocation = normalizeText(internship.location);
  const internshipWorkMode = normalizeText(internship.workMode);

  if (
    studentLocationPrefs.includes(internshipLocation) ||
    studentLocationPrefs.includes(internshipWorkMode)
  ) {
    score += 15;
  }

  if (score > 100) score = 100;

  return {
    matchPercentage: Math.round(score),
    matchedSkills,
    missingSkills,
    requiredSkills
  };
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

const getCareerReportData = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { skills: true }
  });

  if (!student) return null;

  const certificate = await prisma.certificate.findFirst({
    where: { studentId },
    orderBy: { id: 'desc' }
  });

  const internships = await prisma.internship.findMany({
    include: { company: true },
    orderBy: { createdAt: 'desc' }
  });

  let externalJobs = [];

  try {
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api');
    const result = await response.json();
    externalJobs = result.data || [];
  } catch (err) {
    console.error('External jobs fetch failed:', err);
  }

  const analyzedInternships = internships.map(internship => {
    const result = calculateMatchPercentage(student, internship);

    return {
      id: internship.id,
      title: internship.title,
      company: internship.company?.companyName || 'Unknown Company',
      location: internship.location || 'N/A',
      workMode: internship.workMode || 'N/A',
      matchPercentage: result.matchPercentage,
      requiredSkills: result.requiredSkills,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills
    };
  });

  analyzedInternships.sort((a, b) => b.matchPercentage - a.matchPercentage);

  let externalRecommendations = externalJobs.map(job => {
    const result = calculateExternalJobMatch(student, job);

    return {
      title: job.title || 'Untitled Opportunity',
      company: job.company_name || 'Unknown Company',
      location: job.location || 'N/A',
      workMode: job.remote ? 'Remote' : 'On-site',
      matchPercentage: result.matchPercentage,
      matchedSkills: result.matchedSkills,
      applyLink: job.url
    };
  });

  externalRecommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);

  externalRecommendations = externalRecommendations
    .filter(job => job.matchPercentage > 0)
    .slice(0, 5);

  return {
    student,
    certificate,
    analyzedInternships: analyzedInternships.slice(0, 3),
    recommendedInternships: analyzedInternships
      .filter(item => item.matchPercentage > 0)
      .slice(0, 5),
    externalRecommendations
  };
};

const getCareerReport = async (req, res) => {
  try {
    if (!req.session || !req.session.student || !req.session.student.id) {
      req.flash('error_msg', 'Please log in first.');
      return res.redirect('/student/login');
    }

    const studentId = req.session.student.id;
    const reportData = await getCareerReportData(studentId);

    if (!reportData) {
      req.flash('error_msg', 'Student not found.');
      return res.redirect('/student/dashboard');
    }

    res.render('career-report', {
      title: 'Student Career Report',
      ...reportData
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Could not generate report.');
    res.redirect('/student/dashboard');
  }
};

const downloadCareerReportPdf = async (req, res) => {
  try {
    const studentId = req.session.student.id;
    const reportData = await getCareerReportData(studentId);

    if (!reportData) {
      return res.redirect('/student/dashboard');
    }

    const {
      student,
      certificate,
      analyzedInternships,
      recommendedInternships,
      externalRecommendations
    } = reportData;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=career-report.pdf'
    );

    doc.pipe(res);

    doc.fontSize(20).text('Student Career Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Basic Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Name: ${student.firstName} ${student.lastName}`);
    doc.text(`Email: ${student.email}`);
    doc.text(`Department: ${student.department || 'N/A'}`);
    doc.text(`Degree: ${student.degree || 'N/A'}`);
    doc.text(`Sector Preferences: ${student.sectorPreferences || 'N/A'}`);
    doc.text(`Location Preferences: ${student.locationPreferences || 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('Skills', { underline: true });
    doc.moveDown(0.5);
    const skillsText = student.skills.length
      ? student.skills.map(skill => skill.name).join(', ')
      : 'No skills added yet.';
    doc.fontSize(12).text(skillsText);
    doc.moveDown();

    doc.fontSize(14).text('Experience', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(student.experience || 'No experience information added yet.');
    doc.moveDown();

    doc.fontSize(14).text('Certificate & Practical Experience', { underline: true });
    doc.moveDown(0.5);

    if (certificate) {
      doc.fontSize(12).text(`Company: ${certificate.companyName || 'N/A'}`);
      doc.text(`Internship Duration: ${certificate.durationMonths || 'N/A'} month(s)`);
      doc.text(`Practical Experience Rating: ${certificate.experienceRating || 'N/A'}/5`);
    } else {
      doc.fontSize(12).text('No certificate information added yet.');
    }

    doc.moveDown();

    doc.fontSize(14).text('Recommended Internships', { underline: true });
    doc.moveDown(0.5);

    if (recommendedInternships.length > 0) {
      recommendedInternships.forEach((internship, index) => {
        if (doc.y > 720) doc.addPage();
        doc.fontSize(12).text(`${index + 1}. ${internship.title} - ${internship.company}`);
        doc.text(`   Location: ${internship.location}`);
        doc.text(`   Work Mode: ${internship.workMode}`);
        doc.text(`   Match Percentage: ${internship.matchPercentage}%`);
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(12).text('No platform recommendations available right now.');
    }

    doc.moveDown();

    doc.fontSize(14).text('External Opportunities', { underline: true });
    doc.moveDown(0.5);

    if (externalRecommendations.length > 0) {
      externalRecommendations.forEach((job, index) => {
        if (doc.y > 720) doc.addPage();
        doc.fontSize(12).text(`${index + 1}. ${job.title} - ${job.company}`);
        doc.text(`   Location: ${job.location}`);
        doc.text(`   Work Mode: ${job.workMode}`);
        doc.text(`   Match Percentage: ${job.matchPercentage}%`);
        doc.text(
          `   Matched Skills: ${
            job.matchedSkills.length ? job.matchedSkills.join(', ') : 'None'
          }`
        );
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(12).text('No external opportunities available right now.');
    }

    doc.moveDown();

    doc.fontSize(14).text('Skill Gap Analysis', { underline: true });
    doc.moveDown(0.5);

    if (analyzedInternships.length > 0) {
      analyzedInternships.forEach((internship, index) => {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(12).text(`${index + 1}. ${internship.title} - ${internship.company}`);
        doc.text(
          `   Required Skills: ${
            internship.requiredSkills.length
              ? internship.requiredSkills.join(', ')
              : 'N/A'
          }`
        );
        doc.text(
          `   Matched Skills: ${
            internship.matchedSkills.length
              ? internship.matchedSkills.join(', ')
              : 'None'
          }`
        );
        doc.text(
          `   Missing Skills: ${
            internship.missingSkills.length
              ? internship.missingSkills.join(', ')
              : 'None'
          }`
        );
        doc.text(`   Match Percentage: ${internship.matchPercentage}%`);
        doc.moveDown(0.8);
      });
    } else {
      doc.fontSize(12).text(
        'No platform internships available yet, so skill gap analysis cannot be generated right now.'
      );
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.redirect('/student/career-report');
  }
};

const downloadCareerReportCsv = async (req, res) => {
  try {
    const studentId = req.session.student.id;
    const reportData = await getCareerReportData(studentId);

    if (!reportData) {
      return res.redirect('/student/dashboard');
    }

    const {
      certificate,
      recommendedInternships,
      externalRecommendations,
      analyzedInternships
    } = reportData;

    let csv = '';

    csv += 'Section,Title,Company,Location,Work Mode,Match %,Matched Skills,Missing Skills\n';

    if (certificate) {
      csv += `Certificate,"Practical Experience","${certificate.companyName}","-","${certificate.durationMonths} month(s)","${certificate.experienceRating} out of 5","-","-"\n`;
    } else {
      csv += 'Certificate & Practical Experience,No certificate uploaded,-,-,-,-,-,-\n';
    }

    recommendedInternships.forEach(item => {
      csv += `Recommended Internship,"${item.title}","${item.company}","${item.location}","${item.workMode}",${item.matchPercentage},"${item.matchedSkills.join('|')}","${item.missingSkills.join('|')}"\n`;
    });

    externalRecommendations.forEach(item => {
      csv += `External Job,"${item.title}","${item.company}","${item.location}","${item.workMode}",${item.matchPercentage},"${item.matchedSkills.join('|')}","-"\n`;
    });

    analyzedInternships.forEach(item => {
      csv += `Skill Gap,"${item.title}","${item.company}","${item.location}","${item.workMode}",${item.matchPercentage},"${item.matchedSkills.join('|')}","${item.missingSkills.join('|')}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=career-report.csv'
    );

    res.send(csv);
  } catch (error) {
    console.error(error);
    res.redirect('/student/career-report');
  }
};

module.exports = {
  getCareerReport,
  downloadCareerReportPdf,
  downloadCareerReportCsv
};