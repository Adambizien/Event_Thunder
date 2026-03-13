import type { User } from '../types/AuthTypes';

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {;
  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-12 pt-8">
          <h2 className="text-4xl font-black text-thunder-yellow mb-3">
            Bienvenue sur votre Tableau de Bord!
          </h2>
          <p className="text-xl text-gray-300">Vous êtes maintenant connecté</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Profile Card */}
          <div className="lg:col-span-2 card p-8">
            <h3 className="text-2xl font-bold text-white mb-6 pb-3 border-b border-white/10">
              Informations de Profil
            </h3>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="font-semibold text-gray-300">Email</span>
                <span className="text-gray-300 font-mono">{user.email}</span>
              </div>

              {/* Full Name */}
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="font-semibold text-gray-300">Nom Complet</span>
                <span className="text-gray-300">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</span>
              </div>

              {/* Phone Number */}
              
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="font-semibold text-gray-300">Téléphone</span>
                <span className="text-gray-300">{user.phoneNumber || 'Vous n\'avez pas renseigné de numéro de téléphone, modifiez votre profil pour en ajouter un.'}</span>
              </div>
             
              {/* Role */}
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="font-semibold text-gray-300">Rôle</span>
                <span className="text-gray-300">{user.role || ''}</span>
              </div>

              {/* Plan */}
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="font-semibold text-gray-300">Plan</span>
                <span className="text-gray-300">{user.planId || ''}</span>
              </div>

              
            </div>
          </div>

          {/* Avatar Card */}
          <div className="card p-8 flex flex-col items-center justify-center text-center">
            <>
              <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                <span className="text-lg font-semibold text-white">Profil</span>
              </div>
              <p className="text-sm text-gray-300">Profil</p>
            </>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 text-center">
            <p className="text-4xl font-bold text-thunder-gold mb-2">01</p>
            <p className="font-semibold text-white">Rapide</p>
            <p className="text-sm text-gray-300">Accès instantané</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-4xl font-bold text-thunder-yellow mb-2">02</p>
            <p className="font-semibold text-white">Sécurisé</p>
            <p className="text-sm text-gray-300">Vos données protégées</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-4xl font-bold text-thunder-orange mb-2">03</p>
            <p className="font-semibold text-white">Vérifié</p>
            <p className="text-sm text-gray-300">Compte confirmé</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;