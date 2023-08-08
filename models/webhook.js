const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Webhook = new Schema(
	{
		event: {
			type: String,
			required: true,
		},
		data: {type: Schema.Types.Mixed, required: true},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('webhook', Webhook);
