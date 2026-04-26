const prisma = require("../config/prisma");

exports.getCompanyViewStudentProfile = async (req, res) => {
  try {
    const companyId = req.session.company?.id;
    const studentId = parseInt(req.params.studentId);

    if (!companyId) {
      req.flash("error_msg", "Please log in as company.");
      return res.redirect("/company/login");
    }

    const existingApplication = await prisma.application.findFirst({
      where: {
        studentId,
        internship: {
          companyId
        }
      }
    });

    if (!existingApplication) {
      req.flash("error_msg", "You are not authorized to view this student's profile.");
      return res.redirect("/applications/company");
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        skills: true
      }
    });

    if (!student) {
      req.flash("error_msg", "Student not found.");
      return res.redirect("/applications/company");
    }

    const studentApplicationsToThisCompany = await prisma.application.findMany({
      where: {
        studentId,
        internship: {
          companyId
        }
      },
      include: {
        internship: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    res.render("company-student-profile", {
      title: "Student Profile",
      student,
      studentApplicationsToThisCompany
    });
  } catch (error) {
    console.error("getCompanyViewStudentProfile error:", error);
    req.flash("error_msg", "Unable to load student profile.");
    return res.redirect("/applications/company");
  }
};