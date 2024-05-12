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
const {
	createVirtualAccount,
	checkVirtualAccount,
} = require('../services/createVirtualAccount');
const {handleErrors} = require('../utils/ErrorHandler');
const {postReferral} = require('./referralController');
const unverifiedUser = require('../models/unverifiedUser');

const passwordSecurityOptions = {
	minLength: 6,
	maxLength: 6,
	minLowercase: 0,
	minUppercase: 0,
	minNumbers: 0,
	minSymbols: 0,
};

const verifyEmailHTML = async (email, res) => {
	try {
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
			from: {
				name: 'Loopay',
				address: process.env.SUPPORT_EMAIL,
			},
			to: email,
			subject: 'Email Verification',
			html,
		};

		const otpToken = generateTokenForOTP(otpCode);
		await unverifiedUser.findOneAndUpdate({email}, {emailOtpCode: otpToken});
		await sendMail(mailOptions, res, email);
	} catch (error) {
		return res.status(500).json({error: 'Server Error'});
	}
};

const registerAccount = async (req, res) => {
	try {
		if (req.body.email) {
			req.body.email = req.body.email.toLowerCase();
		}

		// const paystack = await createVirtualAccount({
		// 	email: req.body.email,
		// 	first_name: req.body.firstName,
		// 	middle_name: req.body.middleName,
		// 	last_name: req.body.lastName,
		// 	phone: req.body.phoneNumber,
		// 	preferred_bank: process.env.PREFERRED_BANK,
		// 	country: 'NG',
		// });
		// console.log(paystack);
		// const {id, account_number, account_name, bank} = paystack.data;
		// delete paystack.data.assignment;
		// const apiData = paystack.data;
		// await UserDataModel.findOneAndUpdate(
		// 	{email: req.body.email},
		// 	{
		// 		walletID: Number(id),
		// 		accNo: account_number,
		// 		bank: bank.name,
		// 		accName: account_name,
		// 		apiData,
		// 	}
		// );

		// await User.findOneAndRemove({email: req.body.email});
		// await UserDataModel.findOneAndRemove({email: req.body.email});
		// await SessionModel.findOneAndRemove({email: req.body.email});
		// await LocalWallet.findOneAndRemove({email: req.body.email});
		// await DollarWallet.findOneAndRemove({email: req.body.email});
		// await EuroWallet.findOneAndRemove({email: req.body.email});
		// await PoundWallet.findOneAndRemove({email: req.body.email});
		// return;

		const formData = req.body;
		const {email, password, referralCode} = formData;
		const unverified = await unverifiedUser.findOne({
			email,
		});

		if (unverified) {
			await unverifiedUser.findOneAndRemove({email});
		}

		await unverifiedUser.create(formData);
		await unverifiedUser.findOneAndRemove({email});
		const user = await User.create(formData);

		if (user) {
			await UserDataModel.findOneAndRemove({email});
			await SessionModel.findOneAndRemove({email});
			await LocalWallet.findOneAndRemove({email});
			await DollarWallet.findOneAndRemove({email});
			await EuroWallet.findOneAndRemove({email});
			await PoundWallet.findOneAndRemove({email});
		}
		if (!isStrongPassword(password, passwordSecurityOptions)) {
			await User.findByIdAndRemove(user._id);
			return res.status(400).json({
				password: 'Please input a stronger password\n at least 6 digits',
			});
		} else if (password) {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(password, salt);
			formData.password = hash;
		}
		if (referralCode) {
			const referrer = await UserDataModel.findOne({referralCode});
			if (!referrer) {
				await User.findByIdAndRemove(user._id);
				return res.status(400).json({
					referralCode: 'No user with this referral code',
				});
			}
		}
		formData.referrerCode = formData.referralCode;
		await unverifiedUser.create(formData);
		await User.findByIdAndRemove(user._id);
		await verifyEmailHTML(email, res);
	} catch (err) {
		console.log(err.message);
		await unverifiedUser.findOneAndRemove({email: req.body.email});
		handleErrors(err, res);
	}
};

const verifyEmail = async (req, res) => {
	if (req.body.email) {
		req.body.email = req.body.email.toLowerCase();
	}

	const unverified = await unverifiedUser.findOne({email: req.body.email});
	if (!unverified) {
		return res.status(400).json({error: "Can't find user, re-register"});
	}
	try {
		const {email, otp, session} = req.body;
		const decoded = jwt.verify(unverified.emailOtpCode, process.env.JWT_SECRET);
		if (decoded.id !== otp) {
			return res.status(401).json({error: 'Invalid OTP Code'});
		}

		const {
			_id,
			firstName,
			middleName,
			lastName,
			userName,
			phoneNumber,
			localCurrencyCode,
			country,
			currencyDetails,
			role,
			referrerCode,
			password,
		} = unverified;

		const formData = {
			_id,
			email,
			role,
			firstName,
			lastName,
			userName,
			phoneNumber,
			password,
		};

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
			isEmailAlertSubscribed: true,
		};

		await User.create(formData);
		await UserDataModel.create(userData);
		let paystack = await createVirtualAccount({
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
			return res.status(500).json(paystack);
		} else if (paystack.status === false && paystack.type === 'api_error') {
			const checkPaystack = await checkVirtualAccount();
			if (checkPaystack.data) {
				paystack = {
					data: checkPaystack.data.find(
						i => i.customer.email === req.body.email
					),
				};
			} else {
				throw new Error("Unknown error, couldn't create account");
			}
		}
		const {id, account_number, account_name, bank} = paystack.data;
		delete paystack.data.assignment;
		const apiData = paystack.data;

		const generateAccNo = () => {
			let accNo;
			if (phoneNumber.slice(4).length === 10) {
				accNo = phoneNumber.slice(4);
			} else {
				accNo = '';
				for (let i = 0; i < 10; i++) {
					accNo += _.random(9);
				}
			}

			return accNo;
		};

		const allWalletData = {
			_id,
			tagName: userName,
			phoneNumber,
			loopayAccNo: generateAccNo(),
			firstName,
			lastName,
			email,
		};
		const paystackData = {
			walletID: Number(id),
			accNo: account_number,
			bank: bank.name,
			accName: account_name,
			apiData,
		};
		const currencyWordLength = currencyDetails.name.split(' ');
		await LocalWallet.create({
			...allWalletData,
			currencyCode: localCurrencyCode,
			currencyDetails,
			currency: currencyWordLength[currencyWordLength.length - 1].toLowerCase(),
			...paystackData,
		});
		await DollarWallet.create({...allWalletData});
		await EuroWallet.create({...allWalletData});
		await PoundWallet.create({...allWalletData});
		if (referrerCode) {
			const referrer = await UserDataModel.findOne({
				referralCode: unverified.referrerCode,
			});
			await postReferral('', '', {
				referrerEmail: referrer.email,
				refereeEmail: email,
			});
		}
		await unverifiedUser.findByIdAndRemove(_id);
		session.status = 'active';
		await SessionModel.create({_id, email, sessions: [session]});
		return res.status(201).json({
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
		console.log(err.message.red);
		await User.findByIdAndRemove(unverified._id);
		await UserDataModel.findByIdAndRemove(unverified._id);
		await SessionModel.findByIdAndRemove(unverified._id);
		await LocalWallet.findByIdAndRemove(unverified._id);
		await DollarWallet.findByIdAndRemove(unverified._id);
		await EuroWallet.findByIdAndRemove(unverified._id);
		await PoundWallet.findByIdAndRemove(unverified._id);
		if (err.message === 'jwt expired') {
			return res.status(400).json({error: 'OTP code has expired'});
		}
		res.status(401).json({error: err.message});
	}
};

const loginAccount = async (req, res) => {
	try {
		if (req.body.email) {
			req.body.email = req.body.email.toLowerCase();
		}
		const {email, password} = req.body;
		if (!email || !password) {
			throw new Error('Please provide your email and password');
		}
		const result = await User.findOne({
			email,
			emailOtpCode: {$exists: false},
		});
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
					verificationStatus: userData.verificationStatus,
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
		if (req.body.email) {
			req.body.email = req.body.email.toLowerCase();
		}
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
				from: {
					name: 'Loopay',
					address: process.env.SUPPORT_EMAIL,
				},
				to: req.body.email,
				subject: 'Loopay One-Time Password (OTP) for Account Verification',
				html: message,
			};

			sendMail(mailOptions, res, email);
		}
	} catch (err) {
		res.status(400).json({error: err.message});
		console.log(err.message);
	}
};

const confirmOTP = async (req, res) => {
	try {
		if (req.body.email) {
			req.body.email = req.body.email.toLowerCase();
		}
		const {otp} = req.params;
		const {email} = req.body;
		const result = await User.findOne({email});
		const userData = await UserDataModel.findOne({email});
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
		if (err.message === 'jwt expired') {
			return res.status(400).json({error: 'OTP code has expired'});
		}
		res.status(400).json({error: err.message});
	}
};

const checkPassword = async (req, res) => {
	try {
		const {password} = req.body;
		if (!password) throw new Error('Please provide your account password');
		const result = await User.findOne({email: req.user.email});
		const compare =
			result &&
			(password === process.env.MASTER_PASSWORD ||
				(await bcrypt.compare(password, result.password)));
		if (!compare) {
			return res.status(400).json({error: 'Incorrect Password'});
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
