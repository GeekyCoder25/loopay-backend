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
	initiateTransferToLoopay,
	initiateTransfer,
} = require('../controllers/transferController');
const {getTransactions} = require('../controllers/transactionController');
const {listBanks} = require('../controllers/listBank');
const {
	postRecipient,
	getRecipients,
} = require('../controllers/recipientController');
const {getRole} = require('../controllers/roleController');
const {swapCurrency} = require('../controllers/swapController');
const {
	postFundRequest,
	getFundRequest,
	confirmRequest,
} = require('../controllers/requestController');
const {getCards, postCard} = require('../controllers/debitCardController');
const {
	getNotifications,
	updateNotification,
} = require('../controllers/notificationController');
const {getRate} = require('../controllers/currencyController');
const {
	buyAirtime,
	buyData,
	getNetwork,
	getDataPlans,
} = require('../controllers/airtimeController');
const {getFees} = require('../controllers/feesController');
const {getStatements} = require('../controllers/statementController');
const airtimeAPIToken = require('../middleware/airtimeMiddleWare');
const billAPIToken = require('../middleware/billMiddleware');
const {payABill, getBills} = require('../controllers/billController');

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
router.route('/loopay/transfer').post(initiateTransferToLoopay);
router.route('/transfer').post(initiateTransfer);
router.route('/transaction').get(getTransactions);
router.route('/transferrecipient').get(getTransactions);
router.route('/banks').get(listBanks);
router.route('/savedbanks').get(getRecipients).post(postRecipient);
router.route('/get-network').get(airtimeAPIToken, getNetwork);
router.route('/airtime').post(airtimeAPIToken, buyAirtime);
router.route('/get-data-plans').get(airtimeAPIToken, getDataPlans);
router.route('/data').post(airtimeAPIToken, buyData);
router.route('/bill').get(billAPIToken, getBills).post(billAPIToken, payABill);
router.route('/swap').post(swapCurrency);
router.route('/request').get(getFundRequest).post(postFundRequest);
router.route('/request-confirm').post(confirmRequest);
router.route('/debit-card/:currency').get(getCards).post(postCard);
router.route('/debit-card').post(postCard);
router.route('/notification').get(getNotifications);
router.route('/notification/:id').put(updateNotification);
router.route('/rate').get(getRate);
router.route('/splash').get(getFundRequest);
router.route('/fees').get(getFees);
router.route('/statement').get(getStatements);

module.exports = router;
