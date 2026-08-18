import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { branchLinks } from './links';
import { getSalesSummary, getTopProducts } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

export default function BranchDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: summary } = useQuery({ queryKey: ['sales-summary'], queryFn: () => getSalesSummary({}) });
  const { data: topProducts = [] } = useQuery({ queryKey: ['top-products'], queryFn: () => getTopProducts({}) });

  return (
    <Layout links={branchLinks} title={user?.branch?.name || 'الفرع'} showNotifications={false}>
      <h1 className="text-2xl font-bold mb-6">نظرة عامة على فرعي</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">إجمالي المبيعات</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{summary?.totalSales?.toFixed(2) ?? '-'}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">عدد الطلبات</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{summary?.ordersCount ?? '-'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-4">المنتجات الأكثر مبيعًا</h2>
        {topProducts.length === 0 ? (
          <p className="text-gray-400 text-sm">لا توجد بيانات بعد</p>
        ) : (
          <ul className="space-y-2">
            {topProducts.map((p) => (
              <li key={p.productId} className="flex justify-between border-b py-2 text-sm">
                <span>{p.name}</span>
                <span className="text-gray-500">{p.quantity} قطعة</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
