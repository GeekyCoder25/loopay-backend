const nodemailer = require('nodemailer');

const sendMail = (mailOtptions, res, result) => {
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

	transporter.sendMail(mailOtptions, (err, info) => {
		if (err) {
			console.log(err);
			return res
				.status(500)
				.json(`Message not sent: Mail server Error, ${err.message}`);
		}
		res.status(200).json({
			email: result.email,
		});

		console.log('Message Sent: %s', info.messageId);
	});
};

module.exports = {
	sendMail,
};
