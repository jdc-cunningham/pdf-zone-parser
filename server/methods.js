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
        res.status(201).json({
          ok: true,
          sharedEmail: qRes[0].gsa_email
        });
      }
    }
  );
}

module.exports = {
  getShareEmail
}