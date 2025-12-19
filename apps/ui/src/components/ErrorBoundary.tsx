import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <h1 className="text-3xl font-bold mb-4 text-red-400">⚠️ 组件错误</h1>
            <div className="bg-gray-800 p-6 rounded-lg border border-red-500/50 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">错误信息：</h2>
                <pre className="bg-black/50 p-4 rounded overflow-auto text-sm text-red-300">
                  {this.state.error?.toString()}
                </pre>
              </div>
              
              {this.state.errorInfo && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">错误堆栈：</h2>
                  <pre className="bg-black/50 p-4 rounded overflow-auto text-xs text-gray-400 max-h-96">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

