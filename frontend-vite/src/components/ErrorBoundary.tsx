import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#120c0c', color: '#94a3b8', fontFamily: 'Outfit, sans-serif', padding: 20, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💇</div>
            <h1 style={{ color: '#c8827d', fontSize: 24, margin: '0 0 8px' }}>Algo salió mal</h1>
            <p style={{ color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>Ocurrió un error inesperado. Recargá la página o volvé al inicio.</p>
            <a href="/" style={{ display: 'inline-block', background: '#c8827d', color: '#0a0a0c', padding: '10px 24px', borderRadius: 30, fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>Volver al inicio</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
