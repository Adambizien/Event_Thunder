import { Link, Outlet, useLocation } from 'react-router-dom';

const AdminLayout = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Tableau de bord', icon: '📊' },
    { path: '/admin/plans', label: 'Gestion des plans', icon: '📋' },
    {
      path: '/admin/subscription-transactions',
      label: 'Transactions abonnements',
      icon: '💳',
    },
    { path: '/admin/users', label: 'Liste des utilisateurs', icon: '👥' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-thunder-dark">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-700">
        <aside className="sticky top-0 h-screen flex flex-col overflow-y-auto">
        {/* Header Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h1 className="font-bold text-thunder-gold">Admin</h1>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? 'bg-thunder-gold text-black font-semibold'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
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