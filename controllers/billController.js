const {default: axios} = require('axios');

const getBills = async (req, res) => {
	try {
		const query = Object.keys(req.query);
		const countryCode = 'NG';
		console.log(query[0]);
		const billType = () => {
			switch (query[0]) {
				case 'electricity':
					return 'ELECTRICITY_BILL_PAYMENT';
				case 'tv':
					return 'TV_BILL_PAYMENT';
				case 'internet':
					return 'INTERNET_BILL_PAYMENT';
				case 'water':
					return 'WATER_BILL_PAYMENT';
				default:
					break;
			}
		};
		const url = `${
			process.env.RELOADLY_BILL_URL
		}/billers?countryISOCode=${countryCode}&size=50&type=${billType()}`;
		const token = req.billAPIToken;
		const config = {
			headers: {
				Accept: 'application/com.reloadly.utilities-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};
		const response = await axios.get(url, config);
		return res.status(200).json(response.data.content);
	} catch (err) {
		console.log(err.response.data.message);
		res.status(400).json(err.response.data.message);
	}
};
const payABill = async (req, res) => {
	try {
		const {provider, subscriberAccountNumber, amount, amountId, metadata} =
			req.body;
		const url = `${process.env.RELOADLY_BILL_URL}/pay`;
		const token = req.billAPIToken;
		const config = {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/com.reloadly.utilities-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};
		const referenceId = req.user.email + subscriberAccountNumber + new Date();

		const body = JSON.stringify({
			subscriberAccountNumber,
			amount,
			amountId: amountId || null,
			billerId: provider.id,
			useLocalAmount: true,
			referenceId,
			additionalInfo: metadata,
		});
		const response = await axios.post(url, body, config);
		return res.status(200).json(response.data);
	} catch (err) {
		console.log(err.response.data);
		res.status(400).json(err.response.data.message);
	}
};

module.exports = {getBills, payABill};
