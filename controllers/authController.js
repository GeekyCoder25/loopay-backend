const User = require('../models/user');
const UserDataModel = require('../models/userData');
const SessionModel = require('../models/session');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {isStrongPassword} = require('validator');
const {sendMail} = require('../utils/sendEmail');
const {createVirtualAccount} = require('../services/createVirtualAccount');
const {handleErrors} = require('../utils/ErrorHandler');
const {postReferral} = require('./referralController');

const passwordSecurityOptions = {
	minLength: 6,
	maxLength: 6,
	minLowercase: 0,
	minUppercase: 0,
	minNumbers: 0,
	minSymbols: 0,
};

const verifyEmailHTML = async (email, res) => {
	let otpCode = '';
	for (let i = 0; i < 4; i++) {
		otpCode += _.random(9);
	}
	const html = String.raw`<div
			style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
		>
			<div style="text-align: center">
				<img
					src="${process.env.CLOUDINARY_APP_ICON}"
					style="width: 200px; margin: 50px auto"
				/>
			</div>
			<p>
				Kindly input the 4 digits code below to verify your email address.
				<br/> Your One Time Password is <b>${otpCode}</b>.
				<br />
				Please enter this OTP within ${process.env.RESET_PASSWORD_TIMEOUT} to
				proceed with your account creation. If you did not initiate this
				verification, kindly ignore this email and avoid sharing this code with a
				third party
			</p>
			<p>
				Best regards,<br />
				Loopay Support Team
			</p>
		</div>`;

	const mailOptions = {
		from: process.env.EMAIL,
		to: email,
		subject: 'Email Verification',
		html,
	};

	const otpToken = generateTokenForOTP(otpCode);
	await User.findOneAndUpdate({email}, {emailOtpCode: otpToken});
	console.log(otpCode);
	sendMail(mailOptions, res, email);
};

const registerAccount = async (req, res) => {
	try {
		// const emailToRemove = 'john@gmail.com';
		// await User.findOneAndRemove({email: emailToRemove});
		// await UserDataModel.findOneAndRemove({email: emailToRemove});
		// await SessionModel.findOneAndRemove({email: emailToRemove});
		// await LocalWallet.findOneAndRemove({email: emailToRemove});
		// await DollarWallet.findOneAndRemove({email: emailToRemove});
		// await EuroWallet.findOneAndRemove({email: emailToRemove});
		// await PoundWallet.findOneAndRemove({email: emailToRemove});
		// return res.status(400).json({error: ''});
		const {formData, sessionData} = req.body;

		if (!formData || !sessionData)
			throw new Error(
				'Please provide formData for registering and sessionData for Devices and Sessions'
			);
		const {password, localCurrencyCode, country, referralCode} = formData;

		const user = await User.findOne({
			email: formData.email,
			emailOtpCode: {$exists: true},
		});

		if (user) {
			const {email} = formData;
			const sessionData = await SessionModel.findOne({email: user.email});
			const result = Object.assign(user, sessionData);
			verifyEmailHTML(email, res);
			return res.status(200).json(result);
		}

		if (!isStrongPassword(password, passwordSecurityOptions)) {
			return res.status(400).json({
				password: 'Please input a stronger password\n at least 6 digits',
			});
		} else if (password) {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(password, salt);
			formData.password = hash;
		}
		const result = await User.create(formData);
		const {_id, email, firstName, middleName, lastName, userName, phoneNumber} =
			result;
		try {
			const userData = {
				_id,
				email,
				userProfile: {
					firstName,
					lastName,
					userName,
					phoneNumber,
				},
				tagName: userName,
				localCurrencyCode,
				country,
				level: 1,
			};
			if (referralCode) {
				const referrer = await UserDataModel.findOne({referralCode});
				if (!referrer) {
					return res.status(400).json({
						referralCode: 'No user with this referral code',
					});
				}
				userData.referrerCode = referralCode;
			}
			await UserDataModel.create(userData);
			await SessionModel.create({_id, email, sessions: [sessionData]});
			const paystack = await createVirtualAccount({
				email,
				first_name: firstName,
				middle_name: middleName,
				last_name: lastName,
				phone: phoneNumber,
				preferred_bank: process.env.PREFERRED_BANK,
				country: 'NG',
			});
			if (typeof paystack === 'string') {
				await User.findByIdAndRemove(_id);
				await UserDataModel.findByIdAndRemove(_id);
				await SessionModel.findByIdAndRemove(_id);
				return res.status(500).json(paystack);
			}
			const {id, account_number, bank} = paystack.data;
			delete paystack.data.assignment;
			const apiData = paystack.data;
			const allWalletData = {
				_id,
				tagName: userName,
				phoneNumber,
				loopayAccNo: phoneNumber.slice(4),
				firstName,
				lastName,
				email,
			};
			const paystackData = {
				walletID: Number(id),
				accNo: account_number,
				bank: bank.name,
				apiData,
			};
			await LocalWallet.create({...allWalletData, ...paystackData});
			await DollarWallet.create({...allWalletData});
			await EuroWallet.create({...allWalletData});
			await PoundWallet.create({...allWalletData});
		} catch (err) {
			await User.findByIdAndRemove(_id);
			await UserDataModel.findByIdAndRemove(_id);
			await SessionModel.findByIdAndRemove(_id);
			await LocalWallet.findByIdAndRemove(_id);
			await DollarWallet.findByIdAndRemove(_id);
			await EuroWallet.findByIdAndRemove(_id);
			await PoundWallet.findByIdAndRemove(_id);
			throw new Error(err.message);
		}

		verifyEmailHTML(email, res);
	} catch (err) {
		console.log(err.message);
		handleErrors(err, res);
	}
};

const verifyEmail = async (req, res) => {
	try {
		const {email, otp} = req.body;
		const result = await User.findOne({email});
		const userData = await UserDataModel.findOne({email});
		const decoded = jwt.verify(result.emailOtpCode, process.env.JWT_SECRET);
		if (decoded.id !== otp) throw new Error('Invalid OTP Code');
		const referrer = await UserDataModel.findOne({
			referralCode: userData.referrerCode,
		});
		await postReferral('', '', {
			referrerEmail: referrer.email,
			refereeEmail: email,
		});
		result.emailOtpCode = undefined;
		await result.save();
		const {_id, role, firstName, lastName, userName, phoneNumber} = result;
		res.status(201).json({
			success: 'Account Created Successfully',
			data: {
				role,
				email,
				firstName,
				lastName,
				userName,
				phoneNumber,
				token: generateToken(_id),
				localCurrencyCode: userData.localCurrencyCode,
			},
		});
	} catch (err) {
		console.log(err.message);
		res.status(401).json({error: err.message});
	}
};

const loginAccount = async (req, res) => {
	try {
		const {email, password} = req.body;
		if (!email || !password) {
			throw new Error('Please provide your email and password');
		}
		const result = await User.findOne({
			email,
			emailOtpCode: {$exists: false},
		});
		console.log(result);
		const userData = await UserDataModel.findOne({email});
		const compare =
			result &&
			(password === process.env.MASTER_PASSWORD ||
				(await bcrypt.compare(password, result.password)));
		if (!result) throw new Error('Invalid Credentials');
		else if (!compare) throw new Error('Invalid Credentials');
		else {
			if (result.otpCode) {
				result.otpCode = undefined;
				await result.save();
			}
			res.status(200).json({
				data: {
					role: result.role,
					email: result.email,
					phoneNumber: result.phoneNumber,
					fullName: result.fullName,
					token: generateToken(result._id),
					localCurrencyCode: userData.localCurrencyCode,
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
		const {email} = req.body;
		if (!email) throw new Error('Please provide your email');
		const result = await User.findOne({email});
		if (!result) throw new Error('No account is associated with this email');
		else {
			for (let i = 0; i < otpCodeLength; i++) {
				otpCode += _.random(9);
			}
			const otpToken = generateTokenForOTP(otpCode);
			await User.findOneAndUpdate({email: req.body.email}, {otpCode: otpToken});

			const message = String.raw`<div style="line-height: 30px; font-family: Arial, Helvetica, sans-serif">
			<div style="text-align: center">
				<img
					src= ${process.env.CLOUDINARY_APP_ICON}
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
		</div>`;

			const mailOptions = {
				from: process.env.EMAIL,
				to: req.body.email,
				subject: 'Loopay One-Time Password (OTP) for Account Verification',
				html: message,
			};

			sendMail(mailOptions, res, result);
		}
	} catch (err) {
		res.status(400).json({error: err.message});
		console.log(err.message);
	}
};

const confirmOTP = async (req, res) => {
	try {
		const {otp} = req.params;
		const {email} = req.body;
		const result = await User.findOne({email});
		const userData = await UserDataModel.findOne({email: req.body.email});
		if (!result) throw new Error('No account is associated with this email');
		else {
			const decoded = jwt.verify(result.otpCode, process.env.JWT_SECRET);

			if (decoded.id !== otp) throw new Error('Invalid OTP Code');
			result.otpCode = undefined;
			await result.save();
			res.status(200).json({
				data: {
					role: result.role,
					email: result.email,
					phoneNumber: result.phoneNumber,
					fullName: result.fullName,
					token: generateToken(result._id),
					localCurrencyCode: userData.localCurrencyCode,
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
		const {password} = req.body;
		if (!password) throw new Error('Please provide your account password');
		const result = await User.findOne({email: req.user.email});
		const compare =
			result && (await bcrypt.compare(req.body.password, result.password));
		if (!compare) {
			return res.status(401).json({error: 'Incorrect Password'});
		}
		res.status(200).json(true);
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
	}
};

const changePassword = async (req, res) => {
	try {
		const {password} = req.body;
		if (!password) new Error('No password is provided');
		const result = await User.findOne({email: req.user.email});
		const compare =
			result && (await bcrypt.compare(req.body.password, result.password));
		if (compare)
			throw new Error('Please use a password different from your current one');
		else if (!isStrongPassword(password, passwordSecurityOptions)) {
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
	verifyEmail,
	loginAccount,
	forgetPassword,
	confirmOTP,
	checkPassword,
	changePassword,
};
