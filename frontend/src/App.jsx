import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocket } from './hooks/useSocket';
import ProtectedRoute from './routes/ProtectedRoute';
import IntroSplash from './components/IntroSplash';

import Login from './pages/Login';

import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';
import AdminBranches from './pages/admin/Branches';
import AdminManagers from './pages/admin/Managers';
import AdminReports from './pages/admin/MonthlyReports';
import AdminTables from './pages/admin/Tables';

import BranchDashboard from './pages/branch/Dashboard';
import BranchPOS from './pages/branch/POS';
import BranchReports from './pages/branch/Reports';

function HomeRedirect() {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/branch'} replace />;
}

export default function App() {
  useSocket();

  return (
    <>
      {/* Shown once on load, on top of whichever route renders below.
          Self-timed (~3s) and unmounts itself — nothing else to wire up. */}
      <IntroSplash />

      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/branches" element={<AdminBranches />} />
          <Route path="/admin/managers" element={<AdminManagers />} />
          <Route path="/admin/tables" element={<AdminTables />} />
          <Route path="/admin/reports" element={<AdminReports />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['branch_manager']} />}>
          <Route path="/branch" element={<BranchDashboard />} />
          <Route path="/branch/pos" element={<BranchPOS />} />
          <Route path="/branch/reports" element={<BranchReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}