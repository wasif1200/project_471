const express = require('express');
const router = express.Router();
const controller = require('../../controllers/member3/studentProgressController');

router.get('/', controller.getAllStudents);
router.get('/:id', controller.getStudentById);
router.get('/:id/skills', controller.getStudentSkills);
router.get('/:id/progress', controller.getStudentProgress);
router.post('/:id/complete-course', controller.completeCourse);

module.exports = router;
