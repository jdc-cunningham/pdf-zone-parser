import React, { useState, useEffect } from 'react';
import './PdfUpload.css';
import axios from 'axios';

const PdfUpload = (props) => {
  const { setCurrentStep, setPdfFileKeys } = props;
  const [pdfs, setPdfs] = useState([]);
  const [dragDetected, setDragDetected] = useState(false);

  const uploadToS3 = () => {
    const formData = new FormData();

    pdfs.forEach(file => {
      formData.append("files", file.fileObj);
    });

    axios.post(
      `${process.env.REACT_APP_API_BASE}/upload-pdfs`,
      formData,
    )
    .then((res) => {
      if (res.status === 200) {
        if (res.data.ok) {
          setPdfFileKeys(res.data.uploaded);
          setPdfs([]);
          setCurrentStep(3);
        }
      } else {
        console.log('upload error');
        alert('Something went wrong with the upload process');
      }
    })
    .catch(err => {
      alert('Something went wrong with the upload process');
      setPdfs([]);
      setDragDetected(false);
    });
  };

  const dragOverHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();

    setDragDetected(true);
  }

  const dragLeave = (event) => {
    setDragDetected(false);
  }

  const dropHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();

    const filesToUploadTmp = [];

    // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      // If dropped items aren't files, reject them
      const fileObj = event.dataTransfer.files[i];
      if (fileObj.type === 'application/pdf') {
        filesToUploadTmp.push({
          filename: fileObj.name,
          fileObj
        });
      }
    }

    setPdfs(filesToUploadTmp);
  }

  useEffect(() => {
    if (pdfs.length > 0) {
      uploadToS3();
    }
  }, [pdfs])

  return (
    <div
      className="App__pdf-upload"
      onDrop={(e) => dropHandler(e)}
      onDragOver={(e) => dragOverHandler(e)}
      onDragLeave={(e) => dragLeave(e)}
    >
      {!dragDetected && pdfs.length < 1 && <h1 style={{textAlign: 'center', width: '100%'}}>Drag and drop your PDFs into this window to upload and parse them</h1>}
      {dragDetected && <h1>Release your mouse click to upload</h1>}
      {pdfs.lenght > 0 && <h2>Uploading...</h2>}
    </div>
  );
}

export default PdfUpload;