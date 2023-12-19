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
} = require('../controllers/adminController');
const {updateNotifications} = require('../controllers/notificationController');
const {getRate, updateRate} = require('../controllers/currencyController');
const {getFees, updateFees} = require('../controllers/feesController');
const {
	postPopUp,
	deletePopUp,
	getPopUp,
	updatePopUp,
} = require('../controllers/popUpController');

const router = express.Router();

router.use(authorize('admin'));

router.get('/', getAllAdminInfo);
router.get('/users', getAllUsers);
router.get('/naira-balance', getAllNairaBalance);
router.get('/user/:id', getUser);
router.get('/transactions', getTransactions);
router.get('/recent', getRecent);
router.post('/loopay/transfer', transferToLoopayUser);
router.post('/finalize', finalizeWithdrawal);
router.post('/block-transaction', blockTransaction);
router.route('/notifications').get(getNotifications).put(updateNotifications);
router.route('/rate').get(getRate).put(updateRate);
router.route('/fees').get(getFees).put(updateFees);
router.route('/verifications').get(getVerifications).put(updateVerification);
router.route('/block').post(blockAccount);
router.route('/suspend').post(suspendAccount);
router.route('/unblock').post(unblockAccount);
router.route('/unsuspend').post(unsuspendAccount);
router.route('/popup').get(getPopUp).post(postPopUp).put(updatePopUp);
router.route('/popup/:popUpID').delete(deletePopUp);
router.route('/summary').get(getSummary);
router.route('/statement').get(getStatement);
router.route('/media-resource').delete(deleteResources);

module.exports = router;
