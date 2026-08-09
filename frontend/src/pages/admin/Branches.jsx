import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import { adminLinks } from './links';
import { getBranches, createBranch, updateBranch, setBranchActive } from '../../api/endpoints';

export default function AdminBranches() {
  const queryClient = useQueryClient();
  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['branches'] });
  const createMutation = useMutation({ mutationFn: createBranch, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateBranch(id, data), onSuccess: invalidate });
  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }) => setBranchActive(id, isActive),
    onSuccess: invalidate,
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(branch) {
    setEditing(branch);
    setFormOpen(true);
  }

  return (
    <Layout links={adminLinks} title="لوحة تحكم HQ">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">الفروع</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> فرع جديد
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{b.name}</h3>
                <button
                  onClick={() => activeMutation.mutate({ id: b.id, isActive: !b.isActive })}
                  className={`px-2 py-1 rounded-full text-xs ${
                    b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {b.isActive ? 'نشط' : 'معطل'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{b.location || '-'}</p>
              <button
                onClick={() => openEdit(b)}
                className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
              >
                <Pencil size={14} /> تعديل
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <BranchFormModal
          branch={editing}
          onClose={() => setFormOpen(false)}
          onSubmit={(data) => {
            if (editing) updateMutation.mutate({ id: editing.id, data });
            else createMutation.mutate(data);
            setFormOpen(false);
          }}
        />
      )}
    </Layout>
  );
}

function BranchFormModal({ branch, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: branch?.name || '', location: branch?.location || '' });

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Modal title={branch ? 'تعديل فرع' : 'فرع جديد'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">اسم الفرع</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الموقع</label>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">
            إلغاء
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-brand-500 hover:bg-brand-600 text-white">
            حفظ
          </button>
        </div>
      </form>
    </Modal>
  );
}
