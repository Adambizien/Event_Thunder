import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const Home = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-thunder-gold/20 blur-3xl" />
        <div className="absolute top-1/3 left-[-15%] h-72 w-72 rounded-full bg-thunder-orange/15 blur-[110px]" />
        <div className="absolute bottom-[-8%] right-1/4 h-80 w-80 rounded-full bg-thunder-yellow/10 blur-[120px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-left">
            <div className="mb-6 flex items-center gap-3">
              <Logo size="md" />
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.2em] text-gray-200">
                Plateforme tout-en-un
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black leading-tight">
              <span >Event</span>{' '}
              <span className="text-[#ffb020]">Thunder</span>
              <br />
              La solution ultime pour vos événements
            </h1>

            <p className="mt-5 text-lg md:text-xl text-gray-300">
              Créez, pilotez et analysez vos événements avec une interface élégante et rapide. De la création à la billetterie, puis à la communication, tout est intégré.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10"
              >
                Commencer maintenant
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-thunder-gold" />
                1 000+ organisateurs actifs
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-thunder-yellow" />
                99,9% de disponibilité
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Fonctionnalités</p>
              <h2 className="text-4xl font-black text-thunder-yellow">Un cockpit complet</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="card p-7 transition-all hover:-translate-y-1 hover:border-white/30">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-thunder-gold/20 text-thunder-gold">01</div>
              <h3 className="text-xl font-bold text-white mb-2">Création éclair</h3>
              <p className="text-gray-300">Des templates modulables pour lancer une expérience de marque en quelques minutes.</p>
            </div>

            <div className="card p-7 transition-all hover:-translate-y-1 hover:border-white/30">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-thunder-yellow/20 text-thunder-yellow">02</div>
              <h3 className="text-xl font-bold text-white mb-2">Parcours invités</h3>
              <p className="text-gray-300">RSVP, relances et check-in en un seul flux synchronisé, sans friction.</p>
            </div>

            <div className="card p-7 transition-all hover:-translate-y-1 hover:border-white/30">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-thunder-orange/20 text-thunder-orange">03</div>
              <h3 className="text-xl font-bold text-white mb-2">Analyse instantanée</h3>
              <p className="text-gray-300">Suivez le ROI, les ventes et l'engagement en temps réel, sans exporter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative pb-20 px-4">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          <div className="card p-8 text-center">
            <p className="text-5xl font-bold text-thunder-gold mb-2">1K+</p>
            <p className="text-gray-400">Organisateurs actifs</p>
          </div>
          <div className="card p-8 text-center">
            <p className="text-5xl font-bold text-thunder-yellow mb-2">5K+</p>
            <p className="text-gray-400">Événements créés</p>
          </div>
          <div className="card p-8 text-center">
            <p className="text-5xl font-bold text-thunder-orange mb-2">99.9%</p>
            <p className="text-gray-400">Disponibilité</p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center card p-10 md:p-12">
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-thunder-yellow">Prêt à démarrer</h2>
          <p className="mt-4 text-gray-300">Rejoignez des milliers d'utilisateurs qui transforment leurs événements en expériences mémorables.</p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10"
          >
            Créer un compte gratuitement
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
