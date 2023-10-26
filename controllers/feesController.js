const FeesModal = require('../models/fees');

const getFees = async (req, res) => {
	const fees = await FeesModal.find({});
	if (!fees.length) {
		await FeesModal.create([
			{feeName: 'swap', amount: 0},
			{feeName: 'loopay', amount: 0},
			{feeName: 'others', amount: 0},
		]);
	}
	res.status(200).json(fees);
};
const updateFees = async (req, res) => {
	req.body.forEach(async index => {
		const {feeName, amount} = index;
		await FeesModal.updateOne({feeName}, {amount});
	});
	res.status(200).json({
		status: 'success',
		message: `${req.body.length} fee${
			req.body.length ? 's' : ''
		} updated successfully`,
	});
};

module.exports = {
	getFees,
	updateFees,
};
