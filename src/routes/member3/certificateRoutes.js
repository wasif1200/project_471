const express = require('express');
const router = express.Router();
const controller = require('../../controllers/member3/certificateController');

router.post('/generate', controller.generateCertificate);
router.get('/student/:studentId', controller.getStudentCertificates);

module.exports = router;
