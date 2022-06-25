require('dotenv').config();
const { pool } = require('./dbConnect');
const { writeToCell } = require('./google-spreadsheet');
const fs = require('fs');
const AWS = require('aws-sdk');
const bucketName = process.env.AWS_S3_BUCKET_NAME;

AWS.config.update({
  region: process.env.AWS_S3_REGION,
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

const _getDateTime = (format = '') => {
  // from https://stackoverflow.com/questions/8083410/how-can-i-set-the-default-timezone-in-node-js
  let date_ob = new Date();

  // current date
  // adjust 0 before single digit date
  let date = ("0" + date_ob.getDate()).slice(-2);

  // current month
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // current year
  let year = date_ob.getFullYear();

  // current hours
  let hours = date_ob.getHours();

  // current minutes
  let minutes = date_ob.getMinutes();

  // current seconds
  let seconds = date_ob.getSeconds();

  // prints date & time in YYYY-MM-DD HH:MM:SS format
  if (format === 'full') {
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
  } else {
    return `${year}-${month}-${date}`;
  }
}

const _makeRandomStr = (length) => {
  var result           = ''
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var charactersLength = characters.length

  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }

  return result
}

const _slugify = (text) => text
  .toLowerCase()
  .replace('.pdf', '')
  .replace(/[^\w-]+/g,'')
  .replace(/ +/g,'-');

const getShareEmail = (req, res) => {
  pool.query(
    `${'SELECT gsa_email, spreadsheet_id FROM util t1 INNER JOIN users t2 ON t1.id = t2.id'}`, // should only be one
    (err, qRes) => {
      if (err) {
        console.log(err);
        res.status(400).json({ok: false});
      } else {
        res.status(200).json({
          ok: true,
          sharedEmail: qRes[0].gsa_email,
          spreadsheetId: qRes[0].spreadsheet_id
        });
      }
    }
  );
}

const _insertUser = async (spreadsheetId) => {
  return new Promise(resolve => {
    pool.query(
      `${'INSERT INTO users SET user_name = ?, spreadsheet_id = ?'}`, // should only be one
      ['main', spreadsheetId],
      (err, qRes) => {
        if (err) {
          console.log(err);
          resolve(false);
        } else {
          resolve(1);
        }
      }
    );
  });
};

const _createUser = async (spreadsheetId) => {
  return new Promise(resolve => {
    pool.query(
      `${'SELECT id FROM users LIMIT 1'}`, // should only be one
      async (err, qRes) => {
        if (err) {
          console.log(err);
          resolve(false);
        } else {
          if (qRes[0]?.id) {
            resolve(1);
          } else {
            const userId = await _insertUser(spreadsheetId);
            userId ? resolve(true) : resolve(false);
          }
        }
      }
    );
  });
}

// this platform is designed for only 1 user right now
// assumes userId is 1
const saveSpreadsheetId = async (req, res) => {
  const spreadsheetSaved = await _createUser(req.body.spreadsheetId);
  
  if (spreadsheetSaved) {
    res.status(201).json({
      ok: true
    });
  } else {
    res.status(400).json({
      ok: false
    });
  }
}

const _addDocToTable = async (docMeta) => {
  const { fileName, fileKey, dateAdded } = docMeta;

  return new Promise(resolve => {
    pool.query(
      `${'INSERT INTO pdf_uploads SET user_id = 1, file_name = ?, file_key = ?, parsed = false, upload_date = ?'}`, // should only be one
      [fileName, fileKey, dateAdded],
      (err, qRes) => {
        if (err) {
          console.log(err);
          resolve(false);
        } else {
          resolve(1);
        }
      }
    );
  });
}

const uploadPdfs = async (req, res) => {
  const multerFilesArr = req.files;
  const promises = [];

  multerFilesArr.forEach(file => {
    promises.push(
      new Promise((resolve, reject) => {
        const fileName = file.originalname;
        const fileKey = `${_getDateTime()}_${_makeRandomStr(16)}_${_slugify(fileName)}.pdf`;
  
        fs.readFile(file.path, (err, buff) => {
          const uploadParams = {
            Bucket: bucketName,
            Key: fileKey,
            Body: buff,
            ContentType: 'application/pdf'
          };
      
          s3.upload(uploadParams, async (err, data) => {
            if (err) {
              console.log("Upload to s3 err" + err);
              reject(false);
            }

            if (data) {
              const uploadedMeta = {
                fileName: fileName,
                fileKey: fileKey,
                dateAdded: _getDateTime('full')
              };

              const pdfAddedToDb = await _addDocToTable(uploadedMeta);

              if (pdfAddedToDb) {
                resolve(fileName);
              } else {
                console.log('failed db write');
                reject(false); // could mean duplicate uploads
              }
            }
            // delete from temporary folder
            fs.unlink(file.path, (err) => {
              if (err) {
                console.log(`failed to delete file ${fileName}`)
              }
            });
          });
        });
      })
    );
  });

  Promise
    .all(promises)
    .then((vals) => {
      res.status(200).json({ // this is brittle requiring all to work, no catch for partial failure
        ok: true,
        uploaded: vals
      });
    })
    .catch((err) => {
      console.log('promise all err', err);
      res.status(400).json({
        ok: false,
      });
    })
}
module.exports = {
  getShareEmail,
  saveSpreadsheetId,
  uploadPdfs
}