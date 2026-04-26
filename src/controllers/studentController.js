const prisma = require('../config/prisma');

const getDashboard = async (req, res) => {
  try {
    const studentId = req.session.student.id;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { skills: true }
    });

    const certificate = await prisma.certificate.findFirst({
      where: { studentId },
      orderBy: { id: 'desc' }
    });

    res.render('dashboard', {
      title: 'Student Dashboard',
      student,
      certificate
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Could not load dashboard.');
    res.redirect('/student/login');
  }
};

const getEditProfile = async (req, res) => {
  try {
    const studentId = req.session.student.id;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { skills: true }
    });

    res.render('edit-profile', {
      title: 'Edit Profile',
      student
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Could not load edit page.');
    res.redirect('/student/dashboard');
  }
};

const updateProfile = async (req, res) => {
  try {
    const studentId = req.session.student.id;

    const {
      firstName,
      lastName,
      phone,
      country,
      dateOfBirth,
      gender,
      universityName,
      degree,
      department,
      semester,
      cgpa,
      graduationYear,
      experience,
      locationPreferences,
      sectorPreferences,
      additionalInformation,
      
      skills
    } = req.body;

    const resumeFile = req.file ? `/uploads/resumes/${req.file.filename}` : undefined;

    await prisma.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        phone,
        country,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        universityName,
        degree,
        department,
        semester,
        cgpa,
        graduationYear,
        experience,
        locationPreferences,
        sectorPreferences,
        additionalInformation,
        ...(resumeFile && { resume: resumeFile })
      }
    });

    await prisma.studentSkill.deleteMany({
      where: { studentId }
    });

    
    const rawSkills = skills || req.body.studentskill || "";

    const skillArray = rawSkills
      ? rawSkills.split(',').map(skill => skill.trim()).filter(Boolean)
      : [];

    if (skillArray.length > 0) {
      await prisma.studentSkill.createMany({
        data: skillArray.map(skill => ({
          name: skill,
          studentId
        }))
      });
    }

    req.flash('success_msg', 'Profile updated successfully.');
    res.redirect('/student/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Profile update failed.');
    res.redirect('/student/edit-profile');
  }
};

module.exports = {
  getDashboard,
  getEditProfile,
  updateProfile
};