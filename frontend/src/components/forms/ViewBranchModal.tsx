import React from 'react';
import { Branch } from '../../types/branch';
import { BranchActionModal } from './BranchFormComponents';
import { MapPin, Phone, Mail, Clock, Globe, Shield, Calendar } from 'lucide-react';

interface ViewBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    branch: Branch | null;
}

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: string | React.ReactNode }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
        <div className="mt-0.5 text-slate-400">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                {label}
            </div>
            <div className="text-sm font-bold text-slate-800 break-words">
                {value}
            </div>
        </div>
    </div>
);

const ViewBranchModal: React.FC<ViewBranchModalProps> = ({ isOpen, onClose, branch }) => {
    if (!branch) return null;

    return (
        <BranchActionModal isOpen={isOpen} onClose={onClose} title="Branch Intelligence Summary">
            <div className="space-y-6">
                {/* Status Header */}
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${branch.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        <div>
                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none mb-0.5">
                                Current Status
                            </div>
                            <div className="text-sm font-black text-emerald-900">
                                {branch.status}
                            </div>
                        </div>
                    </div>
                    {branch.isMainBranch && (
                        <div className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-200">
                            Head Office
                        </div>
                    )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <DetailRow icon={<Shield size={16} />} label="System Code" value={branch.code} />
                        <DetailRow icon={<Globe size={16} />} label="Country" value={branch.country} />
                    </div>

                    <DetailRow icon={<MapPin size={16} />} label="Physical Address" value={
                        <>
                            {branch.address}
                            <br />
                            <span className="text-slate-500">
                                {branch.city}, {branch.state} - {branch.zipCode}
                            </span>
                        </>
                    } />

                    <div className="grid grid-cols-2 gap-4">
                        <DetailRow icon={<Phone size={16} />} label="Primary Phone" value={branch.phone} />
                        <DetailRow icon={<Mail size={16} />} label="Service Email" value={branch.email} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-50/50">
                        <DetailRow icon={<Clock size={16} />} label="Opening Hours" value={branch.openingTime} />
                        <DetailRow icon={<Clock size={16} />} label="Closing Hours" value={branch.closingTime} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <DetailRow icon={<Calendar size={16} />} label="Established" value={branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : 'N/A'} />
                        <DetailRow icon={<Shield size={16} />} label="Tax Configuration" value={`${branch.taxRate}% GST Enabled`} />
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95"
                >
                    CLOSE SUMMARY
                </button>
            </div>
        </BranchActionModal>
    );
};

export default ViewBranchModal;
