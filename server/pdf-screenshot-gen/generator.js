require('dotenv').config();
const sharp = require('sharp');
const exec = require('child_process').exec;
const pdfImgPath = __dirname + '/screenshots/pdf.jpg';


const _generateImageFromPdf = (pdfPath) => {
  return new Promise(resolve => {
    const cmd = `${process.env.SERVER_OS === 'windows' ? 'magick convert' : 'convert'} \
      -density 150 ${pdfPath} -quality 90 ${pdfImgPath}`;

    exec(cmd, function (error, stdout, stderr) {
      if (error) {
        console.log("failed to generate pdf image", error.message);
        resolve(false);
      }

      if (stderr) {
        console.log("stderr", stderr);
        resolve(false);
      }

      resolve(pdfImgPath);
    });
  });
}

const _getCroppedImages = async (cropZones, pdfImagePath, subImages, multiplier) => {
  return new Promise(async (resolve) => {
    if (cropZones.length) {
      const { x, y, width, height, id, xOffset, yOffset } = cropZones[0];

      sharp(pdfImagePath)
        .extract({
          left: Math.trunc((x + xOffset) * multiplier.x),
          top: Math.trunc((y + yOffset) * multiplier.y),
          width: Math.trunc(width * multiplier.x),
          height: Math.trunc(height * multiplier.y)
        })
        .toFile(__dirname + `./screenshots/${id}.jpg`, function (err) {
          if (err) {
            console.log(err);
            resolve(false);
          } else {
            cropZones.shift();
            _getCroppedImages(cropZones, pdfImagePath, subImages, multiplier, pdfDimensions);
          }
        });
    } else {
      resolve(true);
    }
  });
}

const getPdfCropImages = async (pdfPath, pdfDimensions, cropZones) => {
  return new Promise(async (resolve) => {
    const pdfImagePath = await _generateImageFromPdf(pdfPath, pdfDimensions);
    const subImages = [];
    const image = await sharp(pdfImagePath);
    const metadata = await image.metadata();

    const xMultiplier = pdfDimensions.width < metadata.width
      ? metadata.width / pdfDimensions.width
      : pdfDimensions.width / metadata.width;

    const yMultiplier = pdfDimensions.height < metadata.height
      ? metadata.height / pdfDimensions.height
      : pdfDimensions.height / metadata.height;

    try {
      await _getCroppedImages(cropZones, pdfImagePath, subImages, {x: xMultiplier, y: yMultiplier}, pdfDimensions);
    } catch (err) {
      console.log(err);
      resolve([]); // fail all if any fail
    }
    resolve(subImages);
  });
};

// const pdfDimensions = {
//   width: 921,
//   height: 1191
// };

// const cropZones = [
//  {"id":1656141009979,"x":484,"y":194,"width":162,"height":32,"xOffset":-41.5,"yOffset":-88},
//  {"id":1656141013693,"x":148,"y":325,"width":172,"height":25,"xOffset":-41.5,"yOffset":-88},
//  {"id":1656141018211,"x":147,"y":422,"width":177,"height":77,"xOffset":-41.5,"yOffset":-88}
// ];

// getPdfCropImages(__dirname + './test.pdf', pdfDimensions, cropZones);

module.exports = {
  getPdfCropImages
}