import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import Layout from '../../components/Layout';
import { branchLinks } from './links';
import { getProducts, createOrder } from '../../api/endpoints';

export default function BranchPOS() {
  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const [cart, setCart] = useState({}); // { productId: quantity }
  const queryClient = useQueryClient();

  const orderMutation = useMutation({
    mutationFn: (items) => createOrder({ items }),
    onSuccess: () => {
      setCart({});
      Swal.fire({
        icon: 'success',
        title: 'تم الطلب',
        text: 'تم تسجيل الطلب بنجاح',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'فشل الطلب',
        text: error.response?.data?.message || 'حدث خطأ أثناء إتمام الطلب',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  function addToCart(productId) {
    setCart((c) => ({ ...c, [productId]: (c[productId] || 0) + 1 }));
  }

  function decrement(productId) {
    setCart((c) => {
      const next = { ...c };
      if (!next[productId]) return next;
      next[productId] -= 1;
      if (next[productId] <= 0) delete next[productId];
      return next;
    });
  }

  function removeItem(productId) {
    setCart((c) => {
      const next = { ...c };
      delete next[productId];
      return next;
    });
  }

  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return { productId, quantity, product };
    });
  }, [cart, products]);

  const total = cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  function handleCheckout() {
    if (cartItems.length === 0) return;
    orderMutation.mutate(cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })));
  }

  return (
    <Layout links={branchLinks} title="نقطة البيع" showNotifications={false}>
      <h1 className="text-2xl font-bold mb-6">نقطة البيع</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <p className="text-gray-400">جارِ التحميل...</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p.id)}
                  className="bg-white rounded-xl shadow p-4 text-right hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{p.category}</p>
                  <p className="text-brand-600 font-bold">{(p.price || 0).toFixed(2)} ج.م</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-4 h-fit sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={18} className="text-brand-600" />
            <h2 className="font-semibold">الطلب الحالي</h2>
          </div>

          {cartItems.length === 0 ? (
            <p className="text-gray-400 text-sm">لم يتم اختيار منتجات بعد</p>
          ) : (
            <ul className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <li key={item.productId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.product?.name}</p>
                    <p className="text-gray-400 text-xs">{(item.product?.price || 0).toFixed(2)} ج.م</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => decrement(item.productId)} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item.productId)} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.productId)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t pt-3 flex justify-between font-bold mb-4">
            <span>الإجمالي</span>
            <span>{total.toFixed(2)} ج.م</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || orderMutation.isPending}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            إتمام الطلب
          </button>
        </div>
      </div>
    </Layout>
  );
}
