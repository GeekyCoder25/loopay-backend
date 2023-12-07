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
router.post('/loopay/transfer', transferToLoopayUser);
router.post('/finalize', finalizeWithdrawal);
router.post('/block-transaction', blockTransaction);
router.put('/notifications', updateNotifications);
router.route('/rate').get(getRate).put(updateRate);
router.route('/fees').get(getFees).put(updateFees);
router.route('/verifications').get(getVerifications).put(updateVerification);
router.route('/block').post(blockAccount);
router.route('/suspend').post(suspendAccount);
router.route('/unblock').post(unblockAccount);
router.route('/unsuspend').post(unsuspendAccount);
router.route('/popup').get(getPopUp).post(postPopUp).put(updatePopUp);
router.route('/popup/:popUpID').delete(deletePopUp);

module.exports = router;
