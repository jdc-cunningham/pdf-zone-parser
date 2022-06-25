require('dotenv').config();
const exec = require('child_process').exec;
const pdfPath = __dirname + '/test.pdf';
const pdfImgPath = __dirname + '/screenshots/pdf.jpg';

const generateImageFromPdf = (pdfPath) => {
  // return new Promise(resolve => {
    const cmd = `${process.env.SERVER_OS === 'windows' ? 'magick convert' : 'convert'} -density 150 ${pdfPath} -quality 90 ${pdfImgPath}`;

    exec(cmd, function (error, stdout, stderr) {
      if (error) {
        console.log("failed to generate pdf image", error.message);
        // resolve(false);
      }

      if (stderr) {
        console.log("stderr", stderr);
        // resolve(false);
      }

      // resolve(true);
    });
  // });
}

generateImageFromPdf(pdfPath);