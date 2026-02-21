import { Link, useLocation, useNavigate } from 'react-router-dom';
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

  const handleLogout = () => {
    authService.logout();
    if (onLogout) onLogout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-thunder-dark border-b-2 border-thunder-gold shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Logo size="md" />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          {!user ? (
            <>
              <Link
                to="/"
                className={`font-semibold transition-colors ${
                  isActive('/') 
                    ? 'text-thunder-gold' 
                    : 'text-gray-100 hover:text-thunder-gold'
                }`}
              >
                Accueil
              </Link>
              <Link
                to="/login"
                className={`font-semibold transition-colors ${
                  isActive('/login') 
                    ? 'text-thunder-gold' 
                    : 'text-gray-100 hover:text-thunder-gold'
                }`}
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className={`font-semibold px-4 py-2 rounded-lg transition-all ${
                  isActive('/register')
                    ? 'bg-thunder-gold text-black'
                    : 'bg-thunder-gold text-black hover:bg-thunder-orange'
                }`}
              >
                S'inscrire
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 border-r border-gray-600 pr-6">
                <div className="text-right">
                  <p className="text-sm text-gray-300">Bienvenue</p>
                  <p className="font-semibold text-thunder-gold">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</p>
                </div>
              </div>
              <Link
                to="/dashboard"
                className={`font-semibold transition-colors ${
                  isActive('/dashboard') 
                    ? 'text-thunder-gold' 
                    : 'text-gray-100 hover:text-thunder-gold'
                }`}
              >
                Tableau de bord
              </Link>
              {user.role === 'Admin' && (
                <Link
                  to="/admin"
                  className={`font-semibold px-4 py-2 rounded-lg transition-all ${
                    isActive('/admin') || isActive('/admin/plans') || isActive('/admin/users')
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-700 text-white hover:bg-purple-600'
                  }`}
                >
                  Interface Admin
                </Link>
              )}
              <Link
                to="/profile"
                className={`font-semibold transition-colors ${
                  isActive('/profile') 
                    ? 'text-thunder-gold' 
                    : 'text-gray-100 hover:text-thunder-gold'
                }`}
              >
                Mon Profil
              </Link>
              <button
                onClick={handleLogout}
                className="font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Se déconnecter
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
