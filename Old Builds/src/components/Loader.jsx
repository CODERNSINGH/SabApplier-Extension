import React from 'react';
import './Loader.css';

export default function Loader({ message }) {
  return (
    <div className="loader-overlay">
      <div className="loader-box">
        <div className="loader-spinner" />
        <div className="loader-message">{message}</div>
      </div>
    </div>
  );
}
