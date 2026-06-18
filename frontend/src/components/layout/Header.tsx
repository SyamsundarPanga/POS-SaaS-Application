import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { Building2, UserCircle, LogOut, ChevronDown, Mail, Store } from 'lucide-react';
import toast from '../../utils/toast';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import NotificationCenter from './NotificationCenterComponent';
import { logout } from '../../store/slices/authSlice';
import { motion, AnimatePresence } from 'framer-motion';

const Header: React.FC = () => {
  const { currentShift } = useAppSelector((state) => state.shift);
  const { user } = useAppSelector((state) => state.auth);
  const { selectedBranch } = useAppSelector((state) => state.branches);
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.roles?.includes('ROLE_SUPER_ADMIN'));
  const isStoreAdmin = Boolean(user?.roles?.includes('ROLE_STORE_ADMIN'));
  const showNotifications = !isSuperAdmin && !isStoreAdmin;
  const showBranchHeader = Boolean(
    user?.roles?.includes('ROLE_BRANCH_MANAGER') ||
    user?.roles?.includes('ROLE_CASHIER') ||
    user?.role === 'ROLE_BRANCH_MANAGER' ||
    user?.role === 'ROLE_CASHIER'
  );
  const branchDisplayName =
    selectedBranch?.name ||
    user?.branch?.name ||
    user?.branchName ||
    user?.assignedBranch?.name ||
    user?.assignedBranchName ||
    user?.branch?.branchName ||
    '';

  const [fetchedBranchName, setFetchedBranchName] = useState<string>('');

  React.useEffect(() => {
    // Only attempt fetch if we should show a branch AND we don't have a name yet
    if (showBranchHeader && !branchDisplayName && !fetchedBranchName) {
      const loadBranchInfo = async () => {
        try {
          const branchSvc = require('../../services/branchService').default;
          const settings = await branchSvc.getBranchSettings();
          if (settings?.branchName) {
            setFetchedBranchName(settings.branchName);
          }
        } catch (e) {
          console.error('Failed to fetch branch name for header', e);
        }
      };
      loadBranchInfo();
    }
  }, [showBranchHeader, branchDisplayName, fetchedBranchName]);

  const finalBranchName = branchDisplayName || fetchedBranchName;

  const formatRole = (role?: string) => {
    if (!role) return '';
    return role.replace('ROLE_', '').split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const userRole = user?.roles?.[0] ? formatRole(user.roles[0]) : 'User';
  const displayStoreName = isSuperAdmin ? 'PayPoint' : (user?.storeName || 'PayPoint Retail');

  return (
    <header className="bg-white h-16 grid grid-cols-3 items-center px-4 sm:px-8 z-30 gap-4">
      {/* Store Name Display */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(setSidebarOpen(true))}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-50 lg:hidden transition-colors"
        >
          <UserCircle size={20} />
        </button>

        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 hidden sm:flex">
          <Building2 size={20} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-none truncate max-w-[120px] sm:max-w-none">
            {displayStoreName}
          </h2>
        </div>
      </div>

      <div className="flex items-center justify-center min-w-0">
        {showBranchHeader && finalBranchName ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 min-w-0 max-w-full">
            <Store size={14} className="shrink-0" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wide truncate">
              {finalBranchName}
            </span>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Actions Area */}
      <div className="flex items-center justify-end space-x-6">
        {showNotifications && <NotificationCenter />}

        {/* Profile Dropdown Area */}
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            className="flex items-center space-x-4 p-1 pr-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
          >
            <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black border-2 border-white overflow-hidden group-hover:scale-105 transition-transform">
              {user?.username ? (
                <span className="text-emerald-400">{user.username.charAt(0).toUpperCase()}</span>
              ) : (
                <UserCircle className="text-slate-400" />
              )}
            </div>

            <div className="text-left hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none">{user?.username}</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter mt-1 flex items-center gap-1">
                {userRole}
                <ChevronDown size={10} className={`transition-transform duration-300 ${isHovered ? 'rotate-180' : ''}`} />
              </p>
            </div>
          </button>

          {/* Hover Menu */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 overflow-hidden"
              >
                <div className="flex flex-col gap-4">
                  <div className="pb-4 border-b border-slate-50">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">User Account</p>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900">{user?.username}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">{userRole}</p>
                      {user?.email && (
                        <div className="flex items-center gap-2 mt-2 text-slate-500">
                          <Mail size={12} />
                          <p className="text-xs truncate">{user.email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const isCashier = user?.roles?.includes('ROLE_CASHIER') || user?.role === 'ROLE_CASHIER';
                      if (isCashier && currentShift && currentShift.status === 'OPEN') {
                        toast.error('Please close your shift before logging out');
                        return;
                      }
                      dispatch(logout());
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-bold text-sm"
                  >
                    <LogOut size={16} />
                    Logout Session
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
