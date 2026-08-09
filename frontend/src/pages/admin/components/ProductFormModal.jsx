import { useState } from 'react';
import Modal from '../../../components/Modal';

export default function ProductFormModal({ product, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    basePrice: product ? Number(product.basePrice) : '',
    category: product?.category || '',
    defaultMargin: product ? Number(product.defaultMargin) : 0.2,
    marginType: product?.marginType || 'percentage',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'marginType') {
      // Reset defaultMargin to a sensible default when margin type changes
      const newDefaultMargin = value === 'percentage' ? 0.2 : 10;
      setForm((f) => ({ ...f, [name]: value, defaultMargin: newDefaultMargin }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      name: form.name,
      description: form.description || undefined,
      basePrice: Number(form.basePrice),
      category: form.category || undefined,
      defaultMargin: Number(form.defaultMargin),
      marginType: form.marginType,
    });
  }

  return (
    <Modal title={product ? 'تعديل منتج' : 'منتج جديد'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">اسم المنتج</label>
          <input
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الوصف</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">السعر الأساسي</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="basePrice"
              required
              value={form.basePrice}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">التصنيف</label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              {form.marginType === 'percentage' ? 'نسبة المكسب الافتراضية' : 'مبلغ المكسب الافتراضي'}
            </label>
            <input
              type="number"
              step={form.marginType === 'percentage' ? "0.01" : "1"}
              min="0"
              name="defaultMargin"
              required
              value={form.defaultMargin}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نوع المكسب</label>
            <select
              name="marginType"
              value={form.marginType}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="percentage">نسبة مئوية (%)</option>
              <option value="fixed">مبلغ ثابت (ج.م)</option>
            </select>
          </div>
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
