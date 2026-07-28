import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { withTranslation } from 'react-i18next';
import type { WithTranslation } from 'react-i18next';
import { logger } from '../services/logger';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif', padding: 20, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💇</div>
            <h1 style={{ color: 'var(--primary)', fontSize: 24, margin: '0 0 8px' }}>{t('app.errorBoundary.title')}</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>{t('app.errorBoundary.description')}</p>
            <a href="/" style={{ display: 'inline-block', background: 'var(--primary)', color: 'var(--text-dark)', padding: '10px 24px', borderRadius: 30, fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>{t('app.errorBoundary.goHome')}</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
