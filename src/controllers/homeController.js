const getHomePage = (req, res) => {
  res.render('home', { title: 'Home' });
};

module.exports = { getHomePage };