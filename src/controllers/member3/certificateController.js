const prisma = require('../../config/prisma');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function fullName(student) {
  return `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;
}

function calculateRating(durationMonths) {
  if (durationMonths >= 3) return 5;
  if (durationMonths === 2) return 3;
  if (durationMonths === 1) return 2;
  return 1;
}

exports.generateCertificate = async (req, res) => {
  const studentId = parseInt(req.body.studentId);
  const internshipId = parseInt(req.body.internshipId);
  if (!studentId || !internshipId) return res.status(400).json({ success: false, message: 'studentId and internshipId are required.' });

  try {
    const [student, internship] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.internship.findUnique({ where: { id: internshipId }, include: { company: true } }),
    ]);
    if (!student || !internship) return res.status(404).json({ success: false, message: 'Student or internship not found.' });

    const code = `CERT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const fileName = `${code}.pdf`;
    // Vercel Functions cannot write to the deployed project folder.
    // Use /tmp on Vercel and the public folder during local development.
    const outputDir = process.env.VERCEL
      ? path.join('/tmp', 'member3', 'certificates')
      : path.join(__dirname, '../../public/member3/certificates');
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, fileName);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.fontSize(30).text('Certificate of Internship Completion', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(16).text('This certificate is proudly presented to', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(28).text(fullName(student), { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(16).text(`for successfully completing the internship: ${internship.title}`, { align: 'center' });
    doc.moveDown(0.4);
    doc.text(`Company: ${internship.company?.companyName || 'Company'}`, { align: 'center' });
    if (internship.durationMonths) doc.text(`Duration: ${internship.durationMonths} month(s)`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(12).text(`Certificate Code: ${code}`, { align: 'center' });
    doc.text(`Issued: ${new Date().toDateString()}`, { align: 'center' });
    doc.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const certificate = await prisma.certificate.create({
      data: {
        studentId: student.id,
        studentName: fullName(student),
        companyName: internship.company?.companyName || 'Company',
        certificateFile: `/member3/certificates/${fileName}`,
        durationMonths: internship.durationMonths || 1,
        experienceRating: calculateRating(internship.durationMonths || 1),
      },
    });

    res.json({ success: true, message: 'Certificate generated successfully.', id: certificate.id, filePath: certificate.certificateFile, code, studentName: certificate.studentName, internshipTitle: internship.title, company: certificate.companyName, university: student.universityName || '' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentCertificates = async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { studentId: parseInt(req.params.studentId), certificateFile: { startsWith: '/member3/certificates/' } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: certificates.map((c) => ({ ...c, filePath: c.certificateFile, certificateCode: c.certificateFile.split('/').pop().replace('.pdf', ''), issuedAt: c.createdAt, internship: { title: 'Completed Internship', company: c.companyName, city: '' } })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
