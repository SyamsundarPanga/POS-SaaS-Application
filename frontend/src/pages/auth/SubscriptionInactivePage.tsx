import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

const SubscriptionInactivePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const isStoreAdmin = Boolean(user?.roles?.includes('ROLE_STORE_ADMIN'));

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const message = isStoreAdmin
    ? 'Your subscription is not active. Please reactivate from Settings to continue.'
    : 'Your store subscription is not active. Please contact your Store Admin.';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-black text-slate-900">Subscription Not Active</h1>
        <p className="text-slate-600 mt-3">{message}</p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {isStoreAdmin && (
            <button
              onClick={() => navigate('/settings')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
            >
              Open Subscription Settings
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionInactivePage;
