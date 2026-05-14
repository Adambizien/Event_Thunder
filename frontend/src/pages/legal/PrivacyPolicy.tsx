const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12 text-gray-200">
      <div className="mx-auto max-w-4xl space-y-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg md:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-thunder-gold">
            Document modèle
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Politique RGPD et confidentialité
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Cette politique est un modèle simplifié pour Event Thunder. Elle devra être adaptée et
            validée juridiquement avant une mise en production réelle.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">1. Données collectées</h2>
          <p>
            Event Thunder peut collecter les informations nécessaires à la création d'un compte, à la
            gestion du profil, à l'achat de tickets, à la création d'événements et à l'utilisation des
            fonctionnalités organisateur.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">2. Finalités</h2>
          <p>
            Les données sont utilisées pour fournir le service, gérer les comptes, traiter les
            transactions, sécuriser la plateforme, envoyer des notifications utiles et améliorer
            l'expérience utilisateur.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">3. Base légale</h2>
          <p>
            Les traitements reposent notamment sur l'exécution du contrat, l'intérêt légitime
            d'Event Thunder, le respect d'obligations légales ou le consentement lorsque celui-ci est
            requis.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">4. Conservation</h2>
          <p>
            Les données sont conservées pendant une durée proportionnée aux finalités poursuivies,
            puis supprimées ou anonymisées lorsque leur conservation n'est plus nécessaire.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">5. Partage des données</h2>
          <p>
            Certaines données peuvent être transmises à des prestataires techniques ou de paiement
            lorsque cela est nécessaire au fonctionnement de la plateforme. Event Thunder ne vend pas
            les données personnelles des utilisateurs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">6. Droits des utilisateurs</h2>
          <p>
            Conformément au RGPD, chaque utilisateur peut demander l'accès, la rectification,
            l'effacement, la limitation ou la portabilité de ses données, ainsi que s'opposer à
            certains traitements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-thunder-gold">7. Contact</h2>
          <p>
            Pour exercer vos droits ou poser une question sur les données personnelles, vous pouvez
            contacter Event Thunder à l'adresse support@eventthunder.com.
          </p>
        </section>
      </div>
    </main>
  );
};

export default PrivacyPolicy;