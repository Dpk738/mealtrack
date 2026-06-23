import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px 20px',
          color: '#ff5e62',
          backgroundColor: '#050505',
          minHeight: '100vh',
          fontFamily: 'Helvetica, Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#0c0c0e',
            border: '1px solid #1a1a1f',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#ff5e62' }}>
              Application Crash
            </h2>
            <p style={{ fontSize: '13px', color: '#e4e4e7', marginBottom: '16px', lineHeight: '1.4' }}>
              {this.state.error?.toString()}
            </p>
            <pre style={{
              fontSize: '10px',
              color: '#71717a',
              overflowX: 'auto',
              backgroundColor: '#050505',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #1a1a1f',
              textAlign: 'left',
              maxHeight: '150px',
              marginBottom: '16px'
            }}>
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#cbf600',
                color: '#050505',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
