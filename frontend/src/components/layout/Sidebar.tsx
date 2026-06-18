import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { Receipt } from "lucide-react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from '../../utils/toast';
import {
  LayoutDashboard,
  Users,
  User,
  Package,
  ShoppingCart,
  Menu,
  X,
  Zap,
  LogOut,
  Boxes,
  ClipboardList,
  Clock,
  Store, // Icon for Branch Management
  MapPin,
  Settings,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { selectSidebarState, setSidebarOpen, collapseSidebar } from '../../store/slices/uiSlice';

const Sidebar: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { currentShift } = useAppSelector((state) => state.shift);
  const { isOpen, isCollapsed } = useAppSelector(selectSidebarState);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      dispatch(setSidebarOpen(false));
    }
  }, [location.pathname, dispatch]);

  const getPath = (item: any) => {
    if (user?.roles?.includes('ROLE_BRANCH_MANAGER') && item.managerPath) {
      return item.managerPath;
    }
    return item.path;
  };

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/superadmin/dashboard',
      icon: LayoutDashboard,
      roles: ['ROLE_SUPER_ADMIN'],
    },
    {
      name: 'Tenants',
      path: '/superadmin/tenants',
      icon: Store,
      roles: ['ROLE_SUPER_ADMIN'],
    },
    // {
    //   name: 'Settings',
    //   path: '/superadmin/settings',
    //   icon: Settings,
    //   roles: ['ROLE_SUPER_ADMIN'],
    // },
    {
      name: 'Dashboard',
      path: '/dashboard',
      managerPath: '/manager/dashboard',
      icon: LayoutDashboard,
      roles: ['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Branches',
      path: '/branches',
      icon: MapPin,
      roles: ['ROLE_STORE_ADMIN'],
    },
    {
      name: user?.roles?.includes('ROLE_BRANCH_MANAGER') ? 'Employees' : 'Employees',
      path: '/users',
      managerPath: '/manager/employees',
      icon: User,
      roles: ['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Products',
      path: '/products',
      icon: Package,
      roles: ['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Inventory',
      path: '/inventory',
      managerPath: '/manager/inventory',
      icon: Boxes,
      roles: ['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Customers',
      path: '/customers',
      managerPath: '/customers',
      icon: Users,
      roles: ['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'All Orders Logs',
      path: '/orders',
      managerPath: '/manager/orders',
      icon: Receipt,
      roles: ['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Shift Management',
      path: '/shift-management',
      managerPath: '/manager/shifts',
      icon: Clock,
      roles: ['ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'POS Terminal',
      path: '/cashier/pos',
      icon: ShoppingCart,
      roles: ['ROLE_CASHIER', 'ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Order History',
      path: '/order-history',
      icon: ClipboardList,
      roles: ['ROLE_CASHIER', 'ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Settings',
      path: '/settings',
      managerPath: '/manager/settings',
      icon: Zap,
      roles: ['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER'],
    },
    {
      name: 'Audit Logs',
      path: '/audit-logs',
      icon: Activity,
      roles: ['ROLE_STORE_ADMIN'],
    },
  ];

  const filteredMenu = menuItems.filter((item) =>
    user?.roles?.some((role: string) => item.roles.includes(role)),
  );

  const handleLogout = () => {
    const isCashier = user?.roles?.includes("ROLE_CASHIER") || user?.role === "ROLE_CASHIER";
    if (isCashier && currentShift && currentShift.status === "OPEN") {
      toast.error("Please close your shift before logging out");
      return;
    }
    dispatch(logout());
  };

  const handleItemClick = (e: React.MouseEvent, item: any) => {
    const isCashier = user?.roles?.includes("ROLE_CASHIER") || user?.role === "ROLE_CASHIER";

    if (isCashier && item.name === "Order History") {
      if (!currentShift || currentShift.status !== "OPEN") {
        e.preventDefault();
        toast.error("Please open your shift to access order history");
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(setSidebarOpen(false))}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`bg-white flex flex-col h-screen transition-all duration-300 ease-in-out z-50 sticky top-0 border-r border-slate-100 
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          fixed lg:sticky
          ${!isCollapsed ? 'w-56' : 'w-20'}
        `}
      >
        {/* Header / Logo */}
        <div
          className={`p-4 flex items-center h-16 ${!isCollapsed ? 'justify-between' : 'justify-center'}`}
        >
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <img
                  src="/PayPoint 2.png"
                  alt="PayPoint"
                  className="h-8 w-auto object-contain"
                />
              </div>
            )}
          </AnimatePresence>

          <button
            onClick={() => dispatch(collapseSidebar(!isCollapsed))}
            className="p-2 text-slate-600 hover:text-slate-900 transition-colors hidden lg:block"
          >
            {!isCollapsed ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => dispatch(setSidebarOpen(false))}
            className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={`flex-grow p-4 space-y-2 custom-scrollbar ${!isCollapsed ? 'overflow-y-auto' : ''}`}
        >
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const targetPath = getPath(item);
            const isActive = location.pathname.startsWith(targetPath);

            return (
              <Link
                key={item.path}
                to={targetPath}
                onClick={(e) => handleItemClick(e, item)}
                className={`flex items-center p-3.5 rounded-xl transition-all group relative ${isActive
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  } ${!isCollapsed ? 'space-x-4 justify-start' : 'justify-center'}`}
              >
                <Icon
                  size={20}
                  className={`${isActive ? 'text-white' : 'group-hover:text-emerald-500'} transition-colors shrink-0`}
                />

                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-bold text-sm whitespace-nowrap tracking-tight"
                  >
                    {item.name}
                  </motion.span>
                )}

                {isCollapsed && (
                  <div className="absolute left-16 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase font-black tracking-widest z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User & Status Section */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center p-3.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group relative ${!isCollapsed ? 'space-x-4 justify-start' : 'justify-center'
              }`}
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            {!isCollapsed && <span className="font-bold text-sm whitespace-nowrap">Logout System</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;




