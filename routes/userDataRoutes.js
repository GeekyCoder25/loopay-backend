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
	intitiateTransfer,
} = require('../controllers/transferController');
const {getTransactions} = require('../controllers/transactionController');
const {listBanks} = require('../controllers/listBank');
const {
	postRecipent,
	getRecipients,
} = require('../controllers/recipientController');
const {getRole} = require('../controllers/roleController');
const {swapCurrency} = require('../controllers/swapController');
const {
	postFundRequest,
	getFundRequest,
	confirmRequest,
} = require('../controllers/requestController');

const router = express.Router();

router.route('/').get(getUserData).post(postUserData).put(putUserData);
router.get('/role', getRole);
router.post('/profile', updateProfile);
router.post('/set-pin', setTransactionPin);
router.post('/check-pin', checkTransactionPin);
router.route('/session').get(getSession).post(postSession);
router.route('/session/:id').put(updateSession).delete(deleteSession);
router.route('/get-tag/:senderTagName').post(getTagName);
router.route('/get-phone').post(getPhone);
router.route('/tag-name').post(createTagName);
router.route('/beneficiary').get(getBeneficiaries).post(postBeneficiary);
router.route('/wallet').get(getWallet).post(postWallet);
router.route('/loopay/transfer').post(intitiateTransferToLoopay);
router.route('/transfer').post(intitiateTransfer);
router.route('/transaction').get(getTransactions);
router.route('/transferrecipient').get(getTransactions);
router.route('/banks').get(listBanks);
router.route('/savedbanks').get(getRecipients).post(postRecipent);
router.route('/airtime').post(postRecipent);
router.route('/swap').post(swapCurrency);
router.route('/request').get(getFundRequest).post(postFundRequest);
router.route('/request-confirm').post(confirmRequest);
router.route('/splash').get(getFundRequest);

module.exports = router;
