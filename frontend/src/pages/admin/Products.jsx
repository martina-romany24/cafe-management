import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { adminLinks } from './links';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductActive,
  getBranches,
} from '../../api/endpoints';
import ProductFormModal from './components/ProductFormModal';
import PricingModal from './components/PricingModal';

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [pricingProduct, setPricingProduct] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] });

  const createMutation = useMutation({ mutationFn: createProduct, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: deleteProduct, onSuccess: invalidate });
  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }) => setProductActive(id, isActive),
    onSuccess: invalidate,
  });

  function openCreate() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function openEdit(product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function handleSubmitForm(data) {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
    setFormOpen(false);
  }

  return (
    <Layout links={adminLinks} title="لوحة تحكم HQ">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">المنتجات والأسعار</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> منتج جديد
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand-800">
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">التصنيف</th>
                <th className="p-3 text-right">السعر الأساسي</th>
                <th className="p-3 text-right">نسبة المكسب الافتراضية</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-gray-500">{p.category || '-'}</td>
                  <td className="p-3">{Number(p.basePrice).toFixed(2)}</td>
                  <td className="p-3">
                    {p.marginType === 'percentage' 
                      ? `${(p.defaultMargin * 100).toFixed(1)}%` 
                      : `${p.defaultMargin} ج.م`}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        title="تعديل"
                        className="p-1.5 rounded hover:bg-brand-50 text-brand-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(p.id)}
                        title="حذف (تعطيل)"
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmitForm}
        />
      )}

      {pricingProduct && (
        <PricingModal
          product={pricingProduct}
          branches={branches}
          onClose={() => setPricingProduct(null)}
        />
      )}
    </Layout>
  );
}
