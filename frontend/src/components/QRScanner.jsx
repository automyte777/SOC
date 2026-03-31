import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScan, onError }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    // Initialize scanner
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        // Success callback
        html5QrcodeScanner.clear();
        onScan(decodedText);
      },
      (error) => {
        // Error callback (called very frequently on every frame where QR not found)
        if (onError) onError(error);
      }
    );

    // Cleanup when component unmounts
    return () => {
      html5QrcodeScanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [onScan, onError]);

  return (
    <div className="w-full">
      <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-slate-200"></div>
    </div>
  );
};

export default QRScanner;
