const BeneficiaryModel = require('../models/beneficiary');
const UserDataModel = require('../models/userData');
const WalletModel = require('../models/wallet');

const getBeneficiaries = async (req, res) => {
	try {
		const {email} = req.user;

		const result = await BeneficiaryModel.findOne({email}).limit(10);
		if (!result)
			return res.status(200).json({
				message: 'No beneficiary found',
				beneficiaries: [],
			});
		let beneficiaries = result.beneficiaries;
		const beneficiariesAfterPhotoCheck = [];
		await Promise.all(
			beneficiaries.map(async beneficiary => {
				const result = await UserDataModel.findOne({email: beneficiary.email});
				const wallet = await WalletModel.findOne({email: beneficiary.email});
				if (result) {
					beneficiariesAfterPhotoCheck.push({
						...beneficiary,
						accNo: wallet.accNo,
						phoneNumber: wallet.phoneNumber,
						photo: result.photoURL || '',
						tagName: result.tagName,
						fullName: result.userProfile.fullName,
						verificationStatus: result.verificationStatus,
					});
				}
			})
		);
		beneficiaries = beneficiariesAfterPhotoCheck;
		result.beneficiaries = beneficiariesAfterPhotoCheck;
		const pluralS = beneficiaries.length > 1 ? 'ies' : 'y';
		return res.status(200).json({
			message: `${beneficiaries.length} beneficiar${pluralS} found`,
			beneficiaries,
		});
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const postBeneficiary = async (req, res) => {
	try {
		const {email} = req.user;
		let beneficiaries;
		const requiredKeys = ['email'];
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
		const beneficiariesExist = await BeneficiaryModel.findOne({email});
		if (beneficiariesExist) {
			const previousBeneficiaries = beneficiariesExist.beneficiaries;
			const previousBeneficiariesNotTheSameWithNewBeneficiary =
				previousBeneficiaries.filter(
					beneficiary => beneficiary.email !== req.body.email
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
			await BeneficiaryModel.create({
				email,
				beneficiaries: [{email: req.body.email}],
			});
		}
		return res.status(200).json({
			message: 'Beneficiary added successfully',
			beneficiary: req.body,
		});
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const deleteBeneficiary = async (req, res) => {
	try {
		const {email} = req.user;
		const beneficiariesExist = await BeneficiaryModel.findOne({email});
		let beneficiaries;
		let previousBeneficiaries;
		previousBeneficiaries = beneficiariesExist.beneficiaries;
		const result = await UserDataModel.findOne({tagName: req.params.tagName});
		if (beneficiariesExist) {
			if (!result) throw new Error('No beneficiary found with this tag name');
			const filteredBeneficiaries = previousBeneficiaries.filter(
				beneficiary => beneficiary.email !== result.email
			);
			beneficiaries = filteredBeneficiaries;
			await BeneficiaryModel.findOneAndUpdate(
				{email},
				{beneficiaries},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			throw new Error('No beneficiary to delete');
		}
		const deletedBeneficiary = previousBeneficiaries.find(
			beneficiary => beneficiary.email === result.email
		);
		return res.status(200).json(deletedBeneficiary);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	getBeneficiaries,
	postBeneficiary,
	deleteBeneficiary,
};
