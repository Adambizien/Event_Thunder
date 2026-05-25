const TermsOfUse = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12 text-gray-200">
      <div className="mx-auto max-w-4xl space-y-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg md:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-thunder-gold">
            Document modèle
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Conditions générales d'utilisation
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Ces conditions sont fournies à titre de modèle pour Event Thunder et devront être
            validées par un professionnel avant toute utilisation officielle.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">1. Objet</h2>
          <p>
            Event Thunder propose une plateforme permettant de consulter, créer, gérer et promouvoir
            des événements, ainsi que de suivre des ventes de billets selon les fonctionnalités
            activées pour chaque compte.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">2. Accès au service</h2>
          <p>
            L'utilisateur s'engage à fournir des informations exactes lors de son inscription et à
            conserver la confidentialité de ses identifiants. Toute action réalisée depuis son compte
            est réputée effectuée par lui.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">3. Espace organisateur</h2>
          <p>
            Les organisateurs peuvent publier des événements, gérer leurs posts et suivre leurs
            transactions selon les limites prévues par leur plan d'abonnement. Event Thunder peut
            afficher un pourcentage prélevé sur les paiements de tickets selon le plan choisi.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">4. Comportements interdits</h2>
          <p>
            Il est interdit d'utiliser la plateforme pour publier des contenus illicites, frauduleux,
            trompeurs, discriminatoires ou portant atteinte aux droits de tiers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">5. Disponibilité</h2>
          <p>
            Event Thunder s'efforce de maintenir le service disponible, sans garantir une absence
            totale d'interruption, d'erreur ou de maintenance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">6. Responsabilité</h2>
          <p>
            Chaque organisateur reste responsable des événements, informations, tarifs, images et
            contenus qu'il publie. Event Thunder ne saurait être tenu responsable des informations
            fournies par les utilisateurs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">7. Modification des conditions</h2>
          <p>
            Event Thunder peut faire évoluer ces conditions afin de tenir compte des changements du
            service, de la réglementation ou de ses pratiques internes.
          </p>
        </section>
      </div>
    </main>
  );
};

export default TermsOfUse;