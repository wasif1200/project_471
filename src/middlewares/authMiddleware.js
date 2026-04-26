const ensureStudentAuth = (req, res, next) => { 
  if (!req.session.student) {
    req.flash('error_msg', 'Please log in first.');
    return res.redirect('/student/login');
  }
  next();
};

module.exports = { ensureStudentAuth };