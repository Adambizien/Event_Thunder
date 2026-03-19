import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/AuthServices';
import Logo from './Logo';
import type { User } from '../types/AuthTypes';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

const Header = ({ user, onLogout }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    await authService.logout();
    if (onLogout) onLogout();
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;
  const isEventsActive =
    location.pathname === '/events' || location.pathname.startsWith('/events/');
  const isSubscriptionHistoryActive = location.pathname === '/subscription-history';
  const isAdminActive =
    isActive('/admin') ||
    isActive('/admin/plans') ||
    isActive('/admin/subscription-transactions') ||
    isActive('/admin/users');
  const navItemClass = (active: boolean) =>
    `block font-semibold px-4 py-2 rounded-lg transition-all w-full md:w-auto text-left ${
      active
        ? 'bg-thunder-gold text-black'
        : 'text-white hover:text-white hover:bg-white/10'
    }`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="relative z-[100] bg-thunder-dark border-b-2 border-thunder-gold shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Logo/Brand */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Logo size="md" />
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 transition-colors"
          aria-expanded={isMobileMenuOpen}
          aria-label="Ouvrir le menu"
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-3 md:gap-6">
          {!user ? (
            <>
              <Link
                to="/"
                className={navItemClass(isActive('/'))}
              >
                Accueil
              </Link>
              <Link
                to="/subscription"
                className={navItemClass(isActive('/subscription'))}
              >
                Plans d’abonnement
              </Link>
              <Link
                to="/events"
                className={navItemClass(isEventsActive)}
              >
                Événements
              </Link>
              <Link
                to="/login"
                className={navItemClass(isActive('/login'))}
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className={navItemClass(isActive('/register'))}
              >
                S'inscrire
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/"
                className={navItemClass(isActive('/'))}
              >
                Accueil
              </Link>
              <Link
                to="/dashboard"
                className={navItemClass(isActive('/dashboard'))}
              >
                Tableau de bord
              </Link>
              <Link
                to="/subscription"
                className={navItemClass(isActive('/subscription'))}
              >
                Plans d’abonnement
              </Link>
              <Link
                to="/events"
                className={navItemClass(isEventsActive)}
              >
                Événements
              </Link>

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="hidden md:block text-sm text-white max-w-32 truncate">
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Mon compte'}
                  </span>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" />
                    </svg>
                  </span>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/30 bg-white/10 backdrop-blur-3xl backdrop-saturate-150 shadow-2xl overflow-hidden z-[120]">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-xs uppercase tracking-wide text-gray-400">Compte</p>
                      <p className="text-sm font-semibold text-thunder-gold truncate">
                        {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                      </p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={`block px-4 py-3 text-sm transition-colors ${
                        isActive('/profile') ? 'bg-thunder-gold text-black' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Mon profil
                    </Link>

                    <Link
                      to="/subscription-history"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={`block px-4 py-3 text-sm transition-colors ${
                        isSubscriptionHistoryActive ? 'bg-thunder-gold text-black' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Mes abonnements
                    </Link>

                    {user.role === 'Admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className={`block px-4 py-3 text-sm transition-colors ${
                          isAdminActive ? 'bg-thunder-gold text-black' : 'text-white hover:bg-white/10'
                        }`}
                      >
                        Interface Admin
                      </Link>
                    )}

                    <div className="border-t border-white/10 p-2">
                      <button
                        onClick={handleLogout}
                          className="w-full text-left px-2 py-2 rounded-lg text-sm bg-red-500/35 hover:bg-red-500/45 text-red-100 transition-colors"
                      >
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/15 px-4 pb-4">
          <nav className="pt-3 flex flex-col gap-2">
            {!user ? (
              <>
                <Link to="/" className={navItemClass(isActive('/'))}>Accueil</Link>
                <Link to="/subscription" className={navItemClass(isActive('/subscription'))}>Plans d’abonnement</Link>
                <Link to="/events" className={navItemClass(isEventsActive)}>Événements</Link>
                <Link to="/login" className={navItemClass(isActive('/login'))}>Connexion</Link>
                <Link to="/register" className={navItemClass(isActive('/register'))}>S'inscrire</Link>
              </>
            ) : (
              <>
                <Link to="/" className={navItemClass(isActive('/'))}>Accueil</Link>
                <Link to="/dashboard" className={navItemClass(isActive('/dashboard'))}>Tableau de bord</Link>
                <Link to="/subscription" className={navItemClass(isActive('/subscription'))}>Plans d’abonnement</Link>
                <Link to="/events" className={navItemClass(isEventsActive)}>Événements</Link>

                <div className="mt-2 pt-3 border-t border-white/15">
                  <p className="px-4 pb-2 text-xs uppercase tracking-wide text-gray-300">Compte</p>
                  <Link to="/profile" className={navItemClass(isActive('/profile'))}>Mon profil</Link>
                  <Link to="/subscription-history" className={navItemClass(isSubscriptionHistoryActive)}>Mes abonnements</Link>
                  {user.role === 'Admin' && (
                    <Link to="/admin" className={navItemClass(isAdminActive)}>Interface Admin</Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full text-left font-semibold px-4 py-2 rounded-lg text-red-100 bg-red-500/35 hover:bg-red-500/45 transition-colors"
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;