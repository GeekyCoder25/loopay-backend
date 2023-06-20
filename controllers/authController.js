const User = require('../models/user');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {isStrongPassword} = require('validator');
const {protect} = require('../middleware/authMiddleware');

const handleErrors = err => {
	let errors = {};
	Object.values(err.errors).forEach(({properties}) => {
		errors[properties.path] = properties.message;
	});
	return errors;
};

const handlephoneNumber = req => {
	if (req.body.phoneNumber.startsWith('0')) {
		const tempNumber = req.body.phoneNumber.replace('0', '+234');
		req.body.phoneNumber = tempNumber;
	} else if (
		req.body.phoneNumber.startsWith('7') ||
		req.body.phoneNumber.startsWith('8') ||
		req.body.phoneNumber.startsWith('9')
	) {
		const tempNumber = req.body.phoneNumber.replace(
			req.body.phoneNumber.charAt(0),
			`+234${req.body.phoneNumber.charAt(0)}`
		);
		req.body.phoneNumber = tempNumber;
	}
};

// console.log(app);
// protect();
const registerAccount = async (req, res) => {
	// handlephoneNumber(req);
	const {password} = req.body;
	const passowrdSecurityOptions = {
		minLength: 6,
		minLowercase: 1,
		minUppercase: 0,
		minNumbers: 1,
		minSymbols: 0,
	};
	if (!isStrongPassword(password, passowrdSecurityOptions)) {
		return res.status(400).json({
			password: 'Please input a stronger password',
		});
	} else if (password) {
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(password, salt);
		req.body.password = hash;
	}
	try {
		const result = await User.create(req.body);
		const {email, fullName, userName, phoneNumber} = result;
		res.status(200).json({
			success: 'Account Created Successfully',
			data: {
				email,
				fullName,
				userName,
				phoneNumber,
				token: generateToken(result._id),
			},
		});
	} catch (err) {
		console.log(err);
		if (err.code === 11000) {
			res.status(400).json({
				[Object.keys(err.keyPattern)[0]]:
					Object.keys(err.keyPattern)[0] === 'email'
						? 'Email has already been used with another account'
						: 'Phone number has already been used with another account',
			});
		} else if (err.message.includes('user validation failed')) {
			const errors = handleErrors(err);
			res
				.status(400)
				.json({[Object.keys(errors)[0]]: Object.values(errors)[0]});
		}
	}
};

const loginAccount = async (req, res) => {
	const result = await User.findOne({email: req.body.email});
	const compare = await bcrypt.compare(req.body.password, result.password);
	try {
		if (result === null) throw '';
		else if (!compare) res.status(400).json({password: 'Incorect Password'});
		else {
			res.status(200).json({
				data: {
					email: result.email,
					phoneNumber: result.phoneNumber,
					fullName: result.fullName,
					token: generateToken(result._id),
				},
			});
		}
	} catch (err) {
		res.status(400).json({email: 'No account is associated with this email'});
		console.log(err);
	}
};
const forgetPassword = (req, res) => {
	let otpCode = '';
	for (let i = 0; i < 4; i++) {
		otpCode += _.random(9);
	}
	console.log(otpCode);
	User.findOne({email: req.body.email})
		.then(result => {
			if (result === null) throw '';
			else {
				res.status(200).json({
					data: {
						email: result.email,
						otpCode,
					},
				});
			}
		})
		.catch(err => {
			res.status(400).json({email: 'No account is associated with this email'});
			console.log(err);
		});
};

const generateToken = id => {
	// eslint-disable-next-line no-undef
	return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
};
module.exports = {
	registerAccount,
	loginAccount,
	forgetPassword,
};
