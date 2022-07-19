require('dotenv').config();
const fs = require('fs');
const sharp = require('sharp');
const exec = require('child_process').exec;
const axios = require('axios').default;

const _slugifyNoPdf = (text) => text
  .toLowerCase()
  .replace('.pdf', '')
  .replace(/[^\w-]+/g,'-')
  .replace(/ +/g,'-');

// this sucks, why upload it if you're just going to download it again
// batch is the reason and security (stored on AWS encrypted at rest)
const _downloadPdfToLocal = async (pdfS3SignedUrl, fileName) => {
  return new Promise(resolve => {
    axios({
      method: "get",
      url: pdfS3SignedUrl,
      responseType: "stream"
    }).then(function (response) {
      const pdfLocalPath = __dirname + `/${_slugifyNoPdf(fileName)}.pdf`;
      const stream = response.data.pipe(fs.createWriteStream(pdfLocalPath));
      stream.on('finish', () => {
        resolve(true);
      });
    }).catch(err => { console.log(err); resolve(false); });
  });
}

const _generateImageFromPdf = (pdfInfo, pdfS3Url) => {
  return new Promise(async (resolve) => {
    const localPdfDownloaded = await _downloadPdfToLocal(pdfS3Url, pdfInfo.fileName);

    if (!localPdfDownloaded) resolve(false);

    const { fileName } = pdfInfo;
    const pdfImgPath = __dirname + `/${_slugifyNoPdf(fileName)}.jpg`;
    const pdfLocalPath = __dirname + `/${_slugifyNoPdf(fileName)}.pdf`;

    // this is probably a vulnerability right here, since it passes an external value
    // (the file name) into command line, would want to rename the file, strip it, use an alias, something
    const cmd = `${process.env.SERVER_OS === 'windows' ? 'magick convert' : 'convert'} \
      -density 150 ${pdfLocalPath}[0] -quality 90 ${pdfImgPath}`;

    exec(cmd, function (error, stdout, stderr) {
      if (error) {
        console.log("failed to generate pdf image", error.message);
        resolve(false);
      }

      if (stderr) {
        console.log("stderr", stderr);
        resolve(false);
      }

      // remove local pdf
      fs.unlink(pdfLocalPath, (err => {
        if (err) console.log(err); // means files will build up
      }));

      resolve(pdfImgPath);
    });
  });
}

const _getCroppedImages = async (cropZones, pdfImagePath, subImages, multiplier) => {
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

// https://stackoverflow.com/a/4760279/2710227
const _dynamicSort = (property) => {
  var sortOrder = 1;
  if(property[0] === "-") {
      sortOrder = -1;
      property = property.substr(1);
  }
  return function (a,b) {
      /* next line works with strings and numbers, 
       * and you may want to customize it to your needs
       */
      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
  }
}

const getPdfCropImages = async (pdfInfo, pdfS3Url, pdfDimensions, cropZones, zoneColumnMap) => {
  return new Promise(async (resolve) => {
    const pdfImagePath = await _generateImageFromPdf(pdfInfo, pdfS3Url);
    const subImages = [];
    const image = await sharp(pdfImagePath);
    const metadata = await image.metadata();

    const xMultiplier = pdfDimensions.width < metadata.width
      ? metadata.width / pdfDimensions.width
      : pdfDimensions.width / metadata.width;

    const yMultiplier = pdfDimensions.height < metadata.height
      ? metadata.height / pdfDimensions.height
      : pdfDimensions.height / metadata.height;

    // add the letter mapping
    const modCropZones = [];
    
    cropZones.forEach(zone => {
      modCropZones.push({
        ...zone,
        colLetter: zoneColumnMap[`zone-${zone.id}`]
      });
    });

    // sort by col letter
    modCropZones.sort(_dynamicSort("colLetter"));

    try {
      await _getCroppedImages(modCropZones, pdfImagePath, subImages, {x: xMultiplier, y: yMultiplier});

      // remove pdf image
      fs.unlink(pdfImagePath, (err => {
        if (err) console.log(err); // means files will build up
      }));

      resolve(subImages);
    } catch (err) {
      console.log(err);
      resolve([]); // fail all if any fail
    }
  });
};

module.exports = {
  getPdfCropImages
}