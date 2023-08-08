const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Webhook = new Schema({
	type: Schema.Types.Mixed,
});

module.exports = mongoose.model('webhook', Webhook);
