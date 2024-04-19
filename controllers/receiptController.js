/* eslint-disable no-mixed-spaces-and-tabs */
const fs = require('fs');
const puppeteer = require('puppeteer');
const TransactionModel = require('../models/transaction');
const {addingDecimal} = require('../utils/addingDecimal');

const generateReceipt = async (req, res) => {
	try {
		const {allCurrencies, id, type} = req.body;
		const generatePDF = async (htmlContent, outputPath) => {
			const browser = await puppeteer.launch();
			const page = await browser.newPage();
			await page.setContent(htmlContent);
			await page.pdf({path: outputPath, format: 'A4'});
			await browser.close();
		};

		const history = await TransactionModel.findOne({
			reference: id,
			transactionType: type,
		});
		const {
			status,
			receiverName,
			amount,
			transactionType,
			createdAt,
			sourceBank,
			destinationBank,
			senderAccount,
			receiverAccount,
			currency,
			description,
			reference,
			accNo,
			swapFrom,
			swapTo,
			swapFromAmount,
			swapToAmount,
			swapRate,
			networkProvider,
			rechargePhoneNo,
			billName,
			billType,
			token,
		} = history;

		const currencySymbol = allCurrencies.find(
			id => currency === id.currency || currency === id.acronym
		)?.symbol;

		const swapFromSymbol = allCurrencies.find(
			id => swapFrom === id.currency
		)?.symbol;

		const swapToSymbol = allCurrencies.find(
			id => swapTo === id.currency
		)?.symbol;

		const shareReceiptData = () => {
			if (transactionType === 'airtime' || transactionType === 'data') {
				return [
					{
						key: 'Transaction type',
						value: `Debit - ${transactionType} `,
					},
					{key: 'Network', value: networkProvider},
					{key: 'Phone Number', value: rechargePhoneNo},
					{key: 'Reference Id', value: reference},
					{key: 'Status', value: status},
				];
			} else if (transactionType === 'bill') {
				return [
					{
						key: 'Transaction type',
						value: `${transactionType} Payment - Debit`,
					},
					{key: 'Bill Type', value: billType},
					{key: 'Bill Service', value: billName},
					token && {key: 'Token', value: token},
					{key: 'Reference Id', value: reference},
					{key: 'Status', value: status},
				].filter(Boolean);
			} else if (transactionType === 'swap') {
				return [
					{key: 'Transaction type', value: 'Swap'},
					{key: 'Account', value: accNo},
					{key: 'Swap from currency', value: swapFrom},
					{key: 'Swap to currency', value: swapTo},
					{
						key: 'Swap from amount',
						value: `${swapFromSymbol}${addingDecimal(
							Number(swapFromAmount).toLocaleString()
						)}`,
					},
					{
						key: 'Swap to amount',
						value: `${swapToSymbol}${addingDecimal(
							Number(swapToAmount).toLocaleString()
						)}`,
					},
					{
						key: 'Swap Rate',
						value:
							swapRate < 1
								? `${swapToSymbol}1 = ${swapFromSymbol}${addingDecimal(
										Number(1 / swapRate || 0).toLocaleString()
								  )}`
								: `${swapFromSymbol}1 = ${swapToSymbol}
              ${addingDecimal(Number(swapRate || 0).toLocaleString())}`,
					},
					{key: 'Reference Id', value: reference},
					{key: 'Status', value: status},
				];
			}
			return [
				{key: 'Receiver Account', value: receiverAccount},
				{key: 'Sender Account', value: senderAccount},
				{key: 'Receiver Name', value: receiverName},
				{key: 'Transaction type', value: transactionType},
				{
					key: [transactionType === 'credit' ? 'Sender Bank' : 'Receiver Bank'],
					value: transactionType === 'credit' ? sourceBank : destinationBank,
				},
				{key: 'Reference Id', value: reference},
				{key: 'Narration', value: description, noTransform: true},
				{key: 'Status', value: status},
			];
		};

		const htmlContent = String.raw`
		<html lang="en">
			<head>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
				/>
				<title>Loopay Receipt</title>
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
				/>
				<style>
					@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap');
					* {
						padding: 0;
						margin: 0;
					}
					body {
						padding: 20px;
						margin: auto;
						max-height: 842px;
						max-width: 800px;
						font-family: 'Inter', sans-serif;
					}
					.container {
						width: 100%;
						height: 100%;
						display: flex;
						flex-direction: column;
					}
					.logo {
						width: 150px;
						height: 100px;
						object-fit: contain;
					}
					header {
						display: flex;
						align-items: center;
						justify-content: space-between;
						gap: 20px;
						width: 100%;
						margin-bottom: 50px;
					}
					header span {
						display: inline-block;
						padding-top: 6px;
					}
					.title {
						font-size: 2rem;
					}
					.amount {
						display: flex;
						align-items: flex-end;
					}
					.amount h4 {
						margin-right: 5px;
						margin-bottom: 2px;
						font-size: 1.3rem;
					}
					.amount h5 {
						margin-right: 10px;
						margin-bottom: 2px;
						font-size: 1.5rem;
					}
					.statusHeader {
						font-weight: 600;
						margin-top: 20px;
						display: inline-block;
						text-transform: capitalize;
					}
					.success {
						color: #0fb52d;
					}
					.pending {
						color: #ffa500;
					}
					.blocked,
					.declined,
					.abandoned {
						color: #ed4c5c;
					}
					section {
						margin-top: 30px;
					}
					section div {
						display: flex;
						align-items: center;
						justify-content: space-between;
						border-bottom: 1px solid #000;
						padding: 10px 2px;
					}
					section .value {
						text-transform: capitalize;
					}
					footer {
						padding: 50px 20px 10px;
						text-align: justify;
						margin-top: auto;
						line-height: 25px;
						display: flex;
						flex-direction: column;
						gap: 10px;
					}
					footer h3 {
						display: inline-block;
					}
					footer img {
						width: 200px;
						height: 200px;
						margin-left: auto;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<header>
						<div>
							<h2 class="title">Receipt</h2>
							<span>${new Date(createdAt).toString()}</span>
						</div>
						<img
							src="https://res.cloudinary.com/geekycoder/image/upload/v1688782340/loopay/appIcon.png"
							alt=""
							class="logo"
						/>
					</header>
					<div class="amount">
								<h4>${currencySymbol}</h4>
								<h1>
									${
										Number(amount || swapToAmount)
											.toLocaleString()
											.split('.')[0]
									}
								</h1>
								<h5>
									.${Number(amount).toLocaleString().split('.')[1] || '00'}
								</h5>
								
					</div>
                    <span class="statusHeader ${status}">${status}</span>
					<section>
						${shareReceiptData()
							.map(
								index =>
									String.raw`
										<div>
											<h3>${index.key}</h3>
											<p
												class="status"
												style="${!index.noTransform && 'text-transform: capitalize;'}"
											>
												${index.value}
											</p>
										</div>
									`
							)
							.join('')}
					</section>

					<footer>
						<div>
							<h3>DISCLAIMER:</h3>
							Your transaction has been successfully processed. Note. however,
							that completion of any transfer may be affected by other factors
							including but not limited to transmission errors, incomplete
							information, fluctuations on the network/internet, interruptions,
							glitch, delayed information or other matters beyond the Bank's
							control which may impact on the transaction and for which the Bank
							will not be liable. All transactions are subject to Loopay
							confirmation and fraud proof verification.
						</div>
						<img
							src="https://res.cloudinary.com/geekycoder/image/upload/v1703481253/loopay/qrcode.png"
						/>
					</footer>
				</div>
			</body>
		</html>
	`;

		const outputPath = 'receipt.pdf';
		await generatePDF(htmlContent, outputPath).then(() =>
			console.log('PDF generated successfully!')
		);
		// .catch(error => console.error('Error generating PDF:', error));

		const pdfFile = fs.readFileSync(outputPath);

		const additionalData = {
			message: 'PDF download successful',
			timestamp: Date.now(),
		};

		res.setHeader('Content-Type', 'application/json');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename=download-data.json'
		);

		const responseData = {
			pdf: pdfFile.toString('base64'), // Convert PDF buffer to base64 string
			additionalData: additionalData,
		};

		res.status(200).json(responseData);
	} catch (error) {
		console.log(error);
		res.status(400).json({error: error.message, success: false});
	}
};

module.exports = {
	generateReceipt,
};
