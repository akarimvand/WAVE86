import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  onReset?: () => void;
  key?: React.Key;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error captured by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state?.hasError) {
      return (
        <div className="min-h-[350px] flex items-center justify-center p-6 my-8">
          <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">خطای غیرمنتظره در نمایش این بخش</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed dir-rtl">
                متأسفانه در پردازش داده‌های این صفحه خطایی رخ داده است. لطفاً مجدداً تلاش کنید یا به صفحه اصلی بازگردید.
              </p>
              {this.state.error?.message && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-3 text-right dir-ltr overflow-x-auto text-[11px] font-mono text-rose-700">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                تلاش مجدد و بارگذاری
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-200 active:scale-95"
              >
                <Home className="w-4 h-4" />
                صفحه اصلی
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
