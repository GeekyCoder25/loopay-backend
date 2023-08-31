/* eslint-disable no-undef */
const express = require('express');
const cors = require('cors');
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const userDataRoutes = require('./routes/userDataRoutes');
const adminRoutes = require('./routes/adminRoutes');
const path = require('path');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;
const {protect, authorize} = require('./middleware/authMiddleware');
const {uploadPhoto} = require('./controllers/uploadPhoto');
const {webhookHandler} = require('./controllers/webhookController');
require('colors');
dotEnv.config();
// eslint-disable-next-line no-undef
const PORT = process.env.PORT;
// eslint-disable-next-line no-undef
const dbURI = process.env.MONGO_URI;
const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));
mongoose
	.connect(dbURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		// useCreateIndex: true,
		// useFindAndModify: false,
	})
	.then(mongo => {
		console.log(`mongodb running on ${mongo.connection.host.rainbow.bold}`);
		app.listen(PORT, () => {
			console.log(`App listening on port ${PORT}!`.yellow.bold);
		});
	})
	.catch(err =>
		console.log("Couldn't connect to MonogoDB,".red.bold, err.message.red)
	);

// Cloudinary configuration
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post('/api/upload', protect, uploadPhoto);
app.use('/api/auth', authRoutes);
// app.use('/api', userDataRoutes);
app.use('/api/user', protect, userDataRoutes);
app.use('/api/admin', protect, adminRoutes);
app.use('/api/webhook', webhookHandler);

app.get('/api/network', (req, res) => {
	console.log('network request');
	res.send({network: true});
});
app.get('/api', (req, res) => {
	console.log('Lopay Backend');
	res.send({app: 'Loopay'});
});
