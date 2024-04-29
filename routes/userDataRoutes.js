const express = require('express');
const {
	getUserData,
	postUserData,
	putUserData,
	updateProfile,
	deletePopUp,
	deleteAccount,
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
	deleteBeneficiary,
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
	checkRecipient,
	deleteRecipient,
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
	getOperators,
} = require('../controllers/airtimeController');
const {getFees} = require('../controllers/feesController');
const {getStatements} = require('../controllers/statementController');
const airtimeAPIToken = require('../middleware/airtimeMiddleWare');
const billAPIToken = require('../middleware/billMiddleware');
const {
	payABill,
	getBills,
	getBillsTransactions,
} = require('../controllers/billController');
const {postVerificationData} = require('../controllers/verificationController');
const {accountStatus} = require('../middleware/statusMiddleWare');
const {
	getReferrals,
	postReferral,
	referralWithdraw,
} = require('../controllers/referralController');
const {postPaymentProof} = require('../controllers/paymentController');
const {
	PagaGetBills,
	PagaGetMerchantsServices,
	PagaValidateCustomer,
	PagaPayBill,
} = require('../controllers/paga/billController');
const {generateReference} = require('../middleware/pagaMiddleWare');
const {schedulePayment} = require('../middleware/scheduleMiddleWare');
const {
	getSchedules,
	deleteSchedule,
	updateSchedule,
} = require('../controllers/scheduleController');
const {
	PagaGetOperators,
	PagaBuyAirtime,
} = require('../controllers/paga/airtimeController');
const serverAPIs = require('../models/serverAPIs');
const {postReport} = require('../controllers/reportController');
const {generateReceipt} = require('../controllers/receiptController');
const {unsubscribeEmailAlerts} = require('../controllers/emailAlertController');

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
router.delete('/beneficiary/:tagName', deleteBeneficiary);
router.route('/wallet').get(getWallet).post(postWallet);
router
	.route('/loopay/transfer')
	.post(accountStatus, schedulePayment, initiateTransferToLoopay);
router
	.route('/transfer')
	.post(accountStatus, schedulePayment, initiateTransfer);
router.route('/transaction').get(getTransactions);
router.route('/transferrecipient').get(getTransactions);
router.route('/banks').get(listBanks);
router.route('/savedbanks').get(getRecipients).post(postRecipient);
router.delete('/savedBanks/:id', deleteRecipient);
router.route('/check-recipient').post(checkRecipient);
router.route('/airtime/operators').get(airtimeAPIToken, getOperators);
router.route('/get-network').get(airtimeAPIToken, getNetwork);
router.route('/email/unsubscribe').get(unsubscribeEmailAlerts);
router
	.route('/data')
	.post(airtimeAPIToken, accountStatus, schedulePayment, buyData);

const setupRouter = async () => {
	let apiType;

	const selectAPI = async () => {
		apiType = await serverAPIs.findOne({});
		if (!apiType) {
			apiType = await serverAPIs.create({
				airtime: 'reloadly',
				data: 'reloadly',
				bill: 'paga',
			});
		}
	};
	await selectAPI();

	switch (apiType.bill) {
		case 'paga':
			router.route('/bill-merchants').post(generateReference, PagaGetBills);
			router
				.route('/bill-services')
				.post(generateReference, PagaGetMerchantsServices);

			router
				.route('/bill-validate')
				.post(generateReference, PagaValidateCustomer);

			router
				.route('/bill-pay')
				.post(accountStatus, generateReference, schedulePayment, PagaPayBill);
			break;
		case 'reloadly':
			router.route('/bill-merchants').post(billAPIToken, getBills);
			router
				.route('/bill-services')
				.post(billAPIToken, (req, res) =>
					res.status(200).json([{name: 'Post Paid'}, {name: 'Pre Paid'}])
				);
			router.route('/bill').post(billAPIToken, accountStatus, payABill);
			break;
		default:
			router.route('/bill-merchants').post(generateReference, PagaGetBills);
			router
				.route('/bill-services')
				.post(generateReference, PagaGetMerchantsServices);
			router
				.route('/bill-validate')
				.post(generateReference, PagaValidateCustomer);
			router
				.route('/bill-pay')
				.post(accountStatus, generateReference, schedulePayment, PagaPayBill);
			break;
	}

	switch (apiType.airtime) {
		case 'paga':
			router
				.route('/airtime')
				.post(
					accountStatus,
					generateReference,
					schedulePayment,
					PagaBuyAirtime
				);
			break;
		case 'reloadly':
			router
				.route('/airtime')
				.post(airtimeAPIToken, accountStatus, schedulePayment, buyAirtime);
			break;
		default:
			router
				.route('/airtime')
				.post(airtimeAPIToken, accountStatus, schedulePayment, buyAirtime);
			break;
	}

	switch (apiType.data) {
		case 'paga':
			router
				.route('/airtime')
				.post(
					accountStatus,
					generateReference,
					schedulePayment,
					PagaBuyAirtime
				);
			break;
		case 'reloadly':
			router.route('/data-plans').get(airtimeAPIToken, getDataPlans);

			break;
		default:
			router.route('/data-plans').get(airtimeAPIToken, getDataPlans);

			break;
	}
};

setupRouter();
router.route('/bill/status').get(billAPIToken, getBillsTransactions);
router.route('/bill/status/:id').get(billAPIToken, getBillsTransactions);
router.route('/swap').post(accountStatus, swapCurrency);
router
	.route('/request')
	.get(getFundRequest)
	.post(accountStatus, postFundRequest);
router.route('/request-confirm').post(accountStatus, confirmRequest);
router.route('/debit-card/:currency').get(getCards).post(postCard);
router.route('/debit-card').post(postCard);
router.route('/notification').get(getNotifications);
router.route('/notification/:id').put(updateNotification);
router.route('/rate/:currency').get(getRate);
router.route('/splash').get(getFundRequest);
router.route('/fees').get(getFees);
router.route('/statement').get(getStatements);
router.route('/schedule').get(getSchedules);
router.route('/schedule/:id').put(updateSchedule).delete(deleteSchedule);
router.route('/verify').post(postVerificationData);
router.route('/popup/:popUpID').delete(deletePopUp);

router.route('/referral').get(getReferrals).post(postReferral);
router.route('/withdraw-referral').get(referralWithdraw);
router.route('/payment-proof').post(postPaymentProof);
router.route('/report').post(postReport);
router.route('/receipt').post(generateReceipt);
router.route('/delete-account/:email').delete(deleteAccount);

module.exports = router;
