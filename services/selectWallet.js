const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');

const selectWallet = currency => {
	switch (currency) {
		case 'naira':
			return LocalWallet;
		case 'NGN':
			return LocalWallet;
		case 'dollar':
			return DollarWallet;
		case 'USD':
			return DollarWallet;
		case 'EUR':
			return EuroWallet;
		case 'euro':
			return EuroWallet;
		case 'pound':
			return PoundWallet;
		case 'GBP':
			return PoundWallet;
		default:
			return LocalWallet;
	}
};

module.exports = selectWallet;
