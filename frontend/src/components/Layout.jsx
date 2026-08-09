import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Coffee } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Layout({ links, title, children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" dir="rtl">
      <aside className="md:w-64 w-full bg-brand-800 text-brand-50 flex md:flex-col justify-between md:min-h-screen p-4">
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <Coffee size={26} />
            <span className="font-bold text-lg">{title}</span>
          </div>
          <nav className="flex md:flex-col gap-1 flex-wrap">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-brand-500 text-white' : 'hover:bg-brand-700 text-brand-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-6 md:mt-0 px-2">
          <p className="text-xs text-brand-200 mb-2">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-brand-100 hover:text-white"
          >
            <LogOut size={16} /> تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-x-auto">{children}</main>
    </div>
  );
}
