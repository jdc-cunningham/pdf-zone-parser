require('dotenv').config();
const fs = require('fs');
const sharp = require('sharp');
const exec = require('child_process').exec;
const axios = require('axios').default;
const pdfImgPath = __dirname + '/active.jpg';
const pdfLocalPath = __dirname + '/active.pdf';

// this sucks, why upload it if you're just going to download it again
// batch is the reason and security (stored on AWS encrypted at rest)
const _downloadPdfToLocal = async (pdfS3SignedUrl) => {
  return new Promise(resolve => {
    axios({
      method: "get",
      url: pdfS3SignedUrl,
      responseType: "stream"
    }).then(function (response) {
      const stream = response.data.pipe(fs.createWriteStream(pdfLocalPath));
      stream.on('finish', () => {
        resolve(true);
      });
    }).catch(err => { console.log(err); resolve(false); });
  });
}

const _generateImageFromPdf = (pdfPath) => {
  return new Promise(async (resolve) => {
    const localPdfDownloaded = await _downloadPdfToLocal(pdfPath);

    if (!localPdfDownloaded) resolve(false);

    // this is probably a vulnerability right here, since it passes an external value
    // (the file name) into command line, would want to rename the file, strip it, use an alias, something
    const cmd = `${process.env.SERVER_OS === 'windows' ? 'magick convert' : 'convert'} \
      -density 150 ${pdfLocalPath} -quality 90 ${pdfImgPath}`;

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

const _getCroppedImages = async (cropZones, pdfImagePath, subImages, multiplier, pdfDimensions) => {
  return new Promise(async (resolve) => {
    const promises = [];

    cropZones.forEach(zone => {
      promises.push(
        new Promise(resolve => {
          const { x, y, width, height, id, xOffset, yOffset } = zone;
          const subImageFileName = __dirname + `/screenshots/${id}.jpg`;

          sharp(pdfImagePath)
            .extract({
              left: Math.trunc((x + xOffset) * multiplier.x),
              top: Math.trunc((y + yOffset) * multiplier.y),
              width: Math.trunc(width * multiplier.x),
              height: Math.trunc(height * multiplier.y)
            })
            .toFile(subImageFileName, function (err) {
              if (err) {
                console.log(err);
                resolve(false);
              } else {
                subImages.push(subImageFileName);
                resolve(true);
              }
            });
        })
      );
    });

    Promise
      .all(promises)
      .then(subImages => {
        resolve(subImages);
      })
      .catch(err => {
        console.log(err);
        resolve([]);
      });
  });
}

const getPdfCropImages = async (pdfPath, pdfDimensions, cropZones, globalSubImages) => {
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
      console.log('await done');
      globalSubImages = subImages; // used for deletion
      resolve(subImages);
    } catch (err) {
      console.log(err);
      resolve([]); // fail all if any fail
    }
  });
};

module.exports = {
  getPdfCropImages,
  pdfImgPath,
  pdfLocalPath
}