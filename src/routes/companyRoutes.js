const express = require('express');
const router = express.Router();
const upload = require('../config/multer');

const {
  getCompanyRegister,
  getCompanyLogin,
  registerCompany,
  loginCompany,
  logoutCompany,
  getCompanyDashboard
} = require('../controllers/companyController');

const { ensureCompanyAuth } = require('../middlewares/companyAuthMiddleware');

router.get('/register', getCompanyRegister);
router.get('/login', getCompanyLogin);

router.post(
  '/register',
  upload.fields([
    { name: 'registrationCertificate', maxCount: 1 },
    { name: 'gstCertificate', maxCount: 1 }
  ]),
  registerCompany
);

router.post('/login', loginCompany);
router.get('/dashboard', ensureCompanyAuth, getCompanyDashboard);
router.get('/logout', logoutCompany);

module.exports = router;