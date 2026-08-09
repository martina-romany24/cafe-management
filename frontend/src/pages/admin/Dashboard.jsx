import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../../components/Layout';
import { adminLinks } from './links';
import { getAdminReport, getBranches } from '../../api/endpoints';

export default function AdminDashboard() {
  const { data: report = [], isLoading } = useQuery({
    queryKey: ['admin-report'],
    queryFn: () => getAdminReport({}),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });

  const totalSales = report.reduce((s, r) => s + r.totalSales, 0);
  const totalHq = report.reduce((s, r) => s + r.hqRevenue, 0);
  const totalOrders = report.reduce((s, r) => s + r.ordersCount, 0);

  return (
    <Layout links={adminLinks} title="لوحة تحكم HQ">
      <h1 className="text-2xl font-bold mb-6">نظرة عامة</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="إجمالي المبيعات (كل الفروع)" value={totalSales.toFixed(2)} />
        <StatCard label="نصيب الرئيسي" value={totalHq.toFixed(2)} />
        <StatCard label="عدد الطلبات" value={totalOrders} />
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-8">
        <h2 className="font-semibold mb-4">مقارنة الفروع: ربح الفرع مقابل نصيب الرئيسي</h2>
        {isLoading ? (
          <p className="text-gray-400">جارِ التحميل...</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={report}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="branchName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="branchProfit" name="ربح الفرع" fill="#c9832c" radius={[6, 6, 0, 0]} />
              <Bar dataKey="hqRevenue" name="نصيب الرئيسي" fill="#5c3613" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-4">الفروع النشطة</h2>
        <ul className="space-y-2">
          {branches.map((b) => (
            <li key={b.id} className="flex justify-between border-b py-2 text-sm">
              <span>{b.name}</span>
              <span className={b.isActive ? 'text-green-600' : 'text-red-500'}>
                {b.isActive ? 'نشط' : 'معطل'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-brand-700 mt-1">{value}</p>
    </div>
  );
}
