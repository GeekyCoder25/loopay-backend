const BeneficiaryModel = require('../models/beneficiary');
const UserDataModel = require('../models/userData');

const getBeneficiaries = async (req, res) => {
	const {email} = req.user;

	const result = await BeneficiaryModel.findOne({email});
	if (!result) return res.status(400).json('No saved beneficaries');
	let beneficiaries = result.beneficiaries;
	let beneficiariesAfterPhotoCheck = [];
	await Promise.all(
		beneficiaries.map(async beneficiary => {
			const result = await UserDataModel.find({email: beneficiary.email});
			if (result[0].photoURL) {
				beneficiariesAfterPhotoCheck.push({
					...beneficiary,
					photo: result[0].photoURL,
				});
			} else {
				beneficiariesAfterPhotoCheck.push(beneficiary);
			}
		})
	);
	beneficiaries = beneficiariesAfterPhotoCheck;
	const pluralS = beneficiaries.length > 1 ? 'ies' : 'y';
	return res.status(200).json({
		message: `${beneficiaries.length} beneficiar${pluralS} found`,
		beneficiaries,
	});
};

const postBeneficiary = async (req, res) => {
	try {
		const {email} = req.user;
		const checkBeneficiaryExists = await BeneficiaryModel.findOne({email});
		let beneficiaries;
		const requiredKeys = [
			'fullName',
			'phoneNumber',
			'photo',
			'tagName',
			'email',
		];
		let unavailableKeys = [];
		requiredKeys.forEach(key => {
			if (!Object.keys(req.body).includes(key)) {
				unavailableKeys.push(key);
			}
		});
		if (unavailableKeys.length > 0) {
			return res
				.status(400)
				.json(`Please provide all required keys '${[unavailableKeys]}'`);
		}
		if (checkBeneficiaryExists) {
			const previousBeneficiaries = checkBeneficiaryExists.beneficiaries;
			const previousBeneficiariesNotTheSameWithNewBeneficiary =
				previousBeneficiaries.filter(
					beneficiary => beneficiary.tagName !== req.body.tagName
				);
			beneficiaries = [
				req.body,
				...previousBeneficiariesNotTheSameWithNewBeneficiary,
			];
			await BeneficiaryModel.findOneAndUpdate(
				{email},
				{beneficiaries},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			await BeneficiaryModel.create({email, beneficiaries: [req.body]});
		}
		return res.status(200).json({
			message: 'Beneficary added successfully',
			beneficiary: req.body,
		});
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

module.exports = {
	getBeneficiaries,
	postBeneficiary,
};
