const crypto = require('crypto');

const pagaHash = (paramObject, hashKey) => {
	const addedDataString = paramObject
		? Object.values(paramObject).toString().split(',').join('')
		: '';
	const concatenatedParams = addedDataString + hashKey;

	const hash = crypto
		.createHash('sha512')
		.update(concatenatedParams)
		.digest('hex');
	return hash;
};

const generateReference = async (req, res, next) => {
	const timestamp = Date.now();
	const random_number = Math.floor(Math.random() * timestamp);
	req.body.referenceNumber = `${random_number}`;

	function makePropertyFirst(obj, propName) {
		const newObj = {};

		newObj[propName] = obj[propName];

		for (const key in obj) {
			if (key !== propName) {
				newObj[key] = obj[key];
			}
		}

		return newObj;
	}

	const newObj = makePropertyFirst(req.body, 'referenceNumber');
	req.body = newObj;

	next();
};

module.exports = {
	pagaHash,
	generateReference,
};
