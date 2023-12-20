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
	apiData: {
		type: Schema.Types.Mixed,
	},
});

Wallet.pre('save', async function (next) {
	if (!this.currency) this.currency = 'naira';
	this.isLocal = true;
	if (!this.balance) this.balance = 0;
	if (!this.tagName) this.tagName = this.userName || this.phoneNumber;
	next();
});

module.exports = mongoose.model('local-wallet', Wallet);
