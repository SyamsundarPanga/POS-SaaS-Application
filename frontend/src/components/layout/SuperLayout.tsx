import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import Header from './Header';
import Sidebar from './Sidebar';

const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isLoggedIn || (!user?.isSuperAdmin && !user?.roles?.includes('ROLE_SUPER_ADMIN'))) {
      navigate('/login');
    }
  }, [isLoggedIn, user, navigate]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
