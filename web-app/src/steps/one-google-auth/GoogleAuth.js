import React, { useState, useEffect } from 'react';
import './GoogleAuth.scss';
import axios from 'axios';
import ShareGuide from '../../assets/images/share-email.JPG';

const GoogleAuth = (props) => {
  const { setCurrentStep, shareEmailAddress, setShareEmailAddress, spreadsheetId, setSpreadsheetId } = props;

  const saveInfo = () => {
    axios.post(`${process.env.REACT_APP_API_BASE}/save-spreadsheet-id`, {
      spreadsheetId
    })
      .then((res) => {
        if (res.status === 201) {
          setCurrentStep(2);
        }
      })
      .catch((err) => {
        console.log(err);
        alert('Failed to save your spreadsheet id');
      });
  }

  const loadingMsg = <h1>Loading...</h1>;
  const authPrompt = <>
    <h1>Google Spreadsheet Auth</h1>
    <h2>Go to your Google Spreadsheet which you would like to write the PDF data into and share your PDF to this email address: {shareEmailAddress}</h2>
    <h2>Make sure to keep the role as Editor on the right side</h2>
    <img src={ShareGuide} alt={"Google Spreadsheet share prompt"} width="100%" height="auto" />
    <h2>Then enter your spreadsheet id (string between /d/ and /edit in url) below:</h2>
    <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="sheet id"/>
    <button type="button" onClick={() => saveInfo()}>Save Info</button>
  </>;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE}/get-share-email`)
      .then((res) => {
        if (res.status === 200) {
          setShareEmailAddress(res.data?.sharedEmail);
          setSpreadsheetId(res.data?.spreadsheetId);
          if (res.data?.spreadsheetId) {
            setCurrentStep(2);
          }
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return <div className="App__google-auth">
    {!shareEmailAddress && loadingMsg}
    {shareEmailAddress && authPrompt}
  </div>;
}

export default GoogleAuth;
