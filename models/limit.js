const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LimitModel = new Schema(
	{
		level1: {
			type: Number,
			// required: [true, 'Please provide level 1 limit amount'],
		},
		level2: {
			type: Number,
			// required: [true, 'Please provide level 2 limit amount'],
		},
		level3: {
			type: Number,
			// required: [true, 'Please provide level 3 limit amount'],
		},
		level4: {
			type: Number,
			// required: [true, 'Please provide level 4 limit amount'],
		},
	},
	{timestamps: true}
);

LimitModel.pre('save', function (next) {
	if (!this.level1) this.level1 = 50000;
	if (!this.level2) this.level2 = 300000;
	if (!this.level3) this.level3 = 500000;
	if (!this.level4) this.level4 = 1000000;
	next();
});

module.exports = mongoose.model('limit', LimitModel);
