import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ION Launch render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="page-section legal-page">
        <div className="empty-state">
          Something went wrong while rendering this view.
          <Link className="button button-primary" to="/" onClick={() => this.setState({ hasError: false })}>
            Return home
          </Link>
        </div>
      </section>
    );
  }
}
