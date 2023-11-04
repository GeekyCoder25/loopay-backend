const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AirtimeApiTokenModel = new Schema(
	{
		token: {
			type: String,
			required: [true, 'Please input api bearer bearer token'],
		},
		scope: {
			type: String,
			required: [true, 'Please input api token scope'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('airtime-api-token', AirtimeApiTokenModel);
