import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './routes/ProtectedRoute';
import NotificationBell from './components/NotificationBell';
import { useSocket } from './hooks/useSocket';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminBranches from './pages/admin/Branches';
import AdminManagers from './pages/admin/Managers';
import AdminOrders from './pages/admin/Orders';
import AdminTables from './pages/admin/Tables';
import AdminMonthlyReports from './pages/admin/MonthlyReports';

// Branch pages
import BranchDashboard from './pages/branch/Dashboard';
import BranchPOS from './pages/branch/POS';
import BranchReports from './pages/branch/Reports';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="branches" element={<AdminBranches />} />
        <Route path="managers" element={<AdminManagers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="tables" element={<AdminTables />} />
        <Route path="reports" element={<AdminMonthlyReports />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Branch Routes */}
      <Route
        path="/branch/*"
        element={
          <ProtectedRoute allowedRoles={['branch_manager', 'staff']}>
            <BranchLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<BranchDashboard />} />
        <Route path="pos" element={<BranchPOS />} />
        <Route path="reports" element={<BranchReports />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function AdminLayout({ children }) {
  useSocket(); // Initialize socket and Firebase notifications

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">لوحة تحكم الإدارة</h1>
            <div className="flex items-center gap-4">
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function BranchLayout({ children }) {
  useSocket(); // Initialize socket and Firebase notifications

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">لوحة تحكم الفرع</h1>
            <div className="flex items-center gap-4">
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default App;