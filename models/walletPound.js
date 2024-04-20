const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const PoundWallet = new Schema({
	walletID: {
		type: String,
		// required: [true, 'please provide your customer wallet Id'],
		// unique: true,
	},
	currency: String,
	currencyCode: String,
	currencyDetails: {
		type: Object,
	},
	email: {
		type: String,
		required: [true, 'Please input your email address'],
		unique: true,
		validate: [isEmail, 'Invalid email address'],
	},
	balance: Number,
	loopayAccNo: {
		type: String,
		required: [true, 'please provide your account number'],
		unique: true,
	},
	accNo: {
		type: String,
		// required: [true, 'please provide your account number'],
		// unique: true,
	},
	bank: {
		type: String,
		// required: [true, 'please provide your bank name'],
	},
	tagName: {
		type: String,
		unique: true,
	},
	firstName: {
		type: String,
		required: [true, 'Please input Your first name'],
	},
	middleName: {
		type: String,
	},
	lastName: {
		type: String,
		required: [true, 'Please input Your last name'],
	},
	phoneNumber: {
		type: String,
		unique: true,
		required: [true, 'please provide your phone number'],
		validate: [isMobilePhone, 'Invalid phone number'],
	},
	status: {type: String, enum: ['active', 'inactive']},
	apiData: {
		type: Schema.Types.Mixed,
	},
});

PoundWallet.pre('save', async function (next) {
	if (!this.currency) this.currency = 'pound';
	if (!this.currencyCode) this.currencyCode = 'GBP';
	if (!this.currencyDetails)
		this.currencyDetails = {
			symbol: '£',
			name: 'British Pound Sterling',
			symbol_native: '£',
			decimal_digits: 2,
			rounding: 0,
			code: 'GBP',
			name_plural: 'British pounds sterling',
		};
	if (!this.balance) this.balance = 0;
	if (!this.tagName) this.tagName = this.userName || this.phoneNumber;
	next();
});

PoundWallet.post('save', async function (doc) {
	if (doc.balance > 0 && doc.status !== 'active') {
		doc.status = 'active';
		await doc.save();
	}
});
module.exports = mongoose.model('wallet-pound', PoundWallet);
