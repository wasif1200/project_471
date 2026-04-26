const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { ensureStudentAuth } = require('../middlewares/authMiddleware');
const {
  getDashboard,
  getEditProfile,
  updateProfile
} = require('../controllers/studentController');

const {
  getStudentInternships,
  getInternshipDetails
} = require('../controllers/internshipController');



router.get('/dashboard', ensureStudentAuth, getDashboard);
router.get('/edit-profile', ensureStudentAuth, getEditProfile);
router.put('/edit-profile', ensureStudentAuth, upload.single('resume'), updateProfile);

router.get('/internships', ensureStudentAuth, getStudentInternships);
router.get('/internships/:id', ensureStudentAuth, getInternshipDetails);


module.exports = router;