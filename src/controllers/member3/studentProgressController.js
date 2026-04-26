const prisma = require('../../config/prisma');

function fullName(student) {
  return `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;
}

exports.getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        _count: {
          select: {
            member3Skills: true,
            member3CompletedCourses: true,
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    res.json({
      success: true,
      data: students.map((s) => ({
        id: s.id,
        name: fullName(s),
        email: s.email,
        major: s.department || s.degree || 'Student',
        enrollmentYear: s.graduationYear || null,
        avatarInitials: `${(s.firstName || 'S')[0]}${(s.lastName || '')[0] || ''}`.toUpperCase(),
        totalSkills: s._count.member3Skills,
        completedCourses: s._count.member3CompletedCourses,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { _count: { select: { member3Skills: true, member3CompletedCourses: true } } },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: { ...student, name: fullName(student) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStudentSkills = async (req, res) => {
  try {
    const skills = await prisma.member3StudentSkill.findMany({
      where: { studentId: parseInt(req.params.id) },
      include: { skill: true },
      orderBy: { level: 'desc' },
    });
    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStudentProgress = async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const [studentSkills, completedCourses, progressHistory, allCourses] = await Promise.all([
      prisma.member3StudentSkill.findMany({ where: { studentId }, include: { skill: true }, orderBy: { level: 'desc' } }),
      prisma.member3CompletedCourse.findMany({ where: { studentId }, include: { course: { include: { skill: true } } }, orderBy: { completedAt: 'desc' } }),
      prisma.member3SkillProgressHistory.findMany({ where: { studentId }, include: { skill: true }, orderBy: { recordedAt: 'asc' } }),
      prisma.member3Course.findMany({ include: { skill: true }, orderBy: { title: 'asc' } }),
    ]);

    const completedCourseIds = new Set(completedCourses.map((cc) => cc.courseId));
    const availableCourses = allCourses.filter((course) => !completedCourseIds.has(course.id));
    const totalSkills = studentSkills.length;
    const avgLevel = totalSkills ? Number((studentSkills.reduce((sum, s) => sum + s.level, 0) / totalSkills).toFixed(1)) : 0;
    const totalCompleted = completedCourses.length;

    const skillGains = {};
    for (const h of progressHistory) {
      if (!skillGains[h.skillId]) skillGains[h.skillId] = { name: h.skill.name, min: h.level, max: h.level };
      skillGains[h.skillId].min = Math.min(skillGains[h.skillId].min, h.level);
      skillGains[h.skillId].max = Math.max(skillGains[h.skillId].max, h.level);
    }

    let mostImproved = null;
    let maxGain = 0;
    for (const data of Object.values(skillGains)) {
      const gain = data.max - data.min;
      if (gain > maxGain) { maxGain = gain; mostImproved = data.name; }
    }

    const weakest = studentSkills[studentSkills.length - 1];
    const lineChartData = {};
    for (const h of progressHistory) {
      const name = h.skill.name;
      if (!lineChartData[name]) lineChartData[name] = [];
      lineChartData[name].push({ date: h.recordedAt.toISOString().split('T')[0], level: h.level });
    }

    const recommended = availableCourses.find((c) => c.skillId === weakest?.skillId);
    const insights = [];
    if (mostImproved) insights.push(`Your ${mostImproved} skill improved by ${maxGain} level${maxGain > 1 ? 's' : ''}.`);
    if (weakest) insights.push(`Your weakest skill is ${weakest.skill.name} at level ${weakest.level}.`);
    if (recommended) insights.push(`Recommended course: ${recommended.title} to improve ${recommended.skill.name}.`);

    res.json({
      success: true,
      data: {
        student: { ...student, name: fullName(student), university: student.universityName || 'University' },
        summary: { totalSkills, avgLevel, totalCompleted, mostImproved },
        skills: studentSkills.map((s) => ({ id: s.skillId, name: s.skill.name, category: s.skill.category, icon: s.skill.icon, level: s.level })),
        completedCourses: completedCourses.map((cc) => ({ id: cc.id, courseTitle: cc.course.title, skillName: cc.course.skill.name, skillIcon: cc.course.skill.icon, completedAt: cc.completedAt, duration: cc.course.duration })),
        availableCourses: availableCourses.map((c) => ({ id: c.id, title: c.title, description: c.description, skillName: c.skill.name, skillIcon: c.skill.icon, duration: c.duration })),
        charts: {
          barChartData: { labels: studentSkills.map((s) => s.skill.name), data: studentSkills.map((s) => s.level) },
          radarChartData: { labels: studentSkills.map((s) => s.skill.name), data: studentSkills.map((s) => s.level) },
          lineChartData,
        },
        insights,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.completeCourse = async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const courseId = parseInt(req.body.courseId);
    if (!courseId) return res.status(400).json({ success: false, error: 'courseId is required' });

    const course = await prisma.member3Course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    const existing = await prisma.member3CompletedCourse.findUnique({ where: { studentId_courseId: { studentId, courseId } } });
    if (existing) return res.status(409).json({ success: false, error: 'Course already completed' });

    let studentSkill = await prisma.member3StudentSkill.findUnique({ where: { studentId_skillId: { studentId, skillId: course.skillId } } });
    const oldLevel = studentSkill?.level || 0;
    const newLevel = Math.min(5, oldLevel + course.levelGranted);

    if (studentSkill) {
      studentSkill = await prisma.member3StudentSkill.update({ where: { studentId_skillId: { studentId, skillId: course.skillId } }, data: { level: newLevel } });
    } else {
      studentSkill = await prisma.member3StudentSkill.create({ data: { studentId, skillId: course.skillId, level: newLevel } });
    }

    await prisma.member3CompletedCourse.create({ data: { studentId, courseId } });
    await prisma.member3SkillProgressHistory.create({ data: { studentId, skillId: course.skillId, level: newLevel } });

    res.json({ success: true, message: 'Course completed and chart data updated.', data: { skillId: course.skillId, oldLevel, newLevel } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
