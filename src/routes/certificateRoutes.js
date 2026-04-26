const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const {
  showCertificateForm,
  uploadCertificate,
  showCertificateResult,
  showCertificateViewer
} = require("../controllers/certificateController");

router.get("/", showCertificateForm);
router.post("/upload", upload.single("certificate"), uploadCertificate);
router.get("/result/:id", showCertificateResult);
router.get("/view/:id", showCertificateViewer);

module.exports = router;