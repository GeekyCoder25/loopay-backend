const handlePhoneNumber = phoneNumber => {
	if (phoneNumber.startsWith('0')) {
		const tempNumber = phoneNumber.replace('0', '+234');
		phoneNumber = tempNumber;
	} else if (
		phoneNumber.startsWith('7') ||
		phoneNumber.startsWith('8') ||
		phoneNumber.startsWith('9')
	) {
		const tempNumber = phoneNumber.replace(
			phoneNumber.charAt(0),
			`+234${phoneNumber.charAt(0)}`
		);
		phoneNumber = tempNumber;
	}
	return phoneNumber;
};

module.exports = {
	handlePhoneNumber,
};
