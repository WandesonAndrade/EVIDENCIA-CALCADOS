import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Capturado erro de execução em componente:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-center space-y-4 max-w-2xl mx-auto my-6 backdrop-blur-xl animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 mx-auto flex items-center justify-center shadow-lg">
            <AlertTriangle className="h-7 w-7 text-rose-500 animate-pulse" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              {this.props.fallbackTitle || 'Ocorreu um erro no carregamento deste módulo'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {this.state.error?.message || 'Falha temporária de renderização. Suas informações no banco de dados estão seguras.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 mx-auto cursor-pointer shadow-md"
            >
              <RefreshCw className="h-4 w-4 text-amber-400" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
