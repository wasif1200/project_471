const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const getStudentLogin = (req, res) => {
  res.render('login', { title: 'Student Login' });
};

const getStudentRegister = (req, res) => {
  res.render('register', { title: 'Student Registration' });
};

const registerStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone,
      country,
      dateOfBirth,
      gender,
      universityName,
      degree,
      department,
      semester,
      cgpa,
      graduationYear,
      experience,
      locationPreferences,
      sectorPreferences,
      additionalInformation,
      skills
    } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      req.flash('error_msg', 'Please fill all required fields.');
      return res.redirect('/student/register');
    }

    if (password !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match.');
      return res.redirect('/student/register');
    }

    const existingStudent = await prisma.student.findUnique({
      where: { email }
    });

    if (existingStudent) {
      req.flash('error_msg', 'Email already registered.');
      return res.redirect('/student/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const resumeFile = req.file ? `/uploads/${req.file.filename}` : null;

    const rawSkills = skills || req.body.studentskill || "";

    const skillArray = rawSkills
       ? rawSkills.split(',').map(skill => skill.trim()).filter(Boolean)
       : [];

    await prisma.student.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        country,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        resume: resumeFile,
        universityName,
        degree,
        department,
        semester,
        cgpa,
        graduationYear,
        experience,
        locationPreferences,
        sectorPreferences,
        additionalInformation,
        skills: {
          create: skillArray.map(skill => ({ name: skill }))
        }
      }
    });

    res.render('registration-success', { title: 'Registration Complete' });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Registration failed.');
    res.redirect('/student/register');
  }
};

const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await prisma.student.findUnique({
      where: { email },
      include: { skills: true }
    });

    if (!student) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/student/login');
    }

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/student/login');
    }

    req.session.student = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email
    };

    req.flash('success_msg', 'Login successful.');
    res.redirect('/student/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Login failed.');
    res.redirect('/student/login');
  }
};

const logoutStudent = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/student/login');
  });
};

module.exports = {
  getStudentLogin,
  getStudentRegister,
  registerStudent,
  loginStudent,
  logoutStudent
};