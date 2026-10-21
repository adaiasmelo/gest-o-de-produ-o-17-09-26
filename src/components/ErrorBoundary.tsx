import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public props!: Props;
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };
  public setState!: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-red-200 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {this.props.fallbackTitle || 'Ocorreu um erro inesperado'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Detectamos uma inconsistência temporária nos dados desta visualização. Os dados do sistema continuam protegidos e seguros.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-left text-[11px] text-red-800 font-mono break-words max-h-32 overflow-y-auto">
                <span className="font-bold">Detalhe técnico:</span> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {this.props.onClose && (
                <button
                  type="button"
                  onClick={this.props.onClose}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <XCircle size={15} />
                  <span>Fechar</span>
                </button>
              )}
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={15} />
                <span>Tentar Novamente</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
