import React from 'react';
import { Flame, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.removeItem('romancha_v5_stories');
    localStorage.removeItem('romancha_v5_user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d0714] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#180e22] border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 p-0.5 mx-auto shadow-lg shadow-rose-600/40">
              <div className="w-full h-full bg-[#140b1c] rounded-[14px] flex items-center justify-center">
                <Flame className="w-8 h-8 text-rose-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-cinzel text-white">Romancha Recovery</h1>
              <p className="text-xs text-rose-200/70 font-serif leading-relaxed">
                A temporary script issue occurred. Tap below to refresh and load the full romantic collection with default settings.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/50 rounded-xl border border-rose-900/40 text-left text-[11px] text-rose-300 font-mono overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white shadow-lg shadow-rose-600/40 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset & Reload Romancha</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
