import { Component, type ReactNode } from "react";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="error-page">
        <h1>PropertyIQ could not display this view.</h1>
        <p>
          Reload to recover. Analyses explicitly saved in this browser remain
          available. Unsaved changes may be lost.
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload PropertyIQ
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
