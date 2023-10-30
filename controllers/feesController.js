const FeesModal = require('../models/fees');

const getFees = async (req, res) => {
	const fees = await FeesModal.find({});
	if (!fees.length) {
		await FeesModal.create([
			{
				amount: 0,
				currency: 'naira',
				feeName: 'transfer_others_in_NGN',
				group: 'transferOthers',
			},
			{
				amount: 0,
				currency: 'dollar',
				feeName: 'transfer_others_in_USD',
				group: 'transferOthers',
			},
			{
				amount: 0,
				currency: 'euro',
				feeName: 'transfer_others_in_EUR',
				group: 'transferOthers',
			},
			{
				amount: 0,
				currency: 'pound',
				feeName: 'transfer_others_in_GBP',
				group: 'transferOthers',
			},
		]);
	}
	res.status(200).json(fees);
};
const updateFees = async (req, res) => {
	req.body.forEach(async index => {
		const {feeName, amount} = index;
		await FeesModal.updateOne({feeName}, {amount}, {upsert: true});
	});
	res.status(200).json({
		status: 'success',
		message: `${req.body.length} fee${
			req.body.length > 1 ? 's' : ''
		} updated successfully`,
	});
};

module.exports = {
	getFees,
	updateFees,
};
