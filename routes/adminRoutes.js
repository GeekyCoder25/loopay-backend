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
} = require('../controllers/adminController');
const {updateNotifications} = require('../controllers/notificationController');
const {getRate, updateRate} = require('../controllers/currencyController');
const {getFees, updateFees} = require('../controllers/feesController');

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
router.route('/verification').put(updateVerification);

module.exports = router;
