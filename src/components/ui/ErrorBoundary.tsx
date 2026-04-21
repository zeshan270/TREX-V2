"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { HiExclamationTriangle, HiArrowPath } from "react-icons/hi2";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-[#181820] border border-red-500/20 rounded-2xl p-8 text-center">
              <HiExclamationTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-black text-white mb-2">Etwas ist schief gelaufen</h1>
              <p className="text-gray-400 text-sm mb-6">{this.state.error?.message || "Ein unerwarteter Fehler ist aufgetreten."}</p>
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all"
              >
                <HiArrowPath className="h-5 w-5" />
                Versuchen Sie es erneut
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for async error handling
export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      setError(event.message);
      setHasError(true);
    };

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      setError(event.reason?.message || "Unbehandelte Promise Rejection");
      setHasError(true);
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", unhandledRejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", unhandledRejectionHandler);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-[#181820] border border-red-500/20 rounded-2xl p-8 text-center">
            <HiExclamationTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white mb-2">Etwas ist schief gelaufen</h1>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => {
                setHasError(false);
                setError(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all"
            >
              <HiArrowPath className="h-5 w-5" />
              Versuchen Sie es erneut
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
