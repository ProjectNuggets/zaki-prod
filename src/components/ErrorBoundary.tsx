import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and prevent full app crashes
 * 
 * Wraps the entire app to provide graceful error handling.
 * Shows a user-friendly error screen instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-[#0f0b08] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#1a1410] border border-[#2a2420] rounded-2xl p-8 text-center">
            {/* Icon */}
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-[#D24430]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-[#efe6d9] mb-3">
              Something went wrong
            </h1>

            {/* Message */}
            <p className="text-[#c9b8a4] mb-6">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {/* Error details (only in development) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left bg-[#0f0b08] border border-[#2a2420] rounded-lg p-4">
                <summary className="text-sm font-medium text-[#D24430] cursor-pointer mb-2">
                  Error Details
                </summary>
                <div className="text-xs text-[#88735A] font-mono whitespace-pre-wrap overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <div className="mt-2 pt-2 border-t border-[#2a2420]">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-[#D24430] hover:bg-[#b33a2c] text-white font-medium rounded-xl transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2.5 bg-[#2a2420] hover:bg-[#3a3430] text-[#efe6d9] font-medium rounded-xl transition-colors"
              >
                Go Home
              </button>
            </div>

            {/* Help text */}
            <p className="mt-6 text-sm text-[#88735A]">
              If this problem persists, please{' '}
              <a
                href="mailto:support@zaki.ai"
                className="text-[#D24430] hover:underline"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
