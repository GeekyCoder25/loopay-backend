const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const User = require('../models/user');
const {sendMail} = require('../utils/sendEmail');
// const UserDataModel = require('../models/userData');
// const SessionModel = require('../models/session');
// const LocalWallet = require('../models/wallet');
// const DollarWallet = require('../models/walletDollar');
// const EuroWallet = require('../models/walletEuro');
// const PoundWallet = require('../models/walletPound');

const removeUnverifiedUsers = async (req, res, next) => {
	try {
		const {email, password} = req.body;
		const fiveMinutesAgo = new Date();
		fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
		const user = await User.findOne({
			email,
			emailOtpCode: {$exists: true},
		});

		if (user) {
			const compare =
				user &&
				(password === process.env.MASTER_PASSWORD ||
					(await bcrypt.compare(password, user.password)));
			if (compare) {
				verifyEmailHTML(email);
				return res.status(403).json({email: 'Please verify your email first'});
			}
			// users.forEach(async user => {
			// 	const {_id} = user;
			// 	await User.findOneAndRemove(_id);
			// 	await UserDataModel.findByIdAndRemove(_id);
			// 	await SessionModel.findByIdAndRemove(_id);
			// 	await LocalWallet.findByIdAndRemove(_id);
			// 	await DollarWallet.findByIdAndRemove(_id);
			// 	await EuroWallet.findByIdAndRemove(_id);
			// 	await PoundWallet.findByIdAndRemove(_id);
			// });
		}

		next();
	} catch (err) {
		console.log(err.message);
		next();
	}
};

const verifyEmailHTML = async email => {
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
	sendMail(mailOptions, '', email);
};

const generateTokenForOTP = id => {
	return jwt.sign({id}, process.env.JWT_SECRET, {
		expiresIn: process.env.RESET_PASSWORD_TIMEOUT,
	});
};

module.exports = {removeUnverifiedUsers};
