import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const AdminLayout = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin', label: 'Tableau de bord' },
    { path: '/admin/plans', label: 'Gestion des plans' },
    { path: '/admin/events', label: "Gestion des événements" },
    { path: '/admin/social-posts', label: 'Gestion des posts' },
    { path: '/admin/event-categories', label: "Gestion des catégories" },
    {
      path: '/admin/subscription-transactions',
      label: 'Gestion des abonnements',
    },
    {
      path: '/admin/ticket-transactions',
      label: 'Gestion des tickets',
    },
    { path: '/admin/users', label: 'Gestion des utilisateurs' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy text-white">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-thunder-navy/70 px-4 py-3 backdrop-blur-lg md:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Ouvrir le menu admin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-gray-200">Interface Admin</div>
        <div className="h-9 w-9"></div>
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu admin"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-[130] bg-black/50 md:hidden"
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-[140] w-64 transform border-r border-white/10 bg-white/5 backdrop-blur-lg transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col overflow-y-auto">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h1 className="font-bold text-thunder-gold">Admin</h1>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 md:hidden"
                aria-label="Fermer le menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 space-y-2 p-4">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center rounded-lg px-4 py-3 transition-all ${
                    isActive(item.path)
                      ? 'bg-thunder-gold text-[#ffb020] font-semibold'
                      : 'text-gray-200 hover:bg-white/10'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 md:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
