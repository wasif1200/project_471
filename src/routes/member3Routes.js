const express = require('express');
const path = require('path');

const studentRoutes = require('./member3/students');
const analyticsRoutes = require('./member3/analyticsRoutes');
const locationRoutes = require('./member3/locationRoutes');
const certificateRoutes = require('./member3/certificateRoutes');

const router = express.Router();
const publicRoot = path.join(__dirname, '../public/member3');

router.use('/api/students', studentRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/internships', locationRoutes);
router.use('/api/certificates', certificateRoutes);

router.get('/', (req, res) => res.sendFile(path.join(publicRoot, 'index.html')));
router.get('/skill-tracker', (req, res) => res.sendFile(path.join(publicRoot, 'skill-tracker/index.html')));
router.get('/dashboard/:id', (req, res) => res.redirect(`/member3/skill-tracker/dashboard/${req.params.id}`));
router.get('/skill-tracker/dashboard/:id', (req, res) => res.sendFile(path.join(publicRoot, 'skill-tracker/dashboard.html')));
router.get('/analytics', (req, res) => res.sendFile(path.join(publicRoot, 'analytics/index.html')));
router.get('/location', (req, res) => res.sendFile(path.join(publicRoot, 'location-filter.html')));
router.get('/certificate', (req, res) => res.sendFile(path.join(publicRoot, 'certificate.html')));
router.get('/health', (req, res) => res.json({ success: true, service: 'Member 3 integrated modules', modules: ['Student Skill Progress Tracker', 'Skill Demand Analytics Dashboard', 'Location-Based Internship Filtering', 'Internship Completion Certificate Generator'] }));

module.exports = router;
