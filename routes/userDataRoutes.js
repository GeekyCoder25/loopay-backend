const express = require('express');
const {
	getUserData,
	postUserData,
	putUserData,
} = require('../controllers/userDataController');

// const User = require('../models/users');
const router = express.Router();

router.get('/', getUserData);
router.post('/', postUserData);
router.put('/', putUserData);
module.exports = router;
