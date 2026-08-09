import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { adminLinks } from './links';
import { getAllOrders, getBranches } from '../../api/endpoints';

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => getAllOrders({}),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });

  return (
    <Layout links={adminLinks} title="لوحة تحكم HQ">
      <h1 className="text-2xl font-bold mb-6">جميع الطلبات</h1>

      <div className="bg-white rounded-xl shadow p-4">
        {isLoading ? (
          <p className="text-gray-400">جارِ التحميل...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-400">لا توجد طلبات بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-2">رقم الطلب</th>
                  <th className="text-right py-3 px-2">الفرع</th>
                  <th className="text-right py-3 px-2">المستخدم</th>
                  <th className="text-right py-3 px-2">المنتجات</th>
                  <th className="text-right py-3 px-2">الإجمالي</th>
                  <th className="text-right py-3 px-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                    <td className="py-3 px-2">{order.branch?.name}</td>
                    <td className="py-3 px-2">{order.user?.name}</td>
                    <td className="py-3 px-2">
                      <div className="max-w-xs">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-xs">
                            {item.product?.name} × {item.quantity}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-bold">{order.totalAmount.toFixed(2)} ج.م</td>
                    <td className="py-3 px-2 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
