import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellDot, Check, Trash2, X, AlertTriangle, ShoppingBag, CheckCheck, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  clearAllNotifications,
  deleteNotification,
  selectNotifications,
  selectUnreadCount,
  selectNotificationLoading,
  markAllAsRead,
} from '../../store/slices/notificationSlice';
import { formatDistanceToNow } from 'date-fns';
import orderService from '../../services/orderService';
import api from '../../services/api';
import toast from '../../utils/toast';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const loading = useAppSelector(selectNotificationLoading);
  const user = useAppSelector((state) => state.auth.user);
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);

  const canApproveVoidRequest = (roles: string[] = []) => {
    return roles.includes('ROLE_BRANCH_MANAGER');
  };

  const extractVoidRequestId = (actionUrl?: string): number | null => {
    if (!actionUrl) return null;
    const match = actionUrl.match(/\/orders\/void-requests\/(\d+)/);
    if (!match?.[1]) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) ? id : null;
  };

  const extractRefundRequestId = (actionUrl?: string): number | null => {
    if (!actionUrl) return null;
    const match = actionUrl.match(/\/orders\/refund-requests\/(\d+)/);
    if (!match?.[1]) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) ? id : null;
  };

  const handleVoidAction = async (notificationId: number, actionUrl: string | undefined, action: 'approve' | 'decline') => {
    const voidRequestId = extractVoidRequestId(actionUrl);
    if (!voidRequestId) {
      return;
    }

    try {
      setActionInProgressId(notificationId);
      if (action === 'approve') {
        await orderService.approveVoidRequest(voidRequestId);
        toast.success('Void request approved');
      } else {
        await orderService.declineVoidRequest(voidRequestId);
        toast.success('Void request declined');
      }

      await dispatch(deleteNotification(notificationId));
      await dispatch(fetchUnreadCount());
    } catch (error: any) {
      const message = error?.response?.data?.message || `Failed to ${action} void request`;
      toast.error(message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRefundAction = async (notificationId: number, actionUrl: string | undefined, action: 'approve' | 'decline') => {
    const refundRequestId = extractRefundRequestId(actionUrl);
    if (!refundRequestId) {
      return;
    }

    try {
      setActionInProgressId(notificationId);
      if (action === 'approve') {
        await orderService.approveRefundRequest(refundRequestId);
        toast.success('Refund request approved');
      } else {
        await orderService.declineRefundRequest(refundRequestId);
        toast.success('Refund request declined');
      }

      await dispatch(deleteNotification(notificationId));
      await dispatch(fetchUnreadCount());
    } catch (error: any) {
      const message = error?.response?.data?.message || `Failed to ${action} refund request`;
      toast.error(message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleStockAction = async (notification: any, approve: boolean) => {
    if (!approve) {
       dispatch(deleteNotification(notification.id));
       return;
    }

    try {
      setActionInProgressId(notification.id);
      // actionUrl format: inventory-adjust:[productId]:[branchId]:[quantity]:[movementType]:[notes]
      const parts = notification.actionUrl?.split(':') || [];
      if (parts.length < 5) {
        toast.error('Invalid notification data');
        return;
      }

      const [prefix, productId, branchId, quantity, movementType, ...notesParts] = parts;
      if (prefix !== 'inventory-adjust') return;

      const notes = notesParts.join(':').replace(';', ':');

      await api.post('/inventory/adjust', {
        productId: parseInt(productId),
        branchId: parseInt(branchId),
        quantity: parseInt(quantity),
        movementType,
        notes: `Manager Approved: ${notes}`,
        referenceType: 'ADJUSTMENT',
        referenceId: notification.id
      });

      toast.success('Stock adjustment approved successfully');
      dispatch(deleteNotification(notification.id));
      dispatch(fetchUnreadCount());
    } catch (error: any) {
      console.error('Error approving stock adjustment:', error);
      toast.error(error.response?.data?.message || 'Failed to approve adjustment');
    } finally {
      setActionInProgressId(null);
    }
  };

  useEffect(() => {
    dispatch(fetchNotifications({ page: 0, limit: 10 }));
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'ORDER': return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      case 'SYSTEM': return <Bell className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
      >
        {unreadCount > 0 ? (
          <>
            <BellDot size={20} className="text-emerald-500" />
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <Bell size={20} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Notifications</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {unreadCount} UNREAD MESSAGES
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch(markAllAsRead())}
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => dispatch(clearAllNotifications())}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4">
                  <Bell className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">All caught up!</p>
                <p className="text-xs text-slate-500">No new notifications at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notification) => {
                  const isAdjustmentRequest = notification.title === 'Stock Adjustment Approval Required';
                  const isVoidApprovalRequest = 
                    notification.type === 'SYSTEM' && 
                    notification.title?.toLowerCase().includes('void approval required');
                  const isRefundApprovalRequest =
                    notification.type === 'SYSTEM' &&
                    notification.title?.toLowerCase().includes('refund approval required');

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 transition-all hover:bg-slate-50/80 group relative ${!notification.read ? 'bg-emerald-50/30' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${!notification.read ? 'bg-white border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h4 className={`text-xs font-black truncate ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                              {notification.title}
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap mt-0.5">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            {notification.message}
                          </p>

                          {isAdjustmentRequest && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleStockAction(notification, true)}
                                disabled={actionInProgressId === notification.id}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-1.5 rounded-lg transition-all shadow-sm shadow-emerald-100 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleStockAction(notification, false)}
                                disabled={actionInProgressId === notification.id}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black py-1.5 rounded-lg transition-all disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          {isVoidApprovalRequest && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleVoidAction(notification.id, notification.actionUrl, 'approve')}
                                disabled={actionInProgressId === notification.id}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-1.5 rounded-lg transition-all shadow-sm shadow-emerald-100 disabled:opacity-50"
                              >
                                Approve Void
                              </button>
                              <button
                                onClick={() => handleVoidAction(notification.id, notification.actionUrl, 'decline')}
                                disabled={actionInProgressId === notification.id}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black py-1.5 rounded-lg transition-all disabled:opacity-50"
                              >
                                Decline Void
                              </button>
                            </div>
                          )}

                          {isRefundApprovalRequest && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleRefundAction(notification.id, notification.actionUrl, 'approve')}
                                disabled={actionInProgressId === notification.id}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-1.5 rounded-lg transition-all shadow-sm shadow-emerald-100 disabled:opacity-50"
                              >
                                Approve Refund
                              </button>
                              <button
                                onClick={() => handleRefundAction(notification.id, notification.actionUrl, 'decline')}
                                disabled={actionInProgressId === notification.id}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black py-1.5 rounded-lg transition-all disabled:opacity-50"
                              >
                                Decline Refund
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            {!notification.read && (
                              <button
                                onClick={() => dispatch(markAsRead(notification.id))}
                                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => dispatch(deleteNotification(notification.id))}
                          className="absolute top-4 right-4 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex justify-center">
              <button className="text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-colors flex items-center gap-2">
                View All Activity
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
