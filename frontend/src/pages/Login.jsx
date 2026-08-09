import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Loader2 } from 'lucide-react';
import { loginRequest } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await loginRequest(email, password);
      login(token, user);
      navigate(user.role === 'admin' ? '/admin' : '/branch');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand-500 text-white rounded-full p-3 mb-3">
            <Coffee size={28} />
          </div>
          <h1 className="text-xl font-bold text-brand-800">نظام إدارة الكافيه</h1>
          <p className="text-sm text-gray-500 mt-1">تسجيل الدخول للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="admin@cafe.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            دخول
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-400 text-center leading-6">
          حساب تجريبي (Admin): admin@cafe.com / Password123!<br />
          حساب مدير فرع: manager1@cafe.com / Password123!
        </div>
      </div>
    </div>
  );
}
