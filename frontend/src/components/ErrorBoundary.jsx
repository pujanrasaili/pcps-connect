import { Component } from "react";
import { FaExclamationTriangle, FaHome, FaRedo } from "react-icons/fa";
import shield from "../assets/images/pcps-shield.png";

// Catches render-time errors anywhere below it in the tree so a bug in one
// page shows a friendly fallback instead of a blank white screen. Must be a
// class component -- React only supports error boundaries via
// getDerivedStateFromError/componentDidCatch, there's no hook equivalent.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Logged to the browser console so it's still visible for debugging,
    // even though there's no error-tracking service wired up yet.
    console.error("Uncaught error in app tree:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <img
          src={shield}
          alt=""
          className="h-24 w-auto opacity-80 animate-tilt-idle"
          style={{ transformStyle: "preserve-3d" }}
        />
        <FaExclamationTriangle className="mt-6 text-3xl text-amber-500" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
          An unexpected error occurred. Try reloading the page -- if it keeps
          happening, let us know through the contact page.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-4">
          <button onClick={this.handleReload} className="btn-primary">
            <FaRedo /> Reload page
          </button>
          <button onClick={this.handleGoHome} className="btn-outline">
            <FaHome /> Back to home
          </button>
        </div>
      </div>
    );
  }
}
