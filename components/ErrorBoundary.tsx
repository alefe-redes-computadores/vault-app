"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
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
        <div className="flex min-h-screen items-center justify-center bg-void p-4">
          <div className="w-full max-w-md rounded-[28px] border border-coral/20 bg-surface p-6 shadow-vault">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral/12">
                <AlertTriangle size={20} className="text-coral" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  Algo deu errado
                </h2>
                <p className="text-xs text-ink-muted">
                  O app encontrou um problema inesperado
                </p>
              </div>
            </div>

            <div className="mb-4 max-h-[220px] overflow-auto rounded-[20px] border border-surface-border/50 bg-void/45 p-4">
              <p className="font-mono text-sm text-coral">
                {this.state.error?.message || "Erro desconhecido"}
              </p>

              {this.state.errorInfo && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-ink-muted">
                    Ver detalhes técnicos
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-ink-muted/60">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-2xl bg-ice py-2.5 text-sm font-medium text-void transition-all active:scale-95"
            >
              Recarregar aplicativo
            </button>

            <p className="mt-3 text-center text-xs text-ink-muted/60">
              Se o problema persistir, entre em contato com o suporte
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}