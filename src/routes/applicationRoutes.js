const express = require("express");
const router = express.Router();

const applicationController = require("../controllers/applicationController");
const { ensureStudentAuth } = require("../middlewares/authMiddleware");
const { ensureCompanyAuth } = require("../middlewares/companyAuthMiddleware");

// Student routes
router.post("/apply/:internshipId", ensureStudentAuth, applicationController.applyToInternship);
router.get("/my", ensureStudentAuth, applicationController.getMyApplications);

// Company routes
router.get("/company", ensureCompanyAuth, applicationController.getCompanyApplications);
router.post("/company/update/:applicationId", ensureCompanyAuth, applicationController.updateApplicationStatus);

module.exports = router;