const reloadly = () => {
	if (process.env.RELOADLY_ENV && process.env.RELOADLY_ENV === 'live')
		return {
			URL: process.env.RELOADLY_URL,
			ID: process.env.RELOADLY_CLIENT_ID,
			SECRET: process.env.RELOADLY_CLIENT_SECRET,
		};
	else
		return {
			URL: process.env.RELOADLY_URL_TEST,
			ID: process.env.RELOADLY_CLIENT_ID_TEST,
			SECRET: process.env.RELOADLY_CLIENT_SECRET_TEST,
		};
};

const reloadlyBill = () => {
	if (process.env.RELOADLY_BILL_ENV && process.env.RELOADLY_BILL_ENV === 'live')
		return {
			URL: process.env.RELOADLY_BILL_URL,
			ID: process.env.RELOADLY_CLIENT_ID,
			SECRET: process.env.RELOADLY_CLIENT_SECRET,
		};
	else
		return {
			URL: process.env.RELOADLY_BILL_URL_TEST,
			ID: process.env.RELOADLY_CLIENT_ID_TEST,
			SECRET: process.env.RELOADLY_CLIENT_SECRET_TEST,
		};
};

const env = {
	reloadly,
	reloadlyBill,
};
module.exports = {
	env,
};
