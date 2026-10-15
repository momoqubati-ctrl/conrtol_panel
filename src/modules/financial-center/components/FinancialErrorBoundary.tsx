import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  correlationId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FinancialErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Financial UI Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', margin: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Financial Data Temporarily Unavailable</h2>
          <p style={{ marginTop: '0.5rem' }}>An error occurred while loading the financial interface.</p>
          {this.props.correlationId && (
            <p style={{ marginTop: '0.5rem', fontFamily: 'monospace' }}>
              Request ID: {this.props.correlationId}
            </p>
          )}
          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>Contact Operations Team</p>
        </div>
      );
    }

    return this.props.children;
  }
}
