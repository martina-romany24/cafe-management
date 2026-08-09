import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import { adminLinks } from './links';
import { getUsers, createUser, setUserActive, getBranches } from '../../api/endpoints';

export default function AdminManagers() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const [formOpen, setFormOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  const createMutation = useMutation({ mutationFn: createUser, onSuccess: invalidate });
  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }) => setUserActive(id, isActive),
    onSuccess: invalidate,
  });

  const managers = users.filter((u) => u.role === 'branch_manager');
  const admins = users.filter((u) => u.role === 'admin');

  return (
    <Layout links={adminLinks} title="لوحة تحكم HQ">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">مدراء الفروع</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> حساب جديد
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand-800">
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">البريد الإلكتروني</th>
                <th className="p-3 text-right">الفرع</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-gray-500">{u.email}</td>
                  <td className="p-3">{u.branch?.name || '-'}</td>
                  <td className="p-3">
                    <button
                      onClick={() => activeMutation.mutate({ id: u.id, isActive: !u.isActive })}
                      className={`px-2 py-1 rounded-full text-xs ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {u.isActive ? 'نشط' : 'معطل'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-2 text-sm text-gray-600">حسابات الرئيسي (Admin)</h2>
        <ul className="text-sm space-y-1">
          {admins.map((a) => (
            <li key={a.id} className="text-gray-500">{a.name} — {a.email}</li>
          ))}
        </ul>
      </div>

      {formOpen && (
        <ManagerFormModal
          branches={branches}
          onClose={() => setFormOpen(false)}
          onSubmit={(data) => {
            createMutation.mutate(data);
            setFormOpen(false);
          }}
        />
      )}
    </Layout>
  );
}

function ManagerFormModal({ branches, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', branchId: branches[0]?.id || '' });

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, role: 'branch_manager' });
  }

  return (
    <Modal title="حساب مدير فرع جديد" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">الاسم</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">كلمة المرور</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الفرع</label>
          <select
            value={form.branchId}
            onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">
            إلغاء
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-brand-500 hover:bg-brand-600 text-white">
            إنشاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
