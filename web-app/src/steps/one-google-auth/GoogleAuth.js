import React, { useState, useEffect } from 'react';
import './GoogleAuth.css';
import axios from 'axios';

const GoogleAuth = () => {
  const [shareEmailAddress, setShareEmailAddress] = useState(null);

  const loadingMsg = <h1>Loading...</h1>;
  const authPrompt = <>
    <h1>Google Spreadsheet Auth</h1>
    <h2>Go to your Google Spreadsheet which you would like to write the PDF data into and share your PDF to this email address: {shareEmailAddress}</h2>
  </>;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE}/get-share-email`)
      .then((res) => {
        if (res.status === 200) {
          console.log(res.data);
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
