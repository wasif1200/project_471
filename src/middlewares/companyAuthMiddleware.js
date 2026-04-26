const ensureCompanyAuth = (req, res, next) => {
  if (!req.session.company) {
    req.flash('error_msg', 'Please login first.');
    return res.redirect('/company/login');
  }

  next();
};

module.exports = {
  ensureCompanyAuth
};