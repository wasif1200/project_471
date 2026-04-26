const prisma = require("../config/prisma");

function calculateRating(durationMonths) {
  if (durationMonths >= 3) return 5;
  if (durationMonths === 2) return 3;
  if (durationMonths === 1) return 2;
  return 1;
}

const showCertificateForm = (req, res) => {
  if (!req.session.student) {
    return res.status(401).send("Please log in first");
  }

  res.render("certificateForm");
};

const showCertificateResult = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const certificate = await prisma.certificate.findUnique({
      where: { id }
    });

    if (!certificate) {
      return res.status(404).send("Certificate not found");
    }

    res.render("certificateResult", { certificate });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong while loading the result");
  }
};

const showCertificateViewer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const certificate = await prisma.certificate.findUnique({
      where: { id }
    });

    if (!certificate) {
      return res.status(404).send("Certificate not found");
    }

    res.render("certificateViewer", { certificate });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong while loading the certificate");
  }
};

const uploadCertificate = async (req, res) => {
  try {
    const { companyName, durationMonths } = req.body;

    if (!req.session.student) {
      return res.status(401).send("Please log in first");
    }

    if (!req.file) {
      return res.status(400).send("Certificate file is required");
    }

    const months = parseInt(durationMonths);
    const rating = calculateRating(months);
    const currentStudent = req.session.student;

    const certificate = await prisma.certificate.create({
      data: {
        studentId: currentStudent.id,
        studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
        companyName,
        certificateFile: `/uploads/${req.file.filename}`,
        durationMonths: months,
        experienceRating: rating
      }
    });

    res.render("loading", {
      redirectUrl: `/certificates/result/${certificate.id}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong while uploading certificate");
  }
};

module.exports = {
  showCertificateForm,
  uploadCertificate,
  showCertificateResult,
  showCertificateViewer
};