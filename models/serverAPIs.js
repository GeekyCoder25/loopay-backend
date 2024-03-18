const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ServerAPISchema = new Schema(
	{
		bill: {
			type: String,
			required: [true, 'Please provide bill api for the server to use'],
			enum: ['reloadly', 'paga', 'buyPower'],
		},
		airtime: {
			type: String,
			required: [true, 'Please provide airtime api for the server to use'],
			enum: ['reloadly', 'paga'],
		},
		data: {
			type: String,
			required: [true, 'Please provide data api for the server to use'],
			enum: ['reloadly', 'paga'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('server-API', ServerAPISchema);
