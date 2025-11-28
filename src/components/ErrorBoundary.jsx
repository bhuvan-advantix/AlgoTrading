import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <div className="bg-gray-900 rounded p-4 border border-gray-700">
              <p className="text-gray-300 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              {import.meta.env.DEV && (
                <pre className="text-xs text-gray-400 overflow-auto max-h-40">
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-teal-600 text-white rounded py-2 hover:bg-teal-700"
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

export default ErrorBoundary;