const User = require('../models/user');
const _ = require('lodash');

const handleErrors = err => {
	let errors = {};
	console.log(err.message, err.code);
	Object.values(err.errors).forEach(({properties}) => {
		errors[properties.path] = properties.message;
	});
	return errors;
};

const handlephoneNumber = (req, res) => {
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

exports.registerAccount = (req, res) => {
	handlephoneNumber(req, res);
	User.create(req.body)
		.then(data =>
			res.status(200).json({
				success: 'Account Created Successfully',
				data: {
					email: data.email,
					fullName: data.fullName,
					userName: data.userName,
					phoneNumber: data.phoneNumber,
				},
			})
		)
		.catch(err => {
			// process.env.NODE_ENV === 'development' && console.log(err);
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
		});
};

exports.loginAccount = (req, res) => {
	User.findOne({email: req.body.email})
		.then(result => {
			if (result === null) throw '';
			else if (req.body.password !== result.password)
				res.status(400).json({password: 'Incorect Password'});
			else {
				res.status(200).json({
					data: {
						email: result.email,
						fullName: result.fullName,
					},
				});
			}
		})
		.catch(err => {
			res.status(400).json({email: 'No account is associated with this email'});
			console.log(err);
		});
};

exports.forgetPassword = (req, res) => {
	console.log(req.body);
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
