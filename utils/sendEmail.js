const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.MAIL_USERNAME,
		pass: process.env.MAIL_PASSWORD,
	},
	
	// host: '127.0.0.1',
	// port: 2526,
});

const sendMail = async (mailOtptions, res, result) => {
	transporter.sendMail(mailOtptions, (err, info) => {
		if (err) {
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
