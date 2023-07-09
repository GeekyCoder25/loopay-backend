const User = require('../models/user');
const UserDataModel = require('../models/userData');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {isStrongPassword} = require('validator');
const {sendMail} = require('../utils/sendEmail');

const handleErrors = err => {
	let errors = {};
	Object.values(err.errors).forEach(({properties}) => {
		errors[properties.path] = properties.message;
	});
	return errors;
};

const passowrdSecurityOptions = {
	minLength: 6,
	minLowercase: 1,
	minUppercase: 0,
	minNumbers: 1,
	minSymbols: 0,
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

const registerAccount = async (req, res) => {
	// handlephoneNumber(req);
	const {password} = req.body;
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
		const {email, firstName, lastName, userName, phoneNumber} = result;
		const data = {
			email,
			userProfile: {
				firstName,
				lastName,
				userName,
				phoneNumber,
			},
		};
		await UserDataModel.create(data);

		res.status(200).json({
			success: 'Account Created Successfully',
			data: {
				email,
				firstName,
				lastName,
				userName,
				phoneNumber,
				token: generateToken(result._id),
			},
		});
	} catch (err) {
		console.log(err.message);
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
	try {
		if (
			!Object.keys(req.body).includes('email') ||
			!Object.keys(req.body).includes('password')
		) {
			throw new Error('Please provide your email and password');
		}
		const result = await User.findOne({email: req.body.email});
		const compare =
			result && (await bcrypt.compare(req.body.password, result.password));
		if (!result) throw new Error('Invalid Credentials');
		else if (!compare) res.status(401).json({password: 'Incorect Password'});
		else {
			if (result.otpCode) {
				result.otpCode = undefined;
				await result.save();
			}
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
		console.log(err.message);
		res.status(401).json({error: err.message});
	}
};

const forgetPassword = async (req, res) => {
	try {
		const otpCodeLength = req.body.otpCodeLength || 4;
		let otpCode = '';
		const result = await User.findOne({email: req.body.email});
		if (!result) throw new Error('No account is associated with this email');
		else {
			for (let i = 0; i < otpCodeLength; i++) {
				otpCode += _.random(9);
			}
			const otpToken = generateTokenForOTP(otpCode);
			await User.findOneAndUpdate({email: req.body.email}, {otpCode: otpToken});
			const mailOtptions = {
				from: process.env.EMAIL,
				to: req.body.email,
				subject: 'Loopay One-Time Password (OTP) for Account Verification',
				html: String.raw`<div style="line-height: 30px; font-family: Arial, Helvetica, sans-serif">
			<div style="text-align: center; transform: translateX(-100px)">
				<img
					src="https://res.cloudinary.com/geekycoder/image/upload/v1688782340/loopay/appIcon.svg"
					style="width: 200px; margin: 50px auto"
				/>
			</div>
			<p>
				Your One Time Password is <b>${otpCode}.</b> Please enter this OTP on
				the verification page within ${process.env.RESET_PASSWORD_TIMEOUT} to
				proceed. If you did not initiate this forget password OTP code or need
				any assistance, please contact our support team immediately at
				${process.env.SUPPORT_EMAIL}
			</p>
			<p>
				Best regards,<br />
				Loopay Support Team
			</p>
		</div>`,
			};
			sendMail(mailOtptions, res, result);
		}
	} catch (err) {
		res.status(400).json({email: err.message});
		console.log(err.message);
	}
};

const forgetPasswordOTP = async (req, res) => {
	const {otp} = req.params;

	try {
		const result = await User.findOne({email: req.body.email});
		if (!result) throw new Error('No account is associated with this email');
		else {
			const decoded = jwt.verify(result.otpCode, process.env.JWT_SECRET);

			if (decoded.id !== otp) throw new Error('Invalid OTP Code');
			result.otpCode = undefined;
			await result.save();
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
		console.log(err.message);
		res.status(400).json({error: 'Invalid OTP Code'});
	}
};

const checkPassword = async (req, res) => {
	try {
		const result = await User.findOne({email: req.user.email});
		const compare =
			result && (await bcrypt.compare(req.body.password, result.password));
		if (!compare) {
			return res.status(401).json({error: 'Incorect Password'});
		}
		res.status(200).json(true);
	} catch (err) {
		console.log(err.message);
	}
};

const changePassword = async (req, res) => {
	try {
		if (!Object.keys(req.body).includes('password'))
			throw new Error('No password is provided');
		const result = await User.findOne({email: req.params.email});

		if (!result) throw new Error('No account is associated with this email');
		const {password} = req.body;
		const compare =
			result && (await bcrypt.compare(req.body.password, result.password));
		if (compare)
			throw new Error('Please use a password different from your current one');
		else if (!isStrongPassword(password, passowrdSecurityOptions)) {
			throw new Error('Please input a stronger password');
		} else if (password) {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(password, salt);
			req.body.password = hash;
		}
		result.password = req.body.password;
		result.save();
		res.status(200).json({password: 'Password changed successfully'});
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const setTransactionPin = async (req, res) => {
	try {
		if (!Object.keys(req.body).includes('pin'))
			throw new Error('No pin is provided');
		const {email} = req.user;
		const result = await UserDataModel.findOne({email});
		if (!result) throw new Error('No account is associated with this email');
		const {pin} = req.body;
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(pin, salt);
		result.pin = hash;
		result.save();
		res.status(200).json('Transaction pin set successfully');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const checkTransactionPin = async (req, res) => {
	try {
		if (!Object.keys(req.body).includes('pin'))
			throw new Error('No pin is provided');
		const {email} = req.user;
		const result = await UserDataModel.findOne({email});
		if (!result) throw new Error('No account is associated with this email');
		if (!result.pin) throw new Error('Pin not set yet');
		const compare = await bcrypt.compare(req.body.pin, result.pin);
		if (!compare) throw new Error('Invalid Pin');
		res.status(200).json(compare);
	} catch (err) {
		res.status(400).json(err.message);
	}
};
const generateToken = id => {
	return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
};
const generateTokenForOTP = id => {
	return jwt.sign({id}, process.env.JWT_SECRET, {
		expiresIn: process.env.RESET_PASSWORD_TIMEOUT,
	});
};

module.exports = {
	registerAccount,
	loginAccount,
	forgetPassword,
	forgetPasswordOTP,
	checkPassword,
	changePassword,
	setTransactionPin,
	checkTransactionPin,
};
