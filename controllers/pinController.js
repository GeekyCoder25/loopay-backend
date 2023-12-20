const bcrypt = require('bcryptjs');
const UserDataModel = require('../models/userData');

const setTransactionPin = async (req, res) => {
	try {
		const {pin} = req.body;
		if (!pin) throw new Error('No pin is provided');
		const {email} = req.user;
		const result = await UserDataModel.findOne({email});
		if (!result) throw new Error('No account is associated with this email');
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(pin, salt);
		result.pin = hash;
		result.invalidPinTried = 0;
		result.lastPinCheck = undefined;
		await result.save();
		result.save();
		res.status(200).json('Transaction pin set successfully');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const checkTransactionPin = async (req, res) => {
	try {
		const {pin} = req.body;
		if (!pin) throw new Error('No pin is provided');
		const {email} = req.user;
		const result = await UserDataModel.findOne({email});
		if (!result) throw new Error('No account is associated with this email');
		if (result.invalidPinTried >= 5) {
			let givenDate = new Date(result.lastPinCheck);
			let timeDifference = new Date().getTime() - givenDate.getTime();

			let hoursDifference = timeDifference / (1000 * 3600);
			if (hoursDifference < 24) {
				return res
					.status(401)
					.json(
						`Transaction banned temporarily, try again in ${result.lastPinCheck}`
					);
			}
		}
		if (!result.pin) throw new Error('Pin not set yet');
		const compare = await bcrypt.compare(req.body.pin, result.pin);
		const attemptRemain =
			5 - (result.invalidPinTried ? result.invalidPinTried + 1 : 1);
		if (!compare) {
			if (result.invalidPinTried >= 4) {
				result.invalidPinTried = 5;
				result.lastPinCheck = new Date();
				await result.save();
				return res
					.status(401)
					.json(
						`Incorrect Pin, transaction banned temporarily, try again in ${result.lastPinCheck}`
					);
			}
			result.invalidPinTried
				? (result.invalidPinTried += 1)
				: (result.invalidPinTried = 1);
			result.lastPinCheck = new Date();
			await result.save();
			throw new Error(
				`Incorrect Pin, ${attemptRemain} attempt${
					attemptRemain === 1 ? '' : 's'
				} left`
			);
		}
		result.invalidPinTried = 0;
		result.lastPinCheck = undefined;
		await result.save();
		res.status(200).json(compare);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	setTransactionPin,
	checkTransactionPin,
};
