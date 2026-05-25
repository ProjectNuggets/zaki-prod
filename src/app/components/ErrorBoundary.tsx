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
        <div className="zaki-v2-loading p-6">
          <div className="v2-modal max-w-md p-8 text-center">
            <div className="mx-auto mb-6 flex size-12 items-center justify-center border border-[var(--v2-accent-hairline)] bg-[var(--v2-danger-faint)] text-[var(--v2-danger)]">
              <AlertCircle className="size-6" />
            </div>
            
            <h2 className="v2-modal-title mb-3">
              Something went wrong
            </h2>
            
            <p className="v2-body-sm mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {IS_DEVELOPMENT && this.state.error && (
              <div className="mb-6 overflow-hidden border border-[var(--v2-hairline)] bg-[var(--v2-bg)] p-4 text-left">
                <p className="mb-2 font-mono text-xs text-[var(--v2-danger)]">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="max-h-32 overflow-auto text-xs text-[var(--v2-ink-2)]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="v2-btn v2-btn--accent"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="v2-btn"
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
