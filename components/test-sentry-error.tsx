// Test component to verify Sentry + GlitchTip integration
'use client';

import React from 'react';

export default function TestSentryError() {
  const handleGenericError = () => {
    throw new Error("Generic Error Message from Cards");
  };

  const handleAsyncError = async () => {
    try {
      // Simulate an async operation that fails
      await fetch('https://api.example.com/nonexistent');
    } catch (error) {
      throw new Error("Async Error from Cards");
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Sentry + GlitchTip Test</h2>
      <p>Click these buttons to test error reporting to GlitchTip:</p>
      
      <button
        onClick={handleGenericError}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px',
          margin: '10px 0',
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Generic Error Message
      </button>
      
      <button
        onClick={handleAsyncError}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px',
          margin: '10px 0',
          backgroundColor: '#ff8800',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Async Error
      </button>
      
      <button
        onClick={() => {
          // Test a warning level error
          console.warn('This is a warning from Cards');
          // You can also use Sentry directly if needed
          if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureMessage('Test message from Cards', 'info');
          }
        }}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px',
          margin: '10px 0',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Message
      </button>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <small>
          Check your GlitchTip dashboard at <a href="https://errors.raydoug.com" target="_blank" rel="noopener noreferrer">errors.raydoug.com</a> to see these errors.
        </small>
      </div>
    </div>
  );
}
