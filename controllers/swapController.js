const SwapTransaction = require('../models/swapTransaction');
const UserData = require('../models/userData');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');

const swapCurrency = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const {fromCurrency, toCurrency, toSwap, toReceive, id, fee} = req.body;
		const user = await UserData.findOne({email});

		const selectWallet = currency => {
			switch (currency) {
				case 'dollar':
					return DollarWallet;
				case 'euro':
					return EuroWallet;
				case 'pound':
					return PoundWallet;
				default:
					return LocalWallet;
			}
		};
		const fromLocalWallet = selectWallet(fromCurrency);
		const toWalletModal = selectWallet(toCurrency);
		const fromWallet = await fromLocalWallet.findOne({email});
		const toWallet = await toWalletModal.findOne({email});

		const toSwapAmount = (Number(toSwap) + Number(fee.toLocaleString())) * 100;
		const toReceiveAmount = toReceive * 100;

		if (toSwapAmount > fromWallet.balance)
			throw new Error(`Insufficient ${fromCurrency} balance`);
		fromWallet.balance -= toSwapAmount;
		toWallet.balance += toReceiveAmount;
		await fromWallet.save();
		await toWallet.save();

		const transaction = {
			email,
			phoneNumber,
			id,
			status: 'success',
			accNo: fromWallet.loopayAccNo,
			transactionType: 'swap',
			tagName: user.tagName,
			fullName: user.userProfile.fullName,
			swapFrom: fromCurrency,
			swapTo: toCurrency,
			swapFromAmount: toSwap,
			swapToAmount: toReceive,
			currency: toCurrency,
			reference: `TR${id}`,
		};
		await SwapTransaction.create(transaction);
		res.status(200).json('Swap successful');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	swapCurrency,
};
