import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Github, Menu, Send, X } from 'lucide-react';
import { useState } from 'react';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';
import { IonLogo } from '../brand/IonLogo';

const navItems = [
  { label: 'Discover', to: '/discover' },
  { label: 'Launch', to: '/launch' },
  { label: 'Portfolio', to: '/desk' },
];

const secondaryItems = [
  { label: 'Creator studio', to: '/studio' },
  { label: 'Burn board', to: '/burn' },
  { label: 'Docs', to: '/docs' },
  { label: 'Status', to: '/status' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="ION Launch home" onClick={() => setMobileOpen(false)}>
          <IonLogo />
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <ConnectWalletButton />

        <button className="mobile-menu-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </header>

      {mobileOpen ? (
        <div className="mobile-drawer">
          <div className="mobile-drawer-top">
            <IonLogo />
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          <nav>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            {secondaryItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ConnectWalletButton />
        </div>
      ) : null}

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <IonLogo />
            <p>
              The community-built launch studio for Ice Open Network culture, tokens, and on-chain market formation.
            </p>
          </div>
          <div className="footer-group">
            <strong>Product</strong>
            <Link to="/discover">Discover</Link>
            <Link to="/launch">Launch</Link>
            <Link to="/desk">Portfolio</Link>
            <Link to="/studio">Creator studio</Link>
          </div>
          <div className="footer-group">
            <strong>Resources</strong>
            <Link to="/info">How it works</Link>
            <Link to="/fee-policy">Fee policy</Link>
            <Link to="/burn">Burn board</Link>
            <Link to="/status">Platform status</Link>
            <Link to="/readiness">Readiness</Link>
            <Link to="/risk">Risk notes</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
          <div className="footer-group">
            <strong>Community</strong>
            <a href="https://ice.io" target="_blank" rel="noreferrer">Ice Open Network</a>
            <a href="https://t.me/iceblockchain" target="_blank" rel="noreferrer">Telegram</a>
            <a href="https://x.com/ice_blockchain" target="_blank" rel="noreferrer">X / Twitter</a>
          </div>
        </div>
        <div className="sub-footer">
          <span>© 2026 ION Hub. All rights reserved.</span>
          <span>
            A community platform for <a href="https://ice.io" target="_blank" rel="noreferrer">Ice Open Network</a>
          </span>
          <div className="social-row">
            <a href="https://t.me/iceblockchain" target="_blank" rel="noreferrer" aria-label="Telegram">
              <Send size={15} />
            </a>
            <a href="https://github.com/professorblock" target="_blank" rel="noreferrer" aria-label="GitHub">
              <Github size={15} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
