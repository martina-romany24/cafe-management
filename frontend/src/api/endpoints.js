import { apiClient } from './client';

// --- Auth ---
export const loginRequest = (email, password) =>
  apiClient.post('/auth/login', { email, password }).then((r) => r.data);
export const meRequest = () => apiClient.get('/auth/me').then((r) => r.data);

// --- Branches ---
export const getBranches = () => apiClient.get('/branches').then((r) => r.data);
export const createBranch = (data) => apiClient.post('/branches', data).then((r) => r.data);
export const updateBranch = (id, data) => apiClient.put(`/branches/${id}`, data).then((r) => r.data);
export const setBranchActive = (id, isActive) =>
  apiClient.patch(`/branches/${id}/active`, { isActive }).then((r) => r.data);

// --- Products ---
export const getProducts = () => apiClient.get('/products').then((r) => r.data);
export const createProduct = (data) => apiClient.post('/products', data).then((r) => r.data);
export const updateProduct = (id, data) => apiClient.put(`/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => apiClient.delete(`/products/${id}`).then((r) => r.data);
export const setProductActive = (id, isActive) =>
  apiClient.patch(`/products/${id}/active`, { isActive }).then((r) => r.data);
export const upsertProductPricing = (id, data) =>
  apiClient.post(`/products/${id}/pricing`, data).then((r) => r.data);
export const previewPricing = (data) =>
  apiClient.post('/products/pricing/preview', data).then((r) => r.data);

// --- Users ---
export const getUsers = () => apiClient.get('/users').then((r) => r.data);
export const createUser = (data) => apiClient.post('/users', data).then((r) => r.data);
export const updateUser = (id, data) => apiClient.put(`/users/${id}`, data).then((r) => r.data);
export const setUserActive = (id, isActive) =>
  apiClient.patch(`/users/${id}/active`, { isActive }).then((r) => r.data);

// --- Orders ---
export const createOrder = (data) => apiClient.post('/orders', data).then((r) => r.data);
export const getSalesSummary = (params) => apiClient.get('/orders/summary', { params }).then((r) => r.data);
export const getTopProducts = (params) => apiClient.get('/orders/top-products', { params }).then((r) => r.data);
export const getAdminReport = (params) => apiClient.get('/orders/admin-report', { params }).then((r) => r.data);
export const getAllOrders = (params) => apiClient.get('/orders/all', { params }).then((r) => r.data);

// --- Monthly Reports ---
export const getMonthlyReports = (params) => apiClient.get('/reports', { params }).then((r) => r.data);
export const recalculateReport = (data) => apiClient.post('/reports/recalculate', data).then((r) => r.data);
export const exportReportExcelUrl = (params) =>
  `${apiClient.defaults.baseURL}/reports/export/excel?month=${params.month}&year=${params.year}`;
export const exportReportPdfUrl = (params) =>
  `${apiClient.defaults.baseURL}/reports/export/pdf?month=${params.month}&year=${params.year}`;
