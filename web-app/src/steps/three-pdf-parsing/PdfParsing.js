import { useState, useEffect } from 'react';
import './PdfParsing.scss';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PdfParsing = (props) => {
  const { pdfFileKeys } = props;
  const [pdfDimensions, setPdfDimensions] = useState({});
  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [autoPdfLoadErr, setAutoPdfLoadErr] = useState(false);

  const onDocumentLoadSuccess = () => {

  }

  const onDocumentPageRenderSuccess = () => {

  }

  useEffect(() => {
    // set PDF render dimension based on window size
    const targetDisplay = document.querySelector('.App__pdf-parsing-left');

    setPdfDimensions({
      width: Math.floor(targetDisplay?.offsetWidth * 0.9),
      height: Math.floor(targetDisplay?.offsetHeight * 0.85)
    });

    // pull first PDF/render it
    if (pdfFileKeys.length) {
      axios.post(
        `${process.env.REACT_APP_API_BASE}/get-signed-s3-url`, {
        fileKey: pdfFileKeys[0].fileKey,
      })
      .then((res) => {
        if (res.status === 200) {
          if (res.data?.url) {
            setActivePdfUrl(res.data.url);
          }
        } else {
          console.log('upload error');
          setAutoPdfLoadErr(true);
        }
      })
      .catch(err => {
        setAutoPdfLoadErr(true);
      });
    }
  }, []);

  return (
    <div className="App__pdf-parsing">
      <div className="App__pdf-parsing-left">
        {autoPdfLoadErr && <h2>Click on a PDF on the right to preview</h2>}
        {!autoPdfLoadErr && <>
          <h2
            style={{
              width: `${pdfDimensions?.width}px`
            }}
            className="pdf-render-related"
          >
            Click the "+" sign on the right to create a PDF zone. Click somewhere on the PDF then drag to create a box (zone) around a piece of text to parse.
          </h2>
          <Document
            file={activePdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="page-document-signing__active-document-pdf-canvas"
            noData="Awaiting files..."
          >
            <Page
              width={pdfDimensions?.width}
              loading="Loading page..."
              scale={1.0}
              pageNumber={1} // can advance if supporting multiple pages
              onRenderSuccess={onDocumentPageRenderSuccess}
              renderTextLayer={false}
            />
          </Document>
        </>}
      </div>
      <div className="App__pdf-parsing-right">
        <h2>Create a PDF zone</h2>
        <span><button type="button">+</button> Create Parsing Zone</span>
        <h2>Uploaded PDFs</h2>
        {pdfFileKeys.map((pdf, index) => <p className="pdf-parsing-right__pdf-link" key={index}>{pdf.fileName}</p>)}
        <button className="pdf-parsing-right__parse-btn" type="button">Parse PDFs</button>
      </div>
    </div>
  );
}

export default PdfParsing;
