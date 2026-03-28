"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component with Turkish UI.
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in development; in production this could be sent to
    // an error tracking service like Sentry.
    console.error("[ErrorBoundary] Yakalanan hata:", error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">
              Bir hata olustu
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Beklenmeyen bir hata meydana geldi. Lutfen tekrar deneyiniz.
              Sorun devam ederse yonetici ile iletisime geciniz.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-3 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Hata detaylari
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-3 text-xs">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tekrar Dene
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
