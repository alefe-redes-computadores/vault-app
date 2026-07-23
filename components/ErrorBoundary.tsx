"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🔴 ErrorBoundary capturou:", error);
    console.error("🔴 Stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-void flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface-raised rounded-2xl border border-coral/20 p-6 shadow-vault">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center flex-shrink-0">
                <span className="text-coral text-lg">⚠️</span>
              </div>
              <h2 className="font-display text-lg font-semibold text-ink-primary">
                Algo deu errado
              </h2>
            </div>
            
            <div className="bg-void/50 rounded-xl p-4 mb-4 overflow-auto max-h-[200px]">
              <p className="text-sm text-coral font-mono">
                {this.state.error?.message || "Erro desconhecido"}
              </p>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-ink-muted cursor-pointer">
                    Ver detalhes técnicos
                  </summary>
                  <pre className="text-xs text-ink-muted/60 mt-2 whitespace-pre-wrap break-words">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-ice text-void font-medium active:scale-95 transition-all"
            >
              Recarregar aplicativo
            </button>
            
            <p className="text-xs text-ink-muted/60 text-center mt-3">
              Se o problema persistir, entre em contato com o suporte
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}