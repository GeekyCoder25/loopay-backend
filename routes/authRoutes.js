const express = require('express');
const {
	registerAccount,
	loginAccount,
	forgetPassword,
	// allusers,
} = require('../controllers/authController');

// const User = require('../models/users');
const router = express.Router();

router.post('/register', registerAccount);
router.post('/login', loginAccount);
router.post('/forget-password', forgetPassword);
// router.get('/allusers', allusers);
// router.delete('/users', (req, res) => {
// 	User.deleteMany()
// 		.then(result => {
// 			res.status(200).json({...result, message: 'All Accounts Deleted'});
// 		})
// 		.catch(err => console.log(err));
// });
// router.get('/user/:id', (req, res) => {
// 	User.findById(req.params.id)
// 		.then(result => res.status(200).json(result))
// 		.catch(err => console.log(err));
// });
// router.put('/user/:id', (req, res) => {
// 	User.findByIdAndUpdate(req.params.id, req.body, {
// 		new: true,
// 		runValidators: true,
// 	})
// 		.then(result => res.status(200).json(result))
// 		.catch(err => console.log(err));
// });
module.exports = router;
