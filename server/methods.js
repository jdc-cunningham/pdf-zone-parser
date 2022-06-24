const { pool } = require('./dbConnect');
const { writeToCell } = require('./google-spreadsheet');

const getShareEmail = (req, res) => {
  pool.query(
    `${'SELECT gsa_email FROM util LIMIT 1'}`, // should only be one
    (err, qRes) => {
      if (err) {
        console.log(err);
        res.status(400).json({ok: false});
      } else {
        res.status(200).json({
          ok: true,
          sharedEmail: qRes[0].gsa_email
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

module.exports = {
  getShareEmail,
  saveSpreadsheetId
}