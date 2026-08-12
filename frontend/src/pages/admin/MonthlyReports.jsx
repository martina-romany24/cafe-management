import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download } from 'lucide-react';
import Layout from '../../components/Layout';
import { adminLinks } from './links';
import { getMonthlyReports } from '../../api/endpoints';
import { apiClient } from '../../api/client';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default function AdminMonthlyReports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['monthly-reports', month, year],
    queryFn: () => getMonthlyReports({ month, year }),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // Refetch every 3 seconds
  });

  async function handleExport(type) {
    const res = await apiClient.get(`/reports/export/${type}`, {
      params: { month, year },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${month}-${year}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Aggregate reports by branch to handle multiple entries
  const aggregatedReports = reports.reduce((acc, r) => {
    const branchName = r.branch.name;
    if (!acc[branchName]) {
      acc[branchName] = {
        branchName,
        totalSales: 0,
        baseCost: 0,
        branchProfit: 0,
        hqRevenue: 0,
        ordersCount: 0,
      };
    }
    acc[branchName].totalSales += Number(r.totalSales);
    acc[branchName].baseCost += Number(r.baseCost);
    acc[branchName].branchProfit += Number(r.branchProfit);
    acc[branchName].hqRevenue += Number(r.hqRevenue);
    acc[branchName].ordersCount += r.ordersCount;
    return acc;
  }, {});

  const aggregatedReportsArray = Object.values(aggregatedReports).map((r) => ({
    ...r,
    totalSales: Math.round(r.totalSales * 100) / 100,
    baseCost: Math.round(r.baseCost * 100) / 100,
    branchProfit: Math.round(r.branchProfit * 100) / 100,
    hqRevenue: Math.round(r.hqRevenue * 100) / 100,
  }));

  const chartData = aggregatedReportsArray.map((r) => ({
    branchName: r.branchName,
    branchProfit: r.branchProfit,
    hqRevenue: r.hqRevenue,
  }));

  return (
    <Layout links={adminLinks} title="لوحة تحكم HQ">
      <h1 className="text-2xl font-bold mb-6">التقارير الشهرية</h1>

      <div className="flex flex-wrap items-end gap-3 mb-6 bg-white p-4 rounded-xl shadow">
        <div>
          <label className="block text-xs font-medium mb-1">الشهر</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">السنة</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm w-24"
          />
        </div>
        <button
          onClick={() => handleExport('excel')}
          className="flex items-center gap-2 border border-brand-400 text-brand-600 px-4 py-2 rounded-lg text-sm hover:bg-brand-50"
        >
          <Download size={16} /> Excel
        </button>
        <button
          onClick={() => handleExport('pdf')}
          className="flex items-center gap-2 border border-brand-400 text-brand-600 px-4 py-2 rounded-lg text-sm hover:bg-brand-50"
        >
          <Download size={16} /> PDF
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-400">لا توجد تقارير لهذا الشهر بعد.</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-brand-800">
                <tr>
                  <th className="p-3 text-right">الفرع</th>
                  <th className="p-3 text-right">إجمالي المبيعات</th>
                  <th className="p-3 text-right">التكلفة الأساسية</th>
                  <th className="p-3 text-right">ربح الفرع</th>
                  <th className="p-3 text-right">نصيب الرئيسي</th>
                  <th className="p-3 text-right">عدد الطلبات</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedReportsArray.map((r, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 font-medium">{r.branchName}</td>
                    <td className="p-3">{r.totalSales.toFixed(2)}</td>
                    <td className="p-3">{r.baseCost.toFixed(2)}</td>
                    <td className="p-3 text-green-700">{r.branchProfit.toFixed(2)}</td>
                    <td className="p-3 text-brand-700">{r.hqRevenue.toFixed(2)}</td>
                    <td className="p-3">{r.ordersCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-4">ربح الفرع مقابل نصيب الرئيسي</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="branchName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="branchProfit" name="ربح الفرع" fill="#c9832c" radius={[6, 6, 0, 0]} />
                <Bar dataKey="hqRevenue" name="نصيب الرئيسي" fill="#5c3613" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Layout>
  );
}
