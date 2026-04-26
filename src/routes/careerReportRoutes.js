const express = require('express');
const router = express.Router();

const {
  getCareerReport,
  downloadCareerReportPdf,
  downloadCareerReportCsv 
} = require('../controllers/careerReportController');

const { ensureStudentAuth } = require('../middlewares/authMiddleware');

router.get('/career-report', ensureStudentAuth, getCareerReport);
router.get('/career-report/pdf', ensureStudentAuth, downloadCareerReportPdf);
router.get('/career-report/csv', ensureStudentAuth, downloadCareerReportCsv);

module.exports = router;