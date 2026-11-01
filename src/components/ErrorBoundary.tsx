import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Top-level guard so a render-time exception degrades into a recoverable
 * screen instead of a blank page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[liquid-obsidian] render failure', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0a0e18] text-[#dfe2f1] flex items-center justify-center p-6">
        <div className="liquid-glass rounded-2xl max-w-md w-full p-6 space-y-4 border border-[#ef4444]/30">
          <div className="flex items-center gap-2 text-[#ffb4ab]">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            <h1 className="text-base font-bold font-['Space_Grotesk']">Routing panic intercepted</h1>
          </div>
          <p className="text-xs font-mono text-[#b9cacb] break-words">
            The interface hit an unexpected state. Your saved configuration was not modified.
          </p>
          <pre className="text-[11px] font-mono text-[#849495] bg-[#070a12] border border-white/10 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {this.state.message}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00f2fe] text-slate-950 text-xs font-bold font-mono hover:bg-[#00f2fe]/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Reload interface
          </button>
        </div>
      </div>
    );
  }
}
