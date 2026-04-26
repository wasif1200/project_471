const express = require("express");
const router = express.Router();

const { ensureCompanyAuth } = require("../middlewares/companyAuthMiddleware");
const companyStudentProfileController = require("../controllers/companyStudentProfileController");

router.get(
  "/:studentId/profile",
  ensureCompanyAuth,
  companyStudentProfileController.getCompanyViewStudentProfile
);

module.exports = router;