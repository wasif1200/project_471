const {
  getRankedStudents,
  getTopMatches,
  listInternships: listInternshipsForMatching,
  getFirstInternshipId,
} = require('../services/matchingService');
const { displayCompanyName } = require('../services/skillUtils');

async function getMatches(req, res, next) {
  try {
    const data = await getRankedStudents(req.params.id);
    res.json({ success: true, ...data });
  } catch (error) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, error: error.message });
    if (error.message.includes('Invalid')) return res.status(400).json({ success: false, error: error.message });
    next(error);
  }
}

async function getTopMatchesHandler(req, res, next) {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 5);
    const data = await getTopMatches(req.params.id, limit);
    res.json({ success: true, ...data });
  } catch (error) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, error: error.message });
    if (error.message.includes('Invalid')) return res.status(400).json({ success: false, error: error.message });
    next(error);
  }
}

async function listInternships(req, res, next) {
  try {
    const internships = await listInternshipsForMatching();
    res.json({
      success: true,
      data: internships.map((internship) => ({
        id: internship.id,
        title: internship.title,
        companyName: displayCompanyName(internship),
        requiredSkills: (internship.member4RequiredSkills || internship.requiredSkills || []).map((row) => row.skill && row.skill.name).filter(Boolean),
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function getMatchingPage(req, res, next) {
  try {
    const requestedId = req.params.id ? parseInt(req.params.id, 10) : null;
    const internships = await listInternshipsForMatching();

    if (!internships.length) {
      return res.render('member4/matching/index.hbs', {
        title: 'Skill-Based Internship Matching',
        active: 'matching',
        noData: true,
        internships: [],
        rankedStudents: [],
      });
    }

    const requestedExists = internships.some((internship) => Number(internship.id) === requestedId);
    const selectedId = requestedExists ? requestedId : await getFirstInternshipId();

    const data = await getRankedStudents(selectedId);

    return res.render('member4/matching/index.hbs', {
      title: 'Skill-Based Internship Matching',
      active: 'matching',
      moduleDefinition: 'Skill-Based Internship Matching ranks students based on their skill match percentage for each internship.',
      internship: data.internship,
      rankedStudents: data.rankedStudents,
      stats: data.stats,
      internships: internships.map((internship) => ({
        ...internship,
        companyName: displayCompanyName(internship),
      })),
      selectedId,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMatches,
  getTopMatchesHandler,
  listInternships,
  getMatchingPage,
};
