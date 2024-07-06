const express = require('express');
const {authorize} = require('../middleware/authMiddleware');
const {
	getAllUsers,
	getAllAdminInfo,
	getAllNairaBalance,
	transferToLoopayUser,
	getUser,
	finalizeWithdrawal,
	blockTransaction,
	getVerifications,
	updateVerification,
	blockAccount,
	suspendAccount,
	unblockAccount,
	unsuspendAccount,
	getTransactions,
	getRecent,
	getSummary,
	getStatement,
	getNotifications,
	deleteResources,
	getPaymentProofs,
	approveProof,
	declineProof,
	getInternational,
	updateInternational,
	deleteInternational,
} = require('../controllers/adminController');
const {
	updateNotifications,
	adminUpdateNotification,
} = require('../controllers/notificationController');
const {getRate, updateRate} = require('../controllers/currencyController');
const {getFees, updateFees} = require('../controllers/feesController');
const {
	postPopUp,
	deletePopUp,
	getPopUp,
	updatePopUp,
} = require('../controllers/popUpController');
const {reverseTransaction} = require('../controllers/transferController');
const {getAPIs, updateAPIs} = require('../controllers/serverAPIS');
const {getReports, deleteReport} = require('../controllers/reportController');

const router = express.Router();

router.use(authorize('admin'));

router.get('/', getAllAdminInfo);
router.get('/users', getAllUsers);
router.get('/naira-balance', getAllNairaBalance);
router.get('/user/:id', getUser);
router.get('/transactions', getTransactions);
router.get('/recent', getRecent);
router.post('/loopay/transfer', transferToLoopayUser);
router.post('/transfer/reverse', reverseTransaction);
router.post('/finalize', finalizeWithdrawal);
router.post('/block-transaction', blockTransaction);
router.route('/notifications').get(getNotifications).put(updateNotifications);
router.route('/notification/:id').put(adminUpdateNotification);
router.route('/rate').get(getRate).put(updateRate);
router.route('/fees').get(getFees).put(updateFees);
router.route('/verification').get(getVerifications).put(updateVerification);
router.route('/block').post(blockAccount);
router.route('/suspend').post(suspendAccount);
router.route('/unblock').post(unblockAccount);
router.route('/unsuspend').post(unsuspendAccount);
router.route('/popup').get(getPopUp).post(postPopUp).put(updatePopUp);
router.route('/popup/:popUpID').delete(deletePopUp);
router.route('/summary').get(getSummary);
router.route('/statement').get(getStatement);
router.route('/proof').get(getPaymentProofs);
router.route('/approve').post(approveProof);
router.route('/decline/:id').delete(declineProof);
router.route('/report').get(getReports);
router.route('/report/:id').delete(deleteReport);
router.route('/international').get(getInternational);
router
	.route('/international/:id')
	.put(updateInternational)
	.delete(deleteInternational);
router.route('/media-resource').delete(deleteResources);
router.route('/apis').get(getAPIs).put(updateAPIs);

module.exports = router;
