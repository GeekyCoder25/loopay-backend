const express = require('express');
const {
	getUserData,
	postUserData,
	putUserData,
	updateProfile,
} = require('../controllers/userDataController');
const {
	setTransactionPin,
	checkTransactionPin,
} = require('../controllers/authController');

// const User = require('../models/users');
const router = express.Router();

router.get('/', getUserData);
router.post('/', postUserData);
router.put('/', putUserData);
router.post('/profile', updateProfile);
router.post('/set-pin', setTransactionPin);
router.post('/check-pin', checkTransactionPin);

module.exports = router;
