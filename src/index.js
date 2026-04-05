// CRA entry point — must live at src/index.js
// Forwards to the actual renderer entry
import React from 'react';
import ReactDOM from 'react-dom/client';
import './renderer/index.css';
import App from './renderer/App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
