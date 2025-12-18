import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-thunder-navy border-t-2 border-thunder-gold mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="flex flex-col">
            <div className="mb-4">
              <Logo size="sm" />
            </div>
            <p className="text-gray-400 text-sm">
              La plateforme pour gérer vos événements avec foudre et précision.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-bold text-thunder-gold mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Connexion
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  S'inscrire
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-thunder-gold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@eventthunder.com" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-thunder-gold mb-4">Légal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Conditions d'utilisation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Politique de confidentialité
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          {/* Bottom Footer */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              © {currentYear} Event Thunder. Tous droits réservés.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-gray-400 hover:text-thunder-gold transition-colors"
                aria-label="Twitter"
              >
                𝕏
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-thunder-gold transition-colors"
                aria-label="GitHub"
              >
                ⚙️
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-thunder-gold transition-colors"
                aria-label="LinkedIn"
              >
                💼
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
