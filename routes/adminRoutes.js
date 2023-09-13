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
} = require('../controllers/adminController');
const {updateNotifications} = require('../controllers/notificationController');

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

module.exports = router;
