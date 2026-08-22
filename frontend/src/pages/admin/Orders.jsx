import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import Layout from '../../components/Layout';
import { adminLinks } from './links';
import { getAllOrders, getBranches, deleteOrder } from '../../api/endpoints';

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => getAllOrders({}),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const queryClient = useQueryClient();

  const deleteOrderMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      Swal.fire({
        icon: 'success',
        title: 'تم الحذف',
        text: 'تم حذف الطلب بنجاح وتم إزالته من التقارير',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: error.response?.data?.message || 'حدث خطأ أثناء حذف الطلب',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  const handleDeleteOrder = async (orderId) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'هل أنت متأكد؟',
      text: 'سيتم حذف هذا الطلب نهائياً وسيتم إزالته من جميع التقارير. لا يمكن التراجع عن هذا الإجراء.',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (confirm.isConfirmed) {
      deleteOrderMutation.mutate(orderId);
    }
  };

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
                  <th className="text-right py-3 px-2">إجراءات</th>
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
                    <td className="py-3 px-2">
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={deleteOrderMutation.isPending}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="حذف الطلب"
                      >
                        <Trash2 size={16} />
                      </button>
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
