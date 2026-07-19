"use client";

import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Erro capturado:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-coral/10 border border-coral/20 mb-6">
              <AlertCircle size={32} className="text-coral" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink-primary">
              Ops! Algo deu errado
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              O aplicativo encontrou um erro inesperado.
            </p>
            {this.state.error && (
              <div className="mt-4 p-4 rounded-xl bg-surface-raised border border-surface-border text-left">
                <p className="text-xs text-ink-muted font-mono break-all">
                  {this.state.error.message || "Erro desconhecido"}
                </p>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="mt-6 flex items-center gap-2 mx-auto px-6 py-3 rounded-full bg-ice text-void font-medium active:scale-[0.98] transition-all"
            >
              <RefreshCw size={16} />
              Tentar de novo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}