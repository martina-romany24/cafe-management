import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Clock, ArrowRight, Check, X, Plus, Minus, Trash2, ShoppingCart, Plus as AddIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import Layout from '../../components/Layout';
import { adminLinks } from './links';
import { getTables, getAvailableTables, createTableOrder, getOrderByTable, splitBill, transferOrder, addItemsToOrder, getProducts, createTable, unassignTableBranch, getBranches } from '../../api/endpoints';

export default function Tables() {
  const { data: tables = [], isLoading } = useQuery({ queryKey: ['tables'], queryFn: () => getTables({}) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const selectedTable = tables.find(t => t.id === selectedTableId);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedItems, setSelectedItems] = useState({}); // { [itemId]: quantity }
  const [selectedTransferItems, setSelectedTransferItems] = useState({}); // { [itemId]: quantity }
  const [selectAllTransfer, setSelectAllTransfer] = useState(false);
  const [cart, setCart] = useState({});
  const [showProducts, setShowProducts] = useState(false);
  const queryClient = useQueryClient();

  const tableOrderMutation = useMutation({
    mutationFn: ({ tableId, items, branchId }) => createTableOrder({ tableId, items, branchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setCart({});
      setShowProducts(false);
      Swal.fire({
        icon: 'success',
        title: 'تم إنشاء الطلب',
        text: 'تم إنشاء طلب للترابيزة بنجاح',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'حدث خطأ';
      const errors = error.response?.data?.errors;
      let fullMessage = errorMessage;

      if (errors) {
        const errorDetails = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        fullMessage = `${errorMessage}\n\n${errorDetails}`;
      }

      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: fullMessage,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  const splitBillMutation = useMutation({
    mutationFn: ({ orderId, items }) => splitBill(orderId, { items }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setShowSplitBill(false);
      setSelectedItems({});
      Swal.fire({
        icon: 'success',
        title: 'تم الحساب',
        text: `الإجمالي المحسوب: ${data.splitTotal} ج.م`,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
      if (data.allPaid) {
        setSelectedTableId(null);
      }
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: error.response?.data?.message || 'حدث خطأ',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  const transferMutation = useMutation({
    mutationFn: ({ orderId, fromTableId, toTableId, items }) => transferOrder(orderId, { fromTableId, toTableId, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setShowTransfer(false);
      setSelectedTransferItems({});
      setSelectAllTransfer(false);
      Swal.fire({
        icon: 'success',
        title: 'تم النقل',
        text: 'تم نقل المنتجات المحددة للترابيزة الجديدة',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
      setSelectedTableId(null);
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: error.response?.data?.message || 'حدث خطأ',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  const addItemsMutation = useMutation({
    mutationFn: ({ orderId, items }) => addItemsToOrder(orderId, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setCart({});
      setShowProducts(false);
      Swal.fire({
        icon: 'success',
        title: 'تمت الإضافة',
        text: 'تمت إضافة المنتجات للطلب بنجاح',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'حدث خطأ';
      const errors = error.response?.data?.errors;
      let fullMessage = errorMessage;

      if (errors) {
        const errorDetails = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        fullMessage = `${errorMessage}\n\n${errorDetails}`;
      }

      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: fullMessage,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  const createTableMutation = useMutation({
    mutationFn: createTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      Swal.fire({
        icon: 'success',
        title: 'تم الإضافة',
        text: 'تمت إضافة الترابيزة بنجاح',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: error.response?.data?.message || 'حدث خطأ',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  const unassignTableBranchMutation = useMutation({
    mutationFn: (tableId) => unassignTableBranch(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      Swal.fire({
        icon: 'success',
        title: 'تم فك الربط',
        text: 'الترابيزة بقت مستقلة عن الفرع',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
      setSelectedTableId(null);
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: error.response?.data?.message || 'حدث خطأ',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700 border-green-300';
      case 'occupied': return 'bg-red-100 text-red-700 border-red-300';
      case 'reserved': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'فاضية';
      case 'occupied': return 'مشغولة';
      case 'reserved': return 'محجوزة';
      default: return status;
    }
  };

  const handleTableClick = (table) => {
    setSelectedTableId(table.id);
    setShowSplitBill(false);
    setShowTransfer(false);
    setSelectedItems({});
    setSelectedTransferItems({});
    setSelectAllTransfer(false);
    setShowProducts(false);
    setCart({});
  };

  const handleStartOrder = () => {
    if (!selectedTable) return;
    setShowProducts(true);
  };

  const handleAddToCart = (productId) => {
    setCart((c) => ({ ...c, [String(productId)]: (c[String(productId)] || 0) + 1 }));
  };

  const handleDecrement = (productId) => {
    setCart((c) => {
      const next = { ...c };
      const key = String(productId);
      if (!next[key]) return next;
      next[key] -= 1;
      if (next[key] <= 0) delete next[key];
      return next;
    });
  };

  const handleRemoveItem = (productId) => {
    setCart((c) => {
      const next = { ...c };
      delete next[String(productId)];
      return next;
    });
  };

  const handleAddItemsToOrder = () => {
    if (!selectedTable?.order) return;
    const cartItems = Object.entries(cart).map(([productId, quantity]) => ({
      productId,
      quantity: Number(quantity)
    }));
    if (cartItems.length === 0) return;

    // Validate that all products exist
    const invalidProducts = cartItems.filter(item => !products.find(p => p.id === item.productId));
    if (invalidProducts.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'فشل',
        text: `بعض المنتجات غير موجودة: ${invalidProducts.map(i => i.productId).join(', ')}`,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    addItemsMutation.mutate({ orderId: selectedTable.order.id, items: cartItems });
  };

  const handleCreateOrderFromCart = () => {
    if (!selectedTable) return;
    const cartItems = Object.entries(cart).map(([productId, quantity]) => ({
      productId,
      quantity: Number(quantity)
    }));
    if (cartItems.length === 0) return;
    tableOrderMutation.mutate({ tableId: selectedTable.id, items: cartItems, branchId: selectedTable.branchId });
  };

  const handleAddTable = async () => {
    const branchSelectOptions = ['<option value="">بدون فرع</option>']
      .concat(branches.map((b) => `<option value="${b.id}">${b.name}</option>`))
      .join('');

    const { value: formValues } = await Swal.fire({
      title: 'إضافة ترابيزة جديدة',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="رقم الترابيزة" type="number">' +
        '<input id="swal-input2" class="swal2-input" placeholder="السعة" type="number">' +
        `<select id="swal-input3" class="swal2-select">${branchSelectOptions}</select>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      preConfirm: () => {
        const number = document.getElementById('swal-input1').value;
        const capacity = document.getElementById('swal-input2').value;
        const branchId = document.getElementById('swal-input3').value || undefined;

        if (!number || !capacity) {
          Swal.showValidationMessage('يرجى ملء جميع الحقول');
          return false;
        }

        return { number: parseInt(number), capacity: parseInt(capacity), branchId };
      }
    });

    if (formValues) {
      createTableMutation.mutate(formValues);
    }
  };

  // Pays the entire table's order at once: every item's full remaining
  // quantity is sent to splitBill in one call, which marks everything as
  // paid and (since allPaid becomes true) automatically closes the order
  // and frees the table.
  const handleFullCheckout = async () => {
    if (!selectedTable?.order) return;

    const itemsToPay = (selectedTable.order.items || [])
      .map((item) => ({ itemId: item.id, quantity: item.quantity - item.paidQuantity }))
      .filter((item) => item.quantity > 0);

    if (itemsToPay.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'لا يوجد شيء لحسابه',
        text: 'كل الأصناف في هذا الطلب محسوبة بالفعل',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'حساب الترابيزة بالكامل؟',
      text: 'هيتم حساب كل الأصناف المتبقية وإغلاق الطلب وتفضية الترابيزة.',
      showCancelButton: true,
      confirmButtonText: 'نعم، احسب الكل',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    });

    if (confirm.isConfirmed) {
      splitBillMutation.mutate({
        orderId: selectedTable.order.id,
        items: itemsToPay
      });
    }
  };

  const handleSplitBill = () => {
    const itemIds = Object.keys(selectedItems);
    if (itemIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'تحذير',
        text: 'يرجى اختيار صنف واحد على الأقل',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }
    splitBillMutation.mutate({
      orderId: selectedTable.order.id,
      items: itemIds.map((itemId) => ({ itemId, quantity: selectedItems[itemId] }))
    });
  };

  const handleTransfer = async () => {
    const itemIds = Object.keys(selectedTransferItems);
    if (itemIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'تحذير',
        text: 'يرجى اختيار صنف واحد على الأقل للنقل (حدد من قائمة الأصناف فوق)',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    // Table options for the destination select. NOTE: SweetAlert2's
    // `input: 'select'` renders a native <select>, and a native <option>
    // cannot contain nested HTML (divs/spans) — the browser just shows the
    // raw tags as text. Plain-text labels only.
    const tableOptions = tables
      .filter(t => t.id !== selectedTable.id)
      .reduce((acc, t) => {
        const statusText = t.status === 'available' ? 'فاضية' : t.status === 'occupied' ? 'مشغولة' : 'محجوزة';
        acc[t.id] = `# ${t.number} — ${statusText}`;
        return acc;
      }, {});

    if (Object.keys(tableOptions).length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'تحذير',
        text: 'لا توجد ترابيزات متاحة للنقل',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    const { value: toTableId } = await Swal.fire({
      title: 'اختر الترابيزة للنقل',
      text: 'جميع الترابيزات المتاحة (فاضية ومشغولة)',
      input: 'select',
      inputOptions: tableOptions,
      inputPlaceholder: 'اختر الترابيزة',
      showCancelButton: true,
      confirmButtonText: 'نقل',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444'
    });

    if (toTableId) {
      transferMutation.mutate({
        orderId: selectedTable.order.id,
        fromTableId: selectedTable.id,
        toTableId,
        items: itemIds.map((itemId) => ({ itemId, quantity: selectedTransferItems[itemId] }))
      });
    }
  };

  // Toggle an item in/out of the split-bill selection. When newly selected, it
  // defaults to the item's full remaining (unpaid) quantity.
  const toggleItemSelection = (itemId, maxQuantity) => {
    setSelectedItems(prev => {
      if (itemId in prev) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: maxQuantity };
    });
  };

  // Clamp the chosen split quantity to [1, maxQuantity].
  const setSplitItemQuantity = (itemId, quantity, maxQuantity) => {
    const clamped = Math.max(1, Math.min(Number(quantity) || 1, maxQuantity));
    setSelectedItems(prev => ({ ...prev, [itemId]: clamped }));
  };

  // Toggle an item in/out of the transfer selection. When newly selected, it
  // defaults to the item's full remaining (unpaid) quantity.
  const toggleTransferItemSelection = (itemId, maxQuantity) => {
    setSelectedTransferItems(prev => {
      if (itemId in prev) {
        const next = { ...prev };
        delete next[itemId];
        setSelectAllTransfer(false);
        return next;
      }
      const next = { ...prev, [itemId]: maxQuantity };
      // Check if all items are now selected
      if (selectedTable?.order) {
        const allItemsCount = selectedTable.order.items?.filter(item => {
          const remaining = item.quantity - item.paidQuantity;
          return remaining > 0;
        }).length || 0;
        if (Object.keys(next).length === allItemsCount) {
          setSelectAllTransfer(true);
        }
      }
      return next;
    });
  };

  // Clamp the chosen transfer quantity to [1, maxQuantity].
  const setTransferItemQuantity = (itemId, quantity, maxQuantity) => {
    const clamped = Math.max(1, Math.min(Number(quantity) || 1, maxQuantity));
    if (clamped !== maxQuantity) {
      setSelectAllTransfer(false);
    }
    setSelectedTransferItems(prev => ({ ...prev, [itemId]: clamped }));
  };

  // Handle select all transfer items
  const handleSelectAllTransfer = () => {
    if (!selectedTable?.order) return;
    
    if (selectAllTransfer) {
      // Deselect all
      setSelectedTransferItems({});
      setSelectAllTransfer(false);
    } else {
      // Select all items with their full remaining quantities
      const allItems = {};
      selectedTable.order.items?.forEach((item) => {
        const remainingQuantity = item.quantity - item.paidQuantity;
        if (remainingQuantity > 0) {
          allItems[item.id] = remainingQuantity;
        }
      });
      setSelectedTransferItems(allItems);
      setSelectAllTransfer(true);
    }
  };

  if (isLoading) {
    return (
      <Layout links={adminLinks} title="الترابيزات">
        <p className="text-gray-400">جارِ التحميل...</p>
      </Layout>
    );
  }

  return (
    <Layout links={adminLinks} title="الترابيزات">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة الترابيزات</h1>
        <button
          onClick={handleAddTable}
          disabled={createTableMutation.isPending}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
        >
          <AddIcon size={20} />
          إضافة ترابيزة
        </button>
      </div>

      {!selectedTable ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`relative bg-white rounded-xl shadow p-4 text-right hover:shadow-lg hover:-translate-y-1 transition-all border-2 ${getStatusColor(table.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">#{table.number}</span>
                <Users size={20} />
              </div>
              <p className="text-sm font-medium">{getStatusText(table.status)}</p>
              <p className="text-xs opacity-75">سعة: {table.capacity} أشخاص</p>
              <p className="text-xs text-brand-600 font-medium">{table.branch?.name || 'بدون فرع'}</p>
              {table.order && (
                <div className="mt-2 pt-2 border-t border-current opacity-75">
                  <p className="text-xs font-semibold">
                    الإجمالي: {(Number(table.order.totalAmount) || 0).toFixed(2)} ج.م
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      ) : showProducts ? (
        <div className="space-y-6">
          <button
            onClick={() => setShowProducts(false)}
            className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-2"
          >
            <ArrowRight size={20} className="rotate-180" />
            العودة للترابيزة #{selectedTable.number}
          </button>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAddToCart(p.id)}
                    className="bg-white rounded-xl shadow p-4 text-right hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-gray-400 mb-2">{p.category}</p>
                    <p className="text-brand-600 font-bold">{(Number(p.basePrice) || 0).toFixed(2)} ج.م</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4 h-fit sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart size={18} className="text-brand-600" />
                <h2 className="font-semibold">الطلب الحالي</h2>
              </div>

              {Object.keys(cart).length === 0 ? (
                <p className="text-gray-400 text-sm">لم يتم اختيار منتجات بعد</p>
              ) : (
                <ul className="space-y-3 mb-4">
                  {Object.entries(cart).map(([productId, quantity]) => {
                    const product = products.find((p) => p.id === productId);
                    return (
                      <li key={productId} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{product?.name}</p>
                          <p className="text-gray-400 text-xs">{(Number(product?.basePrice) || 0).toFixed(2)} ج.م</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDecrement(productId)} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center">{quantity}</span>
                          <button onClick={() => handleAddToCart(productId)} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                            <Plus size={12} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-t pt-3 flex justify-between font-bold mb-4">
                <span>الإجمالي</span>
                <span>
                  {Object.entries(cart).reduce((sum, [productId, quantity]) => {
                    const product = products.find((p) => p.id === productId);
                    return sum + (Number(product?.basePrice) || 0) * quantity;
                  }, 0).toFixed(2)} ج.م
                </span>
              </div>

              <button
                onClick={selectedTable?.order ? handleAddItemsToOrder : handleCreateOrderFromCart}
                disabled={Object.keys(cart).length === 0 || tableOrderMutation.isPending || addItemsMutation.isPending}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
              >
                {selectedTable?.order ? 'إضافة للطلب' : 'إنشاء طلب'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedTableId(null)}
            className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-2"
          >
            <ArrowRight size={20} className="rotate-180" />
            العودة للترابيزات
          </button>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">ترابيزة #{selectedTable.number}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTable.status)}`}>
                {getStatusText(selectedTable.status)}
              </span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{selectedTable.branch?.name || 'بدون فرع'}</p>
              {selectedTable.branchId && (
                <button
                  onClick={async () => {
                    const confirm = await Swal.fire({
                      icon: 'warning',
                      title: 'فك الربط بالفرع؟',
                      text: 'الترابيزة هتبقى مستقلة تمامًا عن الفرع، ومش هتظهر في تقاريره تاني.',
                      showCancelButton: true,
                      confirmButtonText: 'نعم، افصل',
                      cancelButtonText: 'إلغاء',
                      confirmButtonColor: '#ef4444',
                      cancelButtonColor: '#6b7280'
                    });
                    if (confirm.isConfirmed) {
                      unassignTableBranchMutation.mutate(selectedTable.id);
                    }
                  }}
                  disabled={unassignTableBranchMutation.isPending || !!selectedTable.order}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  title={selectedTable.order ? 'قفل أو انقل الطلب النشط أولاً' : ''}
                >
                  فك الربط بالفرع
                </button>
              )}
            </div>

            {showSplitBill && (
              <p className="text-sm text-brand-600 bg-brand-50 border border-brand-200 rounded-lg p-3 mb-4">
                حدد الأصناف اللي عايز تحسبها بالضغط على المربع ✓ جنب كل صنف. لو الصنف عدده أكتر من واحد، تقدر تحدد أي كمية منه عن طريق الرقم اللي بيظهر تحته.
              </p>
            )}

            {showTransfer && (
              <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                حدد الأصناف اللي عايز تنقلها بالضغط على المربع ✓ جنب كل صنف. لو الصنف عدده أكتر من واحد، تقدر تحدد أي كمية منه عن طريق الرقم اللي بيظهر تحته.
              </p>
            )}

            {selectedTable.order ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">الأصناف المطلوبة</h3>
                  {showTransfer && (
                    <div className="flex items-center gap-2 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectAllTransfer}
                          onChange={handleSelectAllTransfer}
                          className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium">حدد الكل</span>
                      </label>
                    </div>
                  )}
                  <ul className="space-y-2">
                    {selectedTable.order.items?.map((item) => {
                      const remainingQuantity = item.quantity - item.paidQuantity;
                      const isFullyPaid = remainingQuantity <= 0;
                      const isChecked = showSplitBill
                        ? item.id in selectedItems
                        : showTransfer
                          ? item.id in selectedTransferItems
                          : false;
                      return (
                        <li
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded ${isFullyPaid ? 'bg-gray-50 opacity-50' : 'bg-gray-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            {(showSplitBill || showTransfer) && !isFullyPaid && (
                              <button
                                onClick={() => showSplitBill ? toggleItemSelection(item.id, remainingQuantity) : toggleTransferItemSelection(item.id, remainingQuantity)}
                                className={`p-1 rounded ${isChecked ? 'bg-brand-500 text-white' : 'bg-gray-200'}`}
                              >
                                {isChecked ? <Check size={16} /> : <div className="w-4 h-4" />}
                              </button>
                            )}
                            <div>
                              <p className="font-medium">{item.product?.name}</p>
                              <p className="text-sm text-gray-500">
                                {item.quantity} × {(Number(item.priceAtSale) || 0).toFixed(2)} ج.م
                              </p>
                              {item.paidQuantity > 0 && (
                                <p className="text-xs text-green-600">
                                  تم حساب {item.paidQuantity} / {item.quantity}
                                </p>
                              )}
                              {showSplitBill && isChecked && remainingQuantity > 1 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">الكمية المحسوبة:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={remainingQuantity}
                                    value={selectedItems[item.id]}
                                    onChange={(e) => setSplitItemQuantity(item.id, e.target.value, remainingQuantity)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-16 border rounded px-2 py-0.5 text-sm"
                                  />
                                  <span className="text-xs text-gray-400">من {remainingQuantity}</span>
                                </div>
                              )}
                              {showTransfer && isChecked && remainingQuantity > 1 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">الكمية المنقولة:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={remainingQuantity}
                                    value={selectedTransferItems[item.id]}
                                    onChange={(e) => setTransferItemQuantity(item.id, e.target.value, remainingQuantity)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-16 border rounded px-2 py-0.5 text-sm"
                                  />
                                  <span className="text-xs text-gray-400">من {remainingQuantity}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="font-semibold">
                            {((Number(item.priceAtSale) || 0) * remainingQuantity).toFixed(2)} ج.م
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>الإجمالي المتبقي</span>
                  <span>
                    {selectedTable.order.items?.reduce((sum, item) => {
                      const remaining = item.quantity - item.paidQuantity;
                      return sum + (Number(item.priceAtSale) || 0) * Math.max(0, remaining);
                    }, 0).toFixed(2)} ج.م
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowProducts(true)}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium"
                  >
                    إضافة منتجات
                  </button>
                  <button
                    onClick={handleFullCheckout}
                    disabled={splitBillMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                  >
                    حساب الترابيزة
                  </button>
                  <div className="flex gap-3">
                    {!showSplitBill ? (
                      <button
                        onClick={() => setShowSplitBill(true)}
                        className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium"
                      >
                        تقسيم الحساب
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSplitBill}
                          disabled={splitBillMutation.isPending}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                        >
                          حساب المحدد
                        </button>
                        <button
                          onClick={() => { setShowSplitBill(false); setSelectedItems({}); }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg py-2 font-medium"
                        >
                          إلغاء
                        </button>
                      </>
                    )}
                    {!showTransfer ? (
                      <button
                        onClick={() => setShowTransfer(true)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 font-medium"
                      >
                        نقل الطلب
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleTransfer}
                          disabled={transferMutation.isPending}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                        >
                          نقل المحدد
                        </button>
                        <button
                          onClick={() => { setShowTransfer(false); setSelectedTransferItems({}); setSelectAllTransfer(false); }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg py-2 font-medium"
                        >
                          إلغاء
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">لا يوجد طلب نشط على هذه الترابيزة</p>
                <button
                  onClick={handleStartOrder}
                  disabled={tableOrderMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-6 py-2 font-medium disabled:opacity-50"
                >
                  بدء طلب جديد
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}