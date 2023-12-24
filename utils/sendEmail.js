const nodemailer = require('nodemailer');

const sendMail = (mailOptions, res, email, customFunc, errorFunc) => {
	const transport = () => {
		if (process.env.NODE_ENV === 'production') {
			return {
				service: 'gmail',
				auth: {
					user: process.env.MAIL_USERNAME,
					pass: process.env.MAIL_PASSWORD,
				},
			};
		} else
			return {
				host: '127.0.0.1',
				port: 2526,
			};
	};

	const transporter = nodemailer.createTransport(transport());

	transporter.sendMail(mailOptions, (err, info) => {
		if (err) {
			if (res) {
				console.log(err.message);
				return res.status(500).json({error: 'Server Error'});
			}
			if (errorFunc) errorFunc();
			return console.log(err.message);
		}
		if (res) {
			res.status(200).json({
				email,
			});
		}
		if (customFunc) customFunc();
		console.log('Message Sent: %s', info.messageId);
	});
};

module.exports = {
	sendMail,
};
