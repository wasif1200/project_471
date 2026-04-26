const prisma = require('../../config/prisma');

const CATEGORY_MAP = {
  javascript: 'Frontend', react: 'Frontend', html: 'Frontend', css: 'Frontend', vue: 'Frontend', angular: 'Frontend',
  node: 'Backend', express: 'Backend', java: 'Backend', python: 'Backend', django: 'Backend', sql: 'Database', mysql: 'Database', mongodb: 'Database',
  docker: 'DevOps', kubernetes: 'DevOps', aws: 'Cloud', azure: 'Cloud', git: 'Tools', figma: 'Design', communication: 'Soft Skill', leadership: 'Soft Skill',
};

function splitSkills(text) {
  if (!text) return [];
  return String(text)
    .split(/[,;\n|/]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^[-*]+\s*/, ''));
}

function categoryFor(skillName) {
  const lower = skillName.toLowerCase();
  const hit = Object.keys(CATEGORY_MAP).find((key) => lower.includes(key));
  return hit ? CATEGORY_MAP[hit] : 'General';
}

async function getInternshipsWithCompany() {
  return prisma.internship.findMany({ include: { company: true }, orderBy: { createdAt: 'desc' } });
}

exports.getOverview = async (req, res) => {
  try {
    const [internships, totalStudents] = await Promise.all([getInternshipsWithCompany(), prisma.student.count()]);
    const counts = {};
    internships.forEach((job) => splitSkills(job.requiredSkills).forEach((skill) => {
      const key = skill.toLowerCase();
      counts[key] = counts[key] || { name: skill, category: categoryFor(skill), count: 0 };
      counts[key].count += 1;
    }));
    const top = Object.values(counts).sort((a, b) => b.count - a.count)[0] || null;
    const categoryBreakdown = {};
    Object.values(counts).forEach((s) => { categoryBreakdown[s.category] = (categoryBreakdown[s.category] || 0) + s.count; });
    res.json({ success: true, overview: { totalInternships: internships.length, totalSkills: Object.keys(counts).length, totalStudents, totalRequirements: Object.values(counts).reduce((a, b) => a + b.count, 0), topSkill: top, categoryBreakdown } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTopSkills = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10');
    const category = req.query.category;
    const internships = await getInternshipsWithCompany();
    const counts = {};
    internships.forEach((job) => splitSkills(job.requiredSkills).forEach((skill) => {
      const key = skill.toLowerCase();
      const cat = categoryFor(skill);
      if (category && cat !== category) return;
      counts[key] = counts[key] || { skillId: key, name: skill, category: cat, demandCount: 0, avgRequiredLevel: 3, maxRequiredLevel: 5 };
      counts[key].demandCount += 1;
    }));
    const totalInternships = internships.length || 1;
    const skills = Object.values(counts).sort((a, b) => b.demandCount - a.demandCount).slice(0, limit).map((s) => ({ ...s, demandPercentage: Number(((s.demandCount / totalInternships) * 100).toFixed(1)) }));
    res.json({ success: true, totalInternships: internships.length, totalSkillsAnalyzed: skills.length, skills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSkillsByCategory = async (req, res) => {
  try {
    const internships = await getInternshipsWithCompany();
    const categoryMap = {};
    internships.forEach((job) => splitSkills(job.requiredSkills).forEach((skill) => {
      const category = categoryFor(skill);
      categoryMap[category] = categoryMap[category] || { category, totalDemand: 0, skills: {} };
      categoryMap[category].totalDemand += 1;
      categoryMap[category].skills[skill] = (categoryMap[category].skills[skill] || 0) + 1;
    }));
    const categories = Object.values(categoryMap).map((cat) => ({ category: cat.category, totalDemand: cat.totalDemand, topSkill: Object.entries(cat.skills).sort((a, b) => b[1] - a[1])[0]?.[0], skillCount: Object.keys(cat.skills).length })).sort((a, b) => b.totalDemand - a.totalDemand);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTrendingSkills = async (req, res) => {
  try {
    const internships = await getInternshipsWithCompany();
    const counts = {};
    internships.forEach((job) => splitSkills(job.requiredSkills).forEach((skill) => {
      const key = skill.toLowerCase();
      counts[key] = counts[key] || { name: skill, category: categoryFor(skill), demandCount: 0, avgRequiredLevel: 3 };
      counts[key].demandCount += 1;
    }));
    const trending = Object.values(counts).map((s) => ({ ...s, trendScore: Number((s.demandCount * s.avgRequiredLevel).toFixed(2)) })).sort((a, b) => b.trendScore - a.trendScore).slice(0, 8);
    res.json({ success: true, trending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getInternshipSkills = async (req, res) => {
  try {
    const internship = await prisma.internship.findUnique({ where: { id: parseInt(req.params.id) }, include: { company: true } });
    if (!internship) return res.status(404).json({ success: false, error: 'Internship not found' });
    const skills = splitSkills(internship.requiredSkills).map((name, index) => ({ skillId: index + 1, name, category: categoryFor(name), requiredLevel: 3 }));
    res.json({ success: true, internship: { id: internship.id, title: internship.title, company: internship.company?.companyName || 'Company', industry: internship.department || 'General', location: internship.location, type: internship.workMode || 'Onsite' }, skills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllInternships = async (req, res) => {
  try {
    const internships = await getInternshipsWithCompany();
    res.json({ success: true, internships: internships.map((i) => ({ id: i.id, title: i.title, company: i.company?.companyName || 'Company', industry: i.department || 'General', location: i.location, type: i.workMode || 'Onsite', postedAt: i.createdAt, requiredSkills: splitSkills(i.requiredSkills).length })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
