const express = require('express');
const {authorize} = require('../middleware/authMiddleware');
const {
	getAllUsers,
	getAllAdminInfo,
	getAllNairaBalance,
	transferToLoopayUser,
	getUser,
	finalizeWithdrawal,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authorize('admin'));

router.get('/', getAllAdminInfo);
router.get('/users', getAllUsers);
router.get('/naira-balance', getAllNairaBalance);
router.get('/user/:id', getUser);
router.post('/loopay/transfer', transferToLoopayUser);
router.post('/finalize', finalizeWithdrawal);

module.exports = router;
