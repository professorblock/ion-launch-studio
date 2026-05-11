import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';

export function NotFoundPage() {
  return (
    <section className="page-section not-found-page">
      <div className="not-found-panel">
        <span className="eyebrow">404</span>
        <h1>This route is not live.</h1>
        <p>The launch floor is still here. Open discovery, start a token profile, or return to the main dashboard.</p>
        <div className="hero-actions">
          <Link className="button button-primary" to="/discover">
            <Search size={17} />
            Discover coins
          </Link>
          <Link className="button button-muted" to="/">
            <ArrowLeft size={17} />
            Back home
          </Link>
        </div>
      </div>
    </section>
  );
}
