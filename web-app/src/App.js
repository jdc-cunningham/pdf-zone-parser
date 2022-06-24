import React, { useState, useEffect } from 'react';
import './App.css';
import GoogleAuth from './steps/one-google-auth/GoogleAuth';
import PdfUpload from './steps/two-pdf-upload/PdfUpload';
import PdfParsing from './steps/three-pdf-parsing/PdfParsing';

const App = () => {
  const [currentStep, setCurrentStep] = useState(1); // this is weird
  const isAuthenticated = currentStep === 1;
  const hasPdfs = currentStep === 2;
  const isProcessingPdfs = currentStep === 3;

  return (
    <div className="App">
      {isAuthenticated && <GoogleAuth/>}
      {hasPdfs && <PdfUpload/>}
      {isProcessingPdfs && <PdfParsing/>}
    </div>
  );
}

export default App;
