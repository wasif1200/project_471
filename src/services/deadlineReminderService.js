const cron = require("node-cron");
const prisma = require("../config/prisma");
const { sendEmail } = require("./mailService");

function normalizeText(value) {
  return (value || "").toLowerCase().trim();
}

function studentMatchesInternship(student, internship) {
  const studentSector = normalizeText(student.sectorPreferences);
  const studentLocation = normalizeText(student.locationPreferences);

  const internshipDept = normalizeText(internship.department);
  const internshipLocation = normalizeText(internship.location);
  const internshipSkills = normalizeText(internship.requiredSkills);

  const studentSkills = (student.skills || []).map(skill => normalizeText(skill.name));

  const sectorMatch =
    !studentSector ||
    internshipDept.includes(studentSector) ||
    studentSector.includes(internshipDept);

  const locationMatch =
    !studentLocation ||
    internshipLocation.includes(studentLocation) ||
    studentLocation.includes(internshipLocation);

  const skillMatch =
    studentSkills.length === 0 ||
    studentSkills.some(skill => internshipSkills.includes(skill));

  return sectorMatch || locationMatch || skillMatch;
}

const sendDeadlineReminders = async () => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const internships = await prisma.internship.findMany({
      where: {
        status: "ACTIVE",
        applicationDeadline: {
          gte: now,
          lte: next24Hours
        }
      },
      include: {
        company: true
      }
    });

    if (!internships.length) {
      console.log("No upcoming internship deadlines found.");
      return;
    }

    const students = await prisma.student.findMany({
      include: {
        skills: true
      }
    });

    for (const internship of internships) {
      for (const student of students) {
        const alreadyApplied = await prisma.application.findUnique({
          where: {
            studentId_internshipId: {
              studentId: student.id,
              internshipId: internship.id
            }
          }
        });

        if (alreadyApplied) continue;

        if (!studentMatchesInternship(student, internship)) continue;

        await sendEmail({
          to: student.email,
          subject: `Deadline Reminder: ${internship.title} closes soon`,
          html: `
            <h2>Internship Deadline Reminder</h2>
            <p>Hello ${student.firstName},</p>
            <p>The internship <strong>${internship.title}</strong> at <strong>${internship.company.companyName}</strong> will close soon.</p>
            <p><strong>Deadline:</strong> ${new Date(internship.applicationDeadline).toLocaleString()}</p>
            <p><strong>Location:</strong> ${internship.location || "Not specified"}</p>
            <p><strong>Work Mode:</strong> ${internship.workMode || "Not specified"}</p>
            <p>Please log in to your account and apply before the deadline.</p>
          `
        });
      }
    }

    console.log("Deadline reminder job completed.");
  } catch (error) {
    console.error("Deadline reminder job error:", error);
  }
};

const startDeadlineReminderJob = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running deadline reminder job...");
    await sendDeadlineReminders();
  });
};

module.exports = {
  startDeadlineReminderJob,
  sendDeadlineReminders
};