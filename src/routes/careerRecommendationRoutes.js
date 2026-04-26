const express = require('express');
const router = express.Router();
const { getRecommendedInternships } = require('../controllers/careerRecommendationController');

router.get('/recommendations', getRecommendedInternships);

module.exports = router;