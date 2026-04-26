const prisma = require("../config/prisma");
const { sendEmail } = require("../services/mailService");
// helper functions to get logged-in IDs
function getStudentId(req) {
  return req.user?.id || req.session?.student?.id || null;
}

function getCompanyId(req) {
  return req.user?.id || req.session?.company?.id || null;
}

// Student applies to an internship
exports.applyToInternship = async (req, res) => {
  try {
    const studentId = getStudentId(req);
    const internshipId = parseInt(req.params.internshipId);

    if (!studentId) {
      req.flash("error_msg", "Please log in as student.");
      return res.redirect("/student/login");
    }

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { company: true }
    });

    if (!internship) {
      req.flash("error_msg", "Internship not found.");
      return res.redirect("/student/internships");
    }

    // optional deadline check
    if (internship.applicationDeadline && new Date() > new Date(internship.applicationDeadline)) {
      req.flash("error_msg", "Application deadline has passed.");
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
      req.flash("error_msg", "You have already applied for this internship.");
      return res.redirect("/applications/my");
    }

    await prisma.application.create({
      data: {
        studentId,
        internshipId,
        status: "APPLIED"
      }
    });

    req.flash("success_msg", "Application submitted successfully.");
    return res.redirect("/applications/my");
  } catch (error) {
    console.error("applyToInternship error:", error);
    req.flash("error_msg", "Something went wrong while applying.");
    return res.redirect("/student/internships");
  }
};

// Student sees own applications
exports.getMyApplications = async (req, res) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId) {
      req.flash("error_msg", "Please log in as student.");
      return res.redirect("/student/login");
    }

    const applications = await prisma.application.findMany({
      where: { studentId },
      include: {
        internship: {
          include: {
            company: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    res.render("my-applications", {
      title: "My Applications",
      applications
    });
  } catch (error) {
    console.error("getMyApplications error:", error);
    req.flash("error_msg", "Unable to load your applications.");
    return res.redirect("/student/dashboard");
  }
};

// Company sees applications received for its internships
exports.getCompanyApplications = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      req.flash("error_msg", "Please log in as company.");
      return res.redirect("/company/login");
    }

    const applications = await prisma.application.findMany({
      where: {
        internship: {
          companyId
        }
      },
      include: {
        student: true,
        internship: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    res.render("company-applications", {
      title: "Applications Received",
      applications
    });
  } catch (error) {
    console.error("getCompanyApplications error:", error);
    req.flash("error_msg", "Unable to load applications.");
    return res.redirect("/company/dashboard");
  }
};

// Company updates application status and interview details
exports.updateApplicationStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const applicationId = parseInt(req.params.applicationId);

    const {
      status,
      interviewType,
      interviewDate,
      interviewTime,
      interviewLocation,
      interviewMeetLink,
      interviewNote
    } = req.body;

    if (!companyId) {
      req.flash("error_msg", "Please log in as company.");
      return res.redirect("/company/login");
    }

    const allowedStatuses = [
      "APPLIED",
      "REVIEWED",
      "INTERVIEW_SCHEDULED",
      "REJECTED"
    ];

    if (!allowedStatuses.includes(status)) {
      req.flash("error_msg", "Invalid application status.");
      return res.redirect("/applications/company");
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        internship: true,
        student: true
      }
    });

    if (!application) {
      req.flash("error_msg", "Application not found.");
      return res.redirect("/applications/company");
    }

    if (application.internship.companyId !== companyId) {
      req.flash("error_msg", "Unauthorized action.");
      return res.redirect("/applications/company");
    }

    let interviewDateTime = null;

    if (status === "INTERVIEW_SCHEDULED") {
      if (!interviewType || !interviewDate || !interviewTime) {
        req.flash("error_msg", "Interview type, date, and time are required.");
        return res.redirect("/applications/company");
      }

      interviewDateTime = new Date(`${interviewDate}T${interviewTime}:00`);
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        interviewType: status === "INTERVIEW_SCHEDULED" ? interviewType : null,
        interviewDateTime: status === "INTERVIEW_SCHEDULED" ? interviewDateTime : null,
        interviewLocation:
          status === "INTERVIEW_SCHEDULED" && interviewType === "OFFLINE"
            ? interviewLocation
            : null,
        interviewMeetLink:
          status === "INTERVIEW_SCHEDULED" && interviewType === "ONLINE"
            ? interviewMeetLink
            : null,
        interviewNote: status === "INTERVIEW_SCHEDULED" ? interviewNote || null : null
      }
    });

    if (status === "INTERVIEW_SCHEDULED") {
      await sendEmail({
        to: application.student.email,
        subject: `Interview Scheduled for ${application.internship.title}`,
        html: `
      <h2>Interview Scheduled</h2>
      <p>Hello ${application.student.firstName},</p>
      <p>Your application for <strong>${application.internship.title}</strong> has moved to <strong>Interview Scheduled</strong>.</p>
      <p><strong>Interview Type:</strong> ${interviewType}</p>
      <p><strong>Date & Time:</strong> ${interviewDateTime ? new Date(interviewDateTime).toLocaleString() : "N/A"}</p>
      <p><strong>Location:</strong> ${interviewLocation || "N/A"}</p>
      <p><strong>Meet Link:</strong> ${interviewMeetLink || "N/A"}</p>
      <p><strong>Note:</strong> ${interviewNote || "N/A"}</p>
    `
      });
    }

    if (status === "REJECTED") {
      await sendEmail({
        to: application.student.email,
        subject: `Application Update for ${application.internship.title}`,
        html: `
      <h2>Application Update</h2>
      <p>Hello ${application.student.firstName},</p>
      <p>Your application for <strong>${application.internship.title}</strong> has been marked as <strong>Rejected</strong>.</p>
      <p>Thank you for applying.</p>
    `
      });
    }

    req.flash("success_msg", "Application status updated successfully.");
    return res.redirect("/applications/company");
  } catch (error) {
    console.error("updateApplicationStatus error:", error);
    req.flash("error_msg", "Unable to update application status.");
    return res.redirect("/applications/company");
  }
};