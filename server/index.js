require('dotenv').config({
  path: __dirname + './.env'
});

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5021;

const { getShareEmail, saveSpreadsheetId } = require('./methods');

// CORs
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(
  bodyParser.json(),
  bodyParser.urlencoded({
    extended: true
  })
);

// routes
app.get('/',(req, res) => {
  res.status(200).send('online');
});

// note there is no authentication middleware in this app
app.get('/get-share-email', getShareEmail);
app.post('/save-spreadsheet-id', saveSpreadsheetId)

app.listen(port, () => {
  console.log(`App running... on port ${port}`);
});