const express = require('express');
const router = express.Router();
const controller = require('../../controllers/member3/locationController');

router.get('/', controller.getInternships);
router.get('/cities', controller.getCities);

module.exports = router;
