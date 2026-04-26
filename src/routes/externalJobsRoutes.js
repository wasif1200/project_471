const express = require("express");
const router = express.Router();
// Import the controller function
const { getExternalJobs } = require("../controllers/externalJobsController");

// The route should just point to the function, NOT try to read req.query itself
router.get("/", getExternalJobs);

module.exports = router;