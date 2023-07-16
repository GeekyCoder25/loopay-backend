const express = require('express');
const {
	registerAccount,
	loginAccount,
	forgetPassword,
	confirmOTP,
	checkPassword,
	changePassword,
	// allusers,
} = require('../controllers/authController');
const {protect} = require('../middleware/authMiddleware');

// const User = require('../models/users');
const router = express.Router();

router.post('/register', registerAccount);
router.post('/login', loginAccount);
router.post('/forget-password', forgetPassword);
router.post('/confirm-otp/:otp', confirmOTP);
router.post('/check-password/', protect, checkPassword);
router.post('/change-password/:email', changePassword);

module.exports = router;
