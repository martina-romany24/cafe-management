import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { branchLinks } from './links';
import { getSalesSummary } from '../../api/endpoints';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function BranchReports() {
  const [range, setRange] = useState('today'); // today | week | month

  const { from, to } = useMemoRange(range);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['sales-summary', range],
    queryFn: () => getSalesSummary({ from: from.toISOString(), to: to.toISOString() }),
  });

  return (
    <Layout links={branchLinks} title="تقاريري" showNotifications={false}>
      <h1 className="text-2xl font-bold mb-6">تقارير المبيعات</h1>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'today', label: 'اليوم' },
          { key: 'week', label: 'هذا الأسبوع' },
          { key: 'month', label: 'هذا الشهر' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`px-4 py-2 rounded-lg text-sm ${
              range === opt.key ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 shadow'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">{summary?.totalSales?.toFixed(2) ?? '-'} ج.م</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">عدد الطلبات</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">{summary?.ordersCount ?? '-'}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        * تفاصيل الأرباح ونصيب الرئيسي متاحة فقط لحساب الرئيسي (Admin).
      </p>
    </Layout>
  );
}

function useMemoRange(range) {
  const now = new Date();
  if (range === 'today') {
    return { from: startOfDay(now), to: now };
  }
  if (range === 'week') {
    const day = now.getDay();
    const from = new Date(now);
    from.setDate(now.getDate() - day);
    return { from: startOfDay(from), to: now };
  }
  // month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now };
}
