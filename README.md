#### Status: incomplete

### About
This is a web-based PDF zone-parser that is specifically made to integrate into a google spreadsheet. So each zone parsed goes into some spreadsheet cell.

### How does it work?
This project uses `ImageMagick` to generate an image from a PDF and then uses `sharp` to make sub images from the zones drawn over a client-rendered PDF preview. The sub images are then passed into `Tesseract.js` to parse the text from the images. Then the parsed text is written out to a Google Spreadsheet.

#### Disclaimer
This was a weekend project so it's very poorly made.

This was not built with auth, it assumes only one user is using the system, it only does 1 page per doc.

This project uses AWS S3 to store the PDFs, permissions have to be set with regard to `CORS` on the bucket.

The Google Spreadsheet writer uses a Google service account to modify the shared spreadsheet.

#### Potential vulnerabilities
This takes in a filename and passes it into a command line call directly without cleaning/using an alias