import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { buildApiUrl } from '@/lib/api';
import { isDevRuntime, isProdRuntime } from '@/lib/runtimeEnv';

const IS_PRODUCTION = isProdRuntime();
const IS_DEVELOPMENT = isDevRuntime();

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log to error tracking service
    this.logError(error, errorInfo);
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    if (!IS_PRODUCTION) return;

    const payload = {
      message: error.message,
      stack: error.stack ?? null,
      componentStack: errorInfo.componentStack ?? null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    try {
      void fetch(buildApiUrl('/api/telemetry/client-error'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Ignore telemetry failures.
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zaki-body p-6">
          <div className="max-w-md w-full bg-white rounded-zaki-2xl shadow-[0px_24px_60px_rgba(15,15,15,0.18)] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-zaki-primary mb-2">
              Something went wrong
            </h2>
            
            <p className="text-sm text-zaki-secondary mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {IS_DEVELOPMENT && this.state.error && (
              <div className="mb-6 p-4 bg-gray-50 rounded-zaki-xl text-left overflow-hidden">
                <p className="text-xs font-mono text-red-600 mb-2">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-zaki-secondary overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zaki-brand text-white rounded-zaki-xl font-medium text-sm hover:bg-zaki-brand-hover transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-4 py-2 bg-zaki-card text-zaki-primary rounded-zaki-xl font-medium text-sm hover:bg-zaki-card-hover transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error) => {
    console.error('[useErrorHandler]', error);
    // In production, send to error tracking
  };
}
