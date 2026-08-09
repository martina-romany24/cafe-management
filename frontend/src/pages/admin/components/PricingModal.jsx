import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../../components/Modal';
import { upsertProductPricing, previewPricing } from '../../../api/endpoints';

export default function PricingModal({ product, branches, onClose }) {
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const queryClient = useQueryClient();

  const existing = product.branchPricing.find((bp) => bp.branchId === selectedBranchId);

  const [marginType, setMarginType] = useState(existing?.marginType || 'fixed');
  const [marginValue, setMarginValue] = useState(existing ? Number(existing.marginValue) : '');
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const bp = product.branchPricing.find((x) => x.branchId === selectedBranchId);
    setMarginType(bp?.marginType || 'fixed');
    setMarginValue(bp ? Number(bp.marginValue) : '');
    setSaved(false);
  }, [selectedBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live preview: debounce calls to the backend preview endpoint
  useEffect(() => {
    if (marginValue === '' || marginValue === null) {
      setPreview(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const result = await previewPricing({
          basePrice: Number(product.basePrice),
          marginType,
          marginValue: marginType === 'percentage' ? Number(marginValue) / 100 : Number(marginValue),
        });
        setPreview(result);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [marginType, marginValue, product.basePrice]);

  const mutation = useMutation({
    mutationFn: () =>
      upsertProductPricing(product.id, {
        branchId: selectedBranchId,
        marginType,
        marginValue: marginType === 'percentage' ? Number(marginValue) / 100 : Number(marginValue),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSaved(true);
    },
  });

  return (
    <Modal title={`هامش الربح - ${product.name}`} onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">الفرع</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">نوع الهامش</label>
            <select
              value={marginType}
              onChange={(e) => setMarginType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="fixed">قيمة ثابتة (جنيه)</option>
              <option value="percentage">نسبة مئوية (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              القيمة {marginType === 'percentage' ? '(%)' : '(جنيه)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={marginValue}
              onChange={(e) => setMarginValue(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder={marginType === 'percentage' ? 'مثال: 20' : 'مثال: 10'}
            />
          </div>
        </div>

        <div className="bg-brand-50 rounded-lg p-4 text-sm space-y-1">
          <p className="font-medium text-brand-800 mb-2">معاينة فورية</p>
          <Row label="السعر الأساسي" value={Number(product.basePrice).toFixed(2)} />
          <Row label="السعر النهائي للفرع" value={preview ? preview.finalPrice.toFixed(2) : '-'} highlight />
          <Row label="ربح الفرع لكل قطعة" value={preview ? preview.branchProfitPerUnit.toFixed(2) : '-'} />
        </div>

        {saved && <p className="text-green-600 text-sm">تم الحفظ بنجاح ✓</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">
            إغلاق
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={marginValue === '' || mutation.isPending}
            className="px-4 py-2 rounded-lg text-sm bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50"
          >
            حفظ الهامش
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? 'font-bold text-brand-700' : ''}>{value}</span>
    </div>
  );
}
