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
const {
	postSession,
	deleteSession,
	getSession,
	updateSession,
} = require('../controllers/sessionController');
const {getTagName} = require('../controllers/tagNameController');
const {
	getBeneficiaries,
	postBeneficiary,
} = require('../controllers/beneficiaryController');

// const User = require('../models/users');
const router = express.Router();

router.route('/').get(getUserData).post(postUserData).put(putUserData);
router.post('/profile', updateProfile);
router.post('/set-pin', setTransactionPin);
router.post('/check-pin', checkTransactionPin);
router.route('/session').get(getSession).post(postSession);
router.route('/session/:id').put(updateSession).delete(deleteSession);
router.route('/get-tag/:senderTagName').post(getTagName);
router.route('/beneficiary').get(getBeneficiaries).post(postBeneficiary);

module.exports = router;
