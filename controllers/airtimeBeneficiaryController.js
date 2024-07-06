const airtimeBeneficiary = require('../models/airtimeBeneficiary');

const getAirtimeBeneficiaries = async (req, res) => {
	try {
		const beneficiaries = await airtimeBeneficiary
			.find({
				email: req.user.email,
			})
			.sort('-updatedAt');
		res.status(200).json(beneficiaries);
	} catch (err) {
		console.log(err.message);
		res.status(400).json("Couldn't fetch beneficiaries");
	}
};
const deleteAirtimeBeneficiary = async (req, res) => {
	try {
		const {phoneNo, network} = req.body;
		const beneficiary = await airtimeBeneficiary.findOneAndDelete({
			email: req.user.email,
			phoneNo,
			network,
		});
		res.status(200).json(beneficiary);
	} catch (err) {
		console.log(err.message);
		res.status(400).json("Couldn't fetch beneficiaries");
	}
};

module.exports = {
	getAirtimeBeneficiaries,
	deleteAirtimeBeneficiary,
};
