import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Coffee, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';

export default function Layout({ links, title, children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-brand-800 text-brand-50 p-4 flex items-center justify-between">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-brand-100 hover:text-white"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex items-center gap-2">
          <Coffee size={24} />
          <span className="font-bold">{title}</span>
        </div>
        <div className="w-6"></div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-brand-800 text-brand-50 p-4 flex flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'hover:bg-brand-700 text-brand-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="border-t border-brand-700 mt-2 pt-2">
            <p className="text-xs text-brand-200 mb-2 px-3">{user?.name}</p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-brand-100 hover:text-white px-3"
            >
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-brand-800 text-brand-50 flex-col justify-between min-h-screen p-4">
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <Coffee size={26} />
            <span className="font-bold text-lg">{title}</span>
          </div>
          <nav className="flex flex-col gap-1">
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
        <div className="mt-6 px-2">
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
