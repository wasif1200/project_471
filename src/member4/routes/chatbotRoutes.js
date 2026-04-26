const express = require('express');
const controller = require('../controllers/chatbotController');

const router = express.Router();

router.post('/message', controller.sendMessage);
router.get('/history/:studentId', controller.getChatHistoryHandler);
router.delete('/history/:studentId', controller.clearChatHistoryHandler);
router.get('/suggestions/:studentId', controller.getSuggestions);
router.get('/profile/:studentId', controller.getStudentProfile);

module.exports = router;
