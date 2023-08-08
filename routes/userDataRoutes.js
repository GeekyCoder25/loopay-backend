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
} = require('../controllers/pinController');
const {
	postSession,
	deleteSession,
	getSession,
	updateSession,
} = require('../controllers/sessionController');
const {
	getTagName,
	createTagName,
	getPhone,
} = require('../controllers/tagNameController');
const {
	getBeneficiaries,
	postBeneficiary,
} = require('../controllers/beneficiaryController');
const {getWallet, postWallet} = require('../controllers/walletController');
const {
	intitiateTransferToLoopay,
} = require('../controllers/transferController');
const {webhookHandler} = require('../controllers/webhook');

const router = express.Router();

router.route('/').get(getUserData).post(postUserData).put(putUserData);
router.post('/profile', updateProfile);
router.post('/set-pin', setTransactionPin);
router.post('/check-pin', checkTransactionPin);
router.route('/session').get(getSession).post(postSession);
router.route('/session/:id').put(updateSession).delete(deleteSession);
router.route('/get-tag/:senderTagName').post(getTagName);
router.route('/get-phone/:senderPhoneNo').post(getPhone);
router.route('/tag-name').post(createTagName);
router.route('/beneficiary').get(getBeneficiaries).post(postBeneficiary);
router.route('/wallet').get(getWallet).post(postWallet);
router.route('/loopay/transfer').post(intitiateTransferToLoopay);
router.route('/webhook').post(webhookHandler);

module.exports = router;
