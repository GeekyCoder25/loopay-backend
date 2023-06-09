const express = require('express');
const cors = require('cors');
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
// const userDataRoutes = require('./routes/userDataRoutes');
dotEnv.config();
const PORT = process.env.PORT;
// const dbURI = 'mongodb://127.0.0.1:27017/item7';
const dbURI = process.env.MONGO_URI;
const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());
mongoose
	.connect(dbURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		// useCreateIndex: true,
		// useFindAndModify: false,
	})
	.then(mongo => {
		console.log(`mongodb running on ${mongo.connection.host}`);
		app.listen(PORT, () => {
			console.log(`App listening on port ${PORT}!`);
		});
	})
	.catch(err => console.log("Couldn't connect to MonogoDB", err.message));

app.use('/api/auth', authRoutes);
// app.use('/api', userDataRoutes);
app.get('/api/network', (req, res) => res.send({network: true}));
