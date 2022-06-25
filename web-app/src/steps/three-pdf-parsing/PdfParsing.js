import { useState, useEffect, useRef } from 'react';
import './PdfParsing.scss';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PdfParsing = (props) => {
  const { pdfFileKeys } = props;
  const [pdfDimensions, setPdfDimensions] = useState({});
  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [autoPdfLoadErr, setAutoPdfLoadErr] = useState(false);
  const [creatingZone, setCreatingZone] = useState(false);
  const [showZoneDiv, setShowZoneDiv] = useState(false);
  const [zones, setZones] = useState([]);

  const [zoneDimensions, setZoneDimensions] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  
  const zoneDimensionsRef = useRef(zoneDimensions);

  const onDocumentLoadSuccess = () => {

  }

  const onDocumentPageRenderSuccess = () => {

  }

  // make sure clicking over PDF
  const checkBounds = (e) => {
    var ev = e || window.event; //Moz || IE
    let x, y;

    // keep within pdf
    const pdfPageBounds = document.querySelector('.react-pdf__Page__canvas')?.getBoundingClientRect();

    if (ev.pageX) { //Moz
      x = ev.pageX + window.pageXOffset;
      y = ev.pageY + window.pageYOffset;

      if (x > pdfPageBounds.left && x < pdfPageBounds.right && y > pdfPageBounds.top && y < pdfPageBounds.bottom) {
        return true;
      } else {
        return false;
      }
    } else if (ev.clientX) { //IE
      x = ev.clientX + document.body.scrollLeft;
      y = ev.clientY + document.body.scrollTop;
      
      if (x > pdfPageBounds.left && x < pdfPageBounds.right && y > pdfPageBounds.top && y < pdfPageBounds.bottom) {
        return true;
      } else {
        return false;
      }
    }
  }

  const getMousePos = (e) => {
    var ev = e || window.event; //Moz || IE
    if (ev.pageX) { //Moz
      return {
        x: ev.pageX + window.pageXOffset,
        y: ev.pageY + window.pageYOffset
      };
    } else if (ev.clientX) { //IE
      return {
        x: ev.clientX + document.body.scrollLeft,
        y: ev.clientY + document.body.scrollTop
      };
    }
  };

  const mouseDownFcn = (e) => {
    if (!checkBounds(e)) {
      return;
    }

    // start listening for these events
    window.addEventListener('mousemove', mouseMoveFcn);
    window.addEventListener('mouseup', mouseUpFcn);

    const mousePos = getMousePos(e);

    setZoneDimensions(prev => ({
      ...prev,
      x: mousePos.x,
      y: mousePos.y
    }));

    setShowZoneDiv(true);
  }

  const mouseUpFcn = (e) => {
    window.removeEventListener('mousedown', mouseDownFcn);
    window.removeEventListener('mousemove', mouseMoveFcn);
    window.removeEventListener('mouseup', mouseUpFcn);

    setZones(prev => ([
      ...prev,
      {
        id: Date.now(),
        ...zoneDimensionsRef.current
      }
    ]));
  }

  const mouseMoveFcn = (e) => {
    const mousePos = getMousePos(e);

    setZoneDimensions(prev => ({
      ...prev,
      width: mousePos.x - prev.x,
      height: mousePos.y - prev.y
    }));
  }

  const deleteZone = (zoneId) => {
    setZones(prev => ([
      ...prev.filter(zone => zone.id !== zoneId)
    ]));
  }

  useEffect(() => {
    if (zoneDimensions.width > 0) {
      zoneDimensionsRef.current = zoneDimensions;
    }
  }, [zoneDimensions]);

  useEffect(() => {
    console.log(zones);
    setCreatingZone(false);
    setShowZoneDiv(false);
  }, [zones]);

  useEffect(() => {
    // have to bind/unbind these or they build up/fire multiple events
    if (creatingZone) {
      window.addEventListener('mousedown', mouseDownFcn);
    } else {
      window.removeEventListener('mousemove', mouseMoveFcn);
      window.removeEventListener('mousedown', mouseDownFcn);
      window.removeEventListener('mouseup', mouseUpFcn);

      setZoneDimensions({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
    }
  }, [creatingZone]);

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
        {showZoneDiv && (zoneDimensions?.width > 0 && zoneDimensions?.height > 0) && <div
          className="App__pdf-parsing-left-zone temp"
          style={{
            width: zoneDimensions.width,
            height: zoneDimensions.height,
            transform: `translate(${zoneDimensions.x}px, ${zoneDimensions.y}px)`
          }}
          ></div>
        }
        {!showZoneDiv && zones.length > 0 && zones.map((zone, index) => <div
          key={zone.id}
          className="App__pdf-parsing-left-zone"
          style={{
            width: zone.width,
            height: zone.height,
            transform: `translate(${zone.x}px, ${zone.y}px)`
          }}
          >
            <div className="zone-inner-wrapper">
              <p>Zone # {index + 1}</p>
            </div>
            <button className="delete-zone" type="button" onClick={(e) => deleteZone(zone.id)}>x</button>
          </div>
        )}
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
        {!creatingZone && <span><button type="button" onClick={() => setCreatingZone(true)}>+</button> Create Parsing Zone</span>}
        {creatingZone && <>
          "Finish creating a zone on the PDF"
          <button type="button" onClick={() => setCreatingZone(false)}>Cancel</button>
        </>}
        {zones.length > 0 && <>
          <h2 className="zone-header">Zones</h2>
          {zones.map((zone, index) => <span className="zone-span">
            <p>Zone # {index + 1}</p>
            <input id={`zone-${zone.id}`} type="text" placeholder="spreadsheet col letter"/>
          </span>)}
        </>}
        <h2 className="pdfs-header">Uploaded PDFs</h2>
        <p>Click to preview</p>
        {pdfFileKeys.map((pdf, index) => <p className="pdf-parsing-right__pdf-link" key={index}>{`> ${pdf.fileName}`}</p>)}
        <button className="pdf-parsing-right__parse-btn" type="button">Parse PDFs</button>
      </div>
    </div>
  );
}

export default PdfParsing;
