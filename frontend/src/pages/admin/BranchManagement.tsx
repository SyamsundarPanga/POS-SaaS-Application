import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, MapPin, Globe, Mail, MoreVertical, Eye, Ban, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchBranches, deleteBranch, updateBranchStatus } from '../../store/slices/branchSlice';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import CreateBranchModal from '../../components/forms/CreateBranchModal';
import UpdateBranchModal from '../../components/forms/UpdateBranchModal';
import ViewBranchModal from '../../components/forms/ViewBranchModal';
import { Branch } from '../../types/branch';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from '../../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

const BranchManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { branches, loading, totalPages: reduxTotalPages, totalElements: reduxTotalElements } = useAppSelector((state) => state.branches);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingDeleteBranchId, setPendingDeleteBranchId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    dispatch(fetchBranches({ includeInactive: true, page: currentPage, size: pageSize }));
  }, [dispatch, currentPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm]);

  // Update local pagination state from Redux
  useEffect(() => {
    if (reduxTotalPages !== undefined) {
      setTotalPages(reduxTotalPages);
    }
    if (reduxTotalElements !== undefined) {
      setTotalElements(reduxTotalElements);
    }
  }, [reduxTotalPages, reduxTotalElements]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm]);

  const branchList: Branch[] = Array.isArray(branches)
    ? branches
    : (branches as any)?.content || [];

  useEffect(() => {
    if ((branches as any)?.totalPages !== undefined) {
      setTotalPages((branches as any).totalPages);
      setTotalElements((branches as any).totalElements || 0);
    }
  }, [branches]);

  const filteredBranches = branchList.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.city?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsUpdateOpen(true);
    setOpenMenuId(null);
  };

  const handleView = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsViewOpen(true);
    setOpenMenuId(null);
  };


  const handleDelete = async (id: number) => {
    setPendingDeleteBranchId(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await dispatch(updateBranchStatus({ id: branch.id, status: newStatus })).unwrap();
      toast.success(`Branch ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error || `Failed to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} branch`);
    } finally {
      setOpenMenuId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteBranchId) return;
    try {
      await dispatch(deleteBranch(pendingDeleteBranchId)).unwrap();
      toast.success('Branch deleted successfully');
    } catch (error: any) {
      toast.error(error || 'Failed to delete branch');
    } finally {
      setIsDeleteConfirmOpen(false);
      setPendingDeleteBranchId(null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <DashboardHeader />

        <motion.div
          className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* --- HEADER & ACTIONS --- */}
          <motion.div className="flex flex-col md:flex-row md:items-end justify-between gap-6" variants={itemVariants}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-[0.2em]">
                <Globe size={14} />
                Global Network
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Branch Logistics
              </h1>
              <p className="text-slate-500 font-medium">
                Configure and monitor your physical locations and warehouse distribution centers.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-full max-w-md group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => {
                    if (e.target.value.length > 100) {
                      toast.warning('Search supports up to 100 characters');
                      return;
                    }
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 transition-all shadow-sm"
                />
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus size={18} strokeWidth={3} />
                <span>Add Branch</span>
              </button>
            </div>
          </motion.div>

          {/* --- DATA TABLE --- */}
          <motion.div className="bg-white rounded-xl border border-slate-200/60 shadow-xl shadow-slate-200/40" variants={itemVariants}>
            <div className="overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      General Info
                    </th>
                    <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      Communication
                    </th>
                    <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Operational Status
                    </th>
                    <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Options
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBranches.map((branch: Branch) => (
                    <tr key={branch.id} className="group hover:bg-slate-50/80 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <MapPin size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {branch.name}
                            </div>
                            <div className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-[10px] text-slate-500 rounded font-black tracking-tighter uppercase">
                              ID: {branch.code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                            <Mail size={12} className="text-slate-400" />
                            {branch.email}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium pl-5">
                            Official Channel
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide border transition-all ${branch.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${branch.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
                          ></span>
                          {branch.status}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-end relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === branch.id ? null : branch.id)}
                            className={`p-2 rounded-lg transition-all ${openMenuId === branch.id ? 'bg-slate-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                          >
                            <MoreVertical size={20} />
                          </button>

                          <AnimatePresence>
                            {openMenuId === branch.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 mt-10 w-48 bg-white border border-slate-100 rounded-xl shadow-2xl py-2 z-20 overflow-hidden"
                                >
                                  <button
                                    onClick={() => handleView(branch)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                  >
                                    <Eye size={16} />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => handleEdit(branch)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  >
                                    <Edit3 size={16} />
                                    Edit Config
                                  </button>
                                  <button
                                    onClick={() => handleToggleStatus(branch)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors ${branch.status === 'ACTIVE'
                                      ? 'text-amber-600 hover:bg-amber-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                  >
                                    {branch.status === 'ACTIVE' ? (
                                      <>
                                        <Ban size={16} />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={16} />
                                        Activate
                                      </>
                                    )}
                                  </button>
                                  <div className="h-px bg-slate-50 mx-2 my-1" />
                                  <button
                                    onClick={() => {
                                      handleDelete(branch.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                    Delete Branch
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>

                    </tr>
                  ))}

                  {filteredBranches.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                            <Search size={40} />
                          </div>
                          <div className="text-slate-400 font-bold">No results found</div>
                          <p className="text-xs text-slate-400 max-w-[200px] mx-auto">
                            Try adjusting your filters or search terms to find the location.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center border-t border-slate-200 pt-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${currentPage === i
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Next Page"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <CreateBranchModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <UpdateBranchModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        branch={selectedBranch}
      />

      <ViewBranchModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        branch={selectedBranch}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDeleteBranchId(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone."
      />
    </div>
  );
};

export default BranchManagement;
