const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const getCompanyRegister = (req, res) => {
  res.render('company-register', { title: 'Company Registration' });
};

const getCompanyLogin = (req, res) => {
  res.render('company-login', { title: 'Company Login' });
};

const registerCompany = async (req, res) => {
  try {
    const {
      companyName,
      email,
      password,
      confirmPassword,
      registrationNumber,
      industrySector,
      companySize,
      companyDescription,
      companyWebsite,
      contactPersonName,
      designation,
      phoneNumber,
      officeAddress
    } = req.body;

    if (!companyName || !email || !password || !confirmPassword) {
      req.flash('error_msg', 'Please fill all required fields.');
      return res.redirect('/company/register');
    }

    if (password !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match.');
      return res.redirect('/company/register');
    }

    const existingCompany = await prisma.company.findUnique({
      where: { email }
    });

    if (existingCompany) {
      req.flash('error_msg', 'Email already registered.');
      return res.redirect('/company/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const registrationCertificate = req.files?.registrationCertificate
      ? `/uploads/${req.files.registrationCertificate[0].filename}`
      : null;

    const gstCertificate = req.files?.gstCertificate
      ? `/uploads/${req.files.gstCertificate[0].filename}`
      : null;

    await prisma.company.create({
      data: {
        companyName,
        email,
        password: hashedPassword,
        registrationNumber,
        industrySector,
        companySize,
        companyDescription,
        companyWebsite,
        contactPersonName,
        designation,
        phoneNumber,
        officeAddress,
        registrationCertificate,
        gstCertificate,
        updatedAt: new Date()
      }
    });

    req.flash('success_msg', 'Company registered successfully. Please login.');
    res.redirect('/company/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Company registration failed.');
    res.redirect('/company/register');
  }
};

const loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await prisma.company.findUnique({
      where: { email }
    });

    if (!company) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/company/login');
    }

    const isMatch = await bcrypt.compare(password, company.password);

    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/company/login');
    }

    req.session.company = {
      id: company.id,
      companyName: company.companyName,
      email: company.email
    };

    req.flash('success_msg', 'Login successful.');
    res.redirect('/company/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Company login failed.');
    res.redirect('/company/login');
  }
};

const logoutCompany = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/company/login');
  });
};

const getCompanyDashboard = async (req, res) => {
  try {
    const companyId = req.session.company.id;

    const internships = await prisma.internship.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    res.render('company-dashboard', {
      title: 'Company Dashboard',
      company: req.session.company,
      internships
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Unable to load dashboard.');
    res.redirect('/company/login');
  }
};

module.exports = {
  getCompanyRegister,
  getCompanyLogin,
  registerCompany,
  loginCompany,
  logoutCompany,
  getCompanyDashboard
};