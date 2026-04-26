const prisma = require("../config/prisma");

const getAllInternships = async (req, res) => {
  try {
    const internships = await prisma.internship.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      count: internships.length,
      data: internships
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch internships"
    });
  }
};

const getInternshipById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const internship = await prisma.internship.findUnique({
      where: { id }
    });

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found"
      });
    }

    res.json({
      success: true,
      data: internship
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch internship"
    });
  }
};

const filterInternships = async (req, res) => {
  try {
    const { field, location, mode } = req.query;

    const internships = await prisma.internship.findMany({
      where: {
        ...(field ? { field: { contains: field } } : {}),
        ...(location ? { location: { contains: location } } : {}),
        ...(mode ? { mode: { contains: mode } } : {})
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      count: internships.length,
      data: internships
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to filter internships"
    });
  } // FIXED: Added missing closing brace here
};

const getCreateInternship = (req, res) => {
  res.render('internship-create', { title: 'Post Internship' });
};

const createInternship = async (req, res) => {
  try {
    const {
      title,
      department,
      location,
      workMode,
      durationMonths,
      stipend,
      roleDescription,
      learningOutcomes,
      numberOfPositions,
      requiredSkills,
      minimumDegreeLevel,
      preferredFieldOfStudy,
      minimumGpaPercentage,
      graduationYearRange,
      additionalPreferences,
      applicationDeadline
    } = req.body;

    if (!title || !roleDescription) {
      req.flash('error_msg', 'Role title and description are required.');
      return res.redirect('/company/internships/create');
    }

    await prisma.internship.create({
      data: {
        companyId: req.session.company.id,
        title,
        department,
        location,
        workMode,
        durationMonths: durationMonths ? parseInt(durationMonths) : null,
        stipend: stipend ? parseFloat(stipend) : null,
        roleDescription,
        learningOutcomes,
        numberOfPositions: numberOfPositions ? parseInt(numberOfPositions) : 1,
        requiredSkills,
        minimumDegreeLevel,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        preferredFieldOfStudy,
        minimumGpaPercentage,
        graduationYearRange,
        additionalPreferences,
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    req.flash('success_msg', 'Internship posted successfully.');
    res.redirect('/company/internships/manage'); //company goes to the manage page.
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to post internship.');
    res.redirect('/company/internships/create');
  }
};

const getCompanyInternships = async (req, res) => {
  try {
    const internships = await prisma.internship.findMany({
      where: { companyId: req.session.company.id },
      orderBy: { createdAt: 'desc' }
    });

    res.render('internship-list', {
      title: 'My Internships',
      internships
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to load internships.');
    res.redirect('/company/dashboard');
  }
};

const getEditInternship = async (req, res) => {
  try {
    const internshipId = parseInt(req.params.id);

    const internship = await prisma.internship.findFirst({
      where: {
        id: internshipId,
        companyId: req.session.company.id
      }
    });

    if (!internship) {
      req.flash('error_msg', 'Internship not found.');
      return res.redirect('/company/internships/manage');
    }

    res.render('internship-edit', {
      title: 'Edit Internship',
      internship
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to load internship.');
    res.redirect('/company/internships/manage');
  }
};

const updateInternship = async (req, res) => {
  try {
    const internshipId = parseInt(req.params.id);

    const {
      title,
      department,
      location,
      workMode,
      durationMonths,
      stipend,
      roleDescription,
      learningOutcomes,
      numberOfPositions,
      requiredSkills,
      minimumDegreeLevel,
      preferredFieldOfStudy,
      minimumGpaPercentage,
      graduationYearRange,
      additionalPreferences,
      applicationDeadline
    } = req.body;

    const internship = await prisma.internship.findFirst({
      where: {
        id: internshipId,
        companyId: req.session.company.id
      }
    });

    if (!internship) {
      req.flash('error_msg', 'Internship not found.');
      return res.redirect('/company/internships/manage');
    }

    await prisma.internship.update({
      where: { id: internshipId },
      data: {
        title,
        department,
        location,
        workMode,
        durationMonths: durationMonths ? parseInt(durationMonths) : null,
        stipend: stipend ? parseFloat(stipend) : null,
        roleDescription,
        learningOutcomes,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        numberOfPositions: numberOfPositions ? parseInt(numberOfPositions) : 1,
        requiredSkills,
        minimumDegreeLevel,
        preferredFieldOfStudy,
        minimumGpaPercentage,
        graduationYearRange,
        additionalPreferences
      }
    });

    req.flash('success_msg', 'Internship updated successfully.');
    res.redirect('/company/internships/manage');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to update internship.');
    res.redirect('/company/internships/manage');
  }
};

const closeInternship = async (req, res) => {
  try {
    const internshipId = parseInt(req.params.id);

    const internship = await prisma.internship.findFirst({
      where: {
        id: internshipId,
        companyId: req.session.company.id
      }
    });

    if (!internship) {
      req.flash('error_msg', 'Internship not found.');
      return res.redirect('/company/internships/manage');
    }

    await prisma.internship.update({
      where: { id: internshipId },
      data: { status: 'CLOSED' }
    });

    req.flash('success_msg', 'Internship closed successfully.');
    res.redirect('/company/internships/manage');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to close internship.');
    res.redirect('/company/internships/manage');
  }
};

const deleteInternship = async (req, res) => {
  try {
    const internshipId = parseInt(req.params.id);

    const internship = await prisma.internship.findFirst({
      where: {
        id: internshipId,
        companyId: req.session.company.id
      }
    });

    if (!internship) {
      req.flash('error_msg', 'Internship not found.');
      return res.redirect('/company/internships/manage');
    }

    await prisma.internship.delete({
      where: { id: internshipId }
    });

    req.flash('success_msg', 'Internship deleted successfully.');
    res.redirect('/company/internships/manage');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to delete internship.');
    res.redirect('/company/internships/manage');
  }
};


const getStudentInternships = async (req, res) => {
  try {
    const { location, workMode, skills, durationMonths } = req.query;

    const internships = await prisma.internship.findMany({
      where: {
        status: 'ACTIVE',
        ...(location ? { location: { contains: location } } : {}),
        ...(workMode ? { workMode: { contains: workMode } } : {}),
        ...(skills ? { requiredSkills: { contains: skills } } : {}),
        ...(durationMonths ? { durationMonths: parseInt(durationMonths) } : {})
      },
      include: {
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.render('student-internships', {
      title: 'Internship Opportunities',
      internships,
      filters: req.query
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to load internships.');
    res.redirect('/student/dashboard');
  }
};
const getInternshipDetails = async (req, res) => {
  try {
    const internshipId = parseInt(req.params.id);

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        company: true
      }
    });

    if (!internship) {
      req.flash('error_msg', 'Internship not found.');
      return res.redirect('/student/internships');
    }

    const studentId = req.session.student?.id;

    let existingApplication = null;

    if (studentId) {
      existingApplication = await prisma.application.findUnique({
         where: {
           studentId_internshipId: {
           studentId,
           internshipId
          }
      }
    });
    }

   res.render('student-internship-details', {
     title: internship.title,
     internship,
     existingApplication
   });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to load internship details.');
    res.redirect('/student/internships');
  }
};

const applyToInternship = async (req, res) => {
  try {
    const internshipId = parseInt(req.params.id);
    const studentId = req.session.student.id;

    const internship = await prisma.internship.findFirst({
      where: {
        id: internshipId,
        status: 'ACTIVE'
      }
    });
   

    if (!internship) {
      req.flash('error_msg', 'Internship not found or closed.');
      return res.redirect('/student/internships');
    }
     // ❗ ADD THIS BLOCK RIGHT HERE
   if (internship.applicationDeadline && new Date() > new Date(internship.applicationDeadline)) {
      req.flash('error_msg', 'Application deadline has passed.');
      return res.redirect(`/student/internships/${internshipId}`);
    }

    const existingApplication = await prisma.application.findUnique({
      where: {
        studentId_internshipId: {
          studentId,
          internshipId
        }
      }
    });

    if (existingApplication) {
      req.flash('error_msg', 'You already applied to this internship.');
      return res.redirect(`/student/internships/${internshipId}`);
    }

    await prisma.application.create({
      data: {
        studentId,
        internshipId,
        status: 'APPLIED'
      }
    });

    req.flash('success_msg', 'Application submitted successfully.');
    //res.redirect('/student/internships');
    res.redirect(`/student/internships/${internshipId}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to apply.');
    res.redirect('/student/internships');
  }
};





// FIXED: Added missing commas in the exports object
module.exports = {
  getAllInternships,
  getInternshipById,
  filterInternships,
  getCreateInternship,
  createInternship,
  getCompanyInternships,
  getEditInternship,
  updateInternship,
  closeInternship,
  deleteInternship,
  getStudentInternships,
  getInternshipDetails,
  applyToInternship
};