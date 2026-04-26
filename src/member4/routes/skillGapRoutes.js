const express = require('express');
const controller = require('../controllers/skillGapController');

const router = express.Router();

router.get('/internships', controller.getAllInternships);
router.get('/students/:id', controller.getStudent);
router.get('/students/:studentId/skill-gap/:internshipId', controller.getSkillGap);

module.exports = router;
