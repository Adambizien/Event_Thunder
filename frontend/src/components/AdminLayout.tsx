import { Link, Outlet, useLocation } from 'react-router-dom';

const AdminLayout = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Tableau de bord' },
    { path: '/admin/plans', label: 'Gestion des plans' },
    { path: '/admin/events', label: "Création d'événements" },
    { path: '/admin/event-categories', label: "Catégories d'événements" },
    {
      path: '/admin/subscription-transactions',
      label: 'Transactions abonnements',
    },
    {
      path: '/admin/ticket-transactions',
      label: 'Transactions tickets',
    },
    { path: '/admin/users', label: 'Liste des utilisateurs' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 bg-white/5 backdrop-blur-lg">
        <aside className="sticky top-0 h-screen flex flex-col overflow-y-auto">
        {/* Header Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h1 className="font-bold text-thunder-gold">Admin</h1>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? 'bg-thunder-gold text-black font-semibold'
                  : 'text-gray-200 hover:bg-white/10'
              }`}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;