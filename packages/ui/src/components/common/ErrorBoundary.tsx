import React, { Component, ReactNode } from 'react';
import { LocaleContext, type LocaleContextValue } from '@notion-clipper/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  static contextType = LocaleContext;
  declare context: LocaleContextValue;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    // TODO: Envoyer à un service de monitoring (Sentry)
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.context;

      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('errors.errorOccurred')}
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || t('errors.unknownError')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {t('errors.reloadApp')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}