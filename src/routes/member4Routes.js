const express = require('express');
const matchingController = require('../member4/controllers/matchingController');
const skillGapRoutes = require('../member4/routes/skillGapRoutes');
const matchingRoutes = require('../member4/routes/matchingRoutes');
const skillSuggestionsRoutes = require('../member4/routes/skillSuggestions.routes');
const chatbotRoutes = require('../member4/routes/chatbotRoutes');

const router = express.Router();

router.get('/', (req, res) => res.render('member4/dashboard.hbs', { title: 'Skill Analyzer', active: 'home' }));
router.get('/skill-gap', (req, res) => res.render('member4/skill-gap.hbs', { title: 'Skill Gap Dashboard', active: 'skill-gap' }));
router.get('/matching', matchingController.getMatchingPage);
router.get('/matching/:id', matchingController.getMatchingPage);
router.get('/skill-suggestions', (req, res) => res.render('member4/skill-suggestions.hbs', { title: 'Personalized Skill Suggestions', active: 'skill-suggestions' }));
router.get('/chatbot', (req, res) => res.render('member4/chatbot.hbs', { title: 'AI Chatbot Assistant', active: 'chatbot' }));

router.use('/api/skill-gap', skillGapRoutes);
router.use('/api/matching', matchingRoutes);
router.use('/api/skill-suggestions', skillSuggestionsRoutes);
router.use('/api/chatbot', chatbotRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, service: 'Member 4 Skill Analyzer', modules: ['Skill Gap Analysis', 'Skill-Based Internship Matching', 'Personalized Skill Suggestions', 'AI Chatbot Assistant'] });
});

module.exports = router;
