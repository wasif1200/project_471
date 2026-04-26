const express = require('express');
const controller = require('../controllers/matchingController');

const router = express.Router();

router.get('/internships', controller.listInternships);
router.get('/internships/:id/matches', controller.getMatches);
router.get('/internships/:id/top-matches', controller.getTopMatchesHandler);

module.exports = router;
