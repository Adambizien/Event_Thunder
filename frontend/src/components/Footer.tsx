import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-thunder-navy border-t-2 border-thunder-gold mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-4">
          {/* Brand Section */}
          <div className="flex flex-col">
            <div className="mb-4">
              <Logo size="md" />
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
                <Link to="/events" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Événements
                </Link>
              </li>
              <li>
                <Link to="/subscription" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Abonnements
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
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-thunder-gold mb-4">Légal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-thunder-gold transition-colors text-sm">
                  RGPD et confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          {/* Bottom Footer */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              © {currentYear} Event Thunder. Tous droits réservés.
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link to="/terms" className="hover:text-thunder-gold transition-colors">
                CGU
              </Link>
              <Link to="/privacy" className="hover:text-thunder-gold transition-colors">
                RGPD
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;