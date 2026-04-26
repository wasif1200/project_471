const express = require('express');
const ctrl = require('../controllers/skillSuggestions.controller');
const { validateStudentId, validateCourseId } = require('../middleware/skillSuggestions.validate');

const router = express.Router();

router.get('/history/:studentId', validateStudentId, ctrl.getCourseHistory);
router.get('/:studentId', validateStudentId, ctrl.getSkillSuggestions);
router.post('/:courseId/start', validateCourseId, ctrl.startCourse);
router.post('/:courseId/complete', validateCourseId, ctrl.completeCourse);

module.exports = router;
