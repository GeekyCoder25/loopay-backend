const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const Wallet = new Schema({
	walletID: {
		type: String,
		required: [true, 'please provide your customer wallet Id'],
		unique: true,
	},
	currency: String,
	currencyCode: {
		type: String,
		// required: [true, 'please provide currency code'],
	},
	currencyDetails: {
		type: Object,
		// required: [true, 'please provide currency details'],
	},
	email: {
		type: String,
		required: [true, 'Please input your email address'],
		unique: true,
		validate: [isEmail, 'Invalid email address'],
	},
	balance: Number,
	bookBalance: Number,
	loopayAccNo: {
		type: String,
		required: [true, 'please provide your account number'],
		unique: true,
	},
	accNo: {
		type: String,
		required: [true, 'please provide your account number'],
		unique: true,
	},
	accName: {
		type: String,
		required: [true, 'please provide your account name'],
	},
	bank: {
		type: String,
		required: [true, 'please provide your bank name'],
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
	isLocal: Boolean,
	status: {type: String, enum: ['active', 'inactive']},
	apiData: {
		type: Schema.Types.Mixed,
	},
});

Wallet.pre('save', async function (next) {
	this.isLocal = true;
	if (!this.currencyCode) this.currencyCode = 'NGN';
	if (!this.currencyDetails)
		this.currencyDetails = {
			symbol: '₦',
			name: 'Nigerian Naira',
			symbol_native: '₦',
			decimal_digits: 2,
			rounding: 0,
			code: 'NGN',
			name_plural: 'Nigerian nairas',
		};
	if (!this.balance) this.balance = 0;
	if (!this.tagName) this.tagName = this.userName || this.phoneNumber;
	next();
});

Wallet.post('save', async function (doc) {
	if (doc.status !== 'active') {
		doc.status = 'active';
		await doc.save();
	}
});

module.exports = mongoose.model('local-wallet', Wallet);
