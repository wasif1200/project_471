const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const cors = require('cors');
const { engine } = require('express-handlebars');
const path = require('path');
require('dotenv').config();

const homeRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const companyStudentProfileRoutes = require('./routes/companyStudentProfileRoutes');
const careerRecommendationRoutes = require('./routes/careerRecommendationRoutes');
const careerReportRoutes = require('./routes/careerReportRoutes');
const member3Routes = require('./routes/member3Routes');
const member4Routes = require('./routes/member4Routes');
const certificateRoutes = require('./routes/certificateRoutes');
const externalJobsRoutes = require('./routes/externalJobsRoutes');

const app = express();

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/member4/layouts'),
  partialsDir: path.join(__dirname, 'views/member4/partials'),
  helpers: {
    eq: (a, b) => a === b,
    gte: (a, b) => Number(a) >= Number(b),
    gt: (a, b) => Number(a) > Number(b),
    lt: (a, b) => Number(a) < Number(b),
    lte: (a, b) => Number(a) <= Number(b),
    json: (value) => JSON.stringify(value),
  },
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Vercel Functions can write only to /tmp, so expose the temporary upload
// directory for files created during the lifetime of the current function instance.
if (process.env.VERCEL) {
  app.use('/uploads', express.static(path.join('/tmp', 'uploads')));
  app.use('/member3/certificates', express.static(path.join('/tmp', 'member3', 'certificates')));
}

app.use(methodOverride('_method'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change_this_secret_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

app.use(flash());

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.currentStudent = req.session.student || null;
  res.locals.currentCompany = req.session.company || null;
  next();
});

app.use('/', homeRoutes);
app.use('/', authRoutes);

app.use('/external-jobs', externalJobsRoutes);
app.use('/student', studentRoutes);
app.use('/student', careerRecommendationRoutes);
app.use('/student', careerReportRoutes);

// Member 3 integrated modules
app.use('/member3', member3Routes);

// Member 4 integrated modules
app.use('/member4', member4Routes);

app.use('/company', companyRoutes);
app.use('/company/internships', internshipRoutes);

app.use('/certificates', certificateRoutes);
app.use('/applications', applicationRoutes);
app.use('/company/students', companyStudentProfileRoutes);

module.exports = app;
