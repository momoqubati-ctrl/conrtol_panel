import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/admin/AdminLayout';
import { VendorLayout } from './components/vendor/VendorLayout';
import { AdminLoginPage } from './components/auth/AdminLoginPage';
import { VendorLoginPage } from './components/auth/VendorLoginPage';
import { NotFound } from './components/common/NotFound';

const SECRET_ADMIN_PATH = '/admin9090sazxxc4/admin/portal/login';

function MainRouter() {
  const { currentUser, isLoggedIn } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // 1. Secret Admin Portal Route
  const normalizedPath = currentPath.replace(/\/$/, '').toLowerCase();
  const secretPathLower = SECRET_ADMIN_PATH.toLowerCase();

  if (normalizedPath === secretPathLower || normalizedPath.startsWith('/admin9090sazxxc')) {
    if (isLoggedIn && currentUser?.role === 'admin') {
      return <AdminLayout />;
    }
    return <AdminLoginPage onSuccess={() => navigateTo(SECRET_ADMIN_PATH)} />;
  }

  // 2. Prohibited or Guessing Routes -> Render 404
  const forbiddenAdminGuessPaths = ['/admin', '/admin-login', '/login', '/admin/portal/login', '/portal'];
  if (forbiddenAdminGuessPaths.includes(currentPath.toLowerCase())) {
    return <NotFound />;
  }

  // 3. Vendor Portal Route (Root `/` or `/vendor` or `/vendor/login`)
  if (currentPath === '/' || currentPath === '/vendor' || currentPath === '/vendor/login') {
    if (isLoggedIn && currentUser?.role === 'vendor') {
      return <VendorLayout />;
    }
    return <VendorLoginPage onSuccess={() => navigateTo('/vendor')} />;
  }

  // 4. Default Fallback 404
  return <NotFound />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
