const express = require('express');
const router = express.Router();
const controller = require('../../controllers/member3/analyticsController');

router.get('/overview', controller.getOverview);
router.get('/top-skills', controller.getTopSkills);
router.get('/by-category', controller.getSkillsByCategory);
router.get('/trending', controller.getTrendingSkills);
router.get('/internship-skills/:id', controller.getInternshipSkills);
router.get('/all-internships', controller.getAllInternships);

module.exports = router;
