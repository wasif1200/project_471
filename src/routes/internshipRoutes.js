const express = require("express");
const router = express.Router();

// Import all functions from the controller
const {
  getAllInternships,
  getInternshipById,
  filterInternships,
  getCreateInternship,
  createInternship,
  getCompanyInternships,
  getStudentInternships,
  getInternshipDetails,
  getEditInternship,
  updateInternship,
  closeInternship,
  deleteInternship,
  applyToInternship
} = require("../controllers/internshipController");

// Import Middlewares
const { ensureCompanyAuth } = require('../middlewares/companyAuthMiddleware');
const { ensureStudentAuth } = require('../middlewares/authMiddleware');

// Public/General Routes
router.get("/", getAllInternships);
router.get("/filter", filterInternships);

// Company Routes (Protected)
router.get('/create', ensureCompanyAuth, getCreateInternship);
router.post('/create', ensureCompanyAuth, createInternship);
router.get('/manage', ensureCompanyAuth, getCompanyInternships);

router.get('/edit/:id', ensureCompanyAuth, getEditInternship);
router.put('/edit/:id', ensureCompanyAuth, updateInternship);
router.post('/close/:id', ensureCompanyAuth, closeInternship);
router.post('/delete/:id', ensureCompanyAuth, deleteInternship);

// Student Routes (Protected)
router.get('/student/feed', ensureStudentAuth, getStudentInternships);
router.get('/student/:id', ensureStudentAuth, getInternshipDetails);
router.post('/student/:id/apply', ensureStudentAuth, applyToInternship);

// Specific ID route (Keep this at the bottom)
router.get("/:id", getInternshipById);

module.exports = router;