import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy text-white">
      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Logo Display */}
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-thunder-gold">EVENT</span>
            <br />
            <span className="text-thunder-yellow">THUNDER</span>
          </h1>
          
          <p className="text-2xl md:text-3xl text-gray-300 mb-4">⚡ Gère tes événements avec la puissance de la foudre</p>
          
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Plateforme complète de gestion d'événements. Crée, organise et gère tes événements en quelques clics.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link
              to="/register"
              className="px-8 py-4 bg-thunder-gold text-black font-bold text-lg rounded-lg hover:bg-thunder-orange transition-all transform hover:scale-105"
            >
              Commencer Maintenant
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-thunder-gold text-thunder-gold font-bold text-lg rounded-lg hover:bg-thunder-gold/10 transition-all"
            >
              Se Connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-16 text-thunder-yellow">Fonctionnalités</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-8">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Création Facile</h3>
              <p className="text-gray-600">Crée tes événements en quelques secondes avec notre interface intuitive et simple d'utilisation.</p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Gestion des Participants</h3>
              <p className="text-gray-600">Invite des participants, suit les RSVPs et gère les présences simplement.</p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Rapide & Fiable</h3>
              <p className="text-gray-600">Infrastructure robuste et performante pour vos événements les plus importants.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-5xl font-bold text-thunder-gold mb-2">1K+</p>
              <p className="text-gray-400">Utilisateurs actifs</p>
            </div>
            <div className="text-center">
              <p className="text-5xl font-bold text-thunder-yellow mb-2">5K+</p>
              <p className="text-gray-400">Événements créés</p>
            </div>
            <div className="text-center">
              <p className="text-5xl font-bold text-thunder-orange mb-2">99.9%</p>
              <p className="text-gray-400">Disponibilité</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="pb-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-thunder-yellow mb-6">Prêt à démarrer ?</h2>
          <p className="text-gray-300 mb-8">Rejoins des milliers d'utilisateurs qui utilisent Event Thunder pour gérer leurs événements.</p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-thunder-gold text-black font-bold text-lg rounded-lg hover:bg-thunder-orange transition-all transform hover:scale-105"
          >
            Créer un Compte Gratuitement
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
