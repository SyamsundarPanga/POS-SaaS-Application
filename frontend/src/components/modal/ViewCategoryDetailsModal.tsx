import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Package, Hash, AlignLeft, Info } from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    category: any;
}

const ViewCategoryDetailsModal: React.FC<Props> = ({ open, onClose, category }) => {
    if (!category) return null;

    return (
        <Modal open={open} onClose={onClose} title="Category Details" showBackdrop={false} className="w-[450px] shadow-2xl border-2 border-emerald-500/20">
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                ` }} />

                {/* Category Image */}
                <div className="flex justify-center">
                    <div className="w-28 h-28 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
                        {category.imageUrl ? (
                            <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-slate-200">
                                <Package size={32} strokeWidth={1} />
                                <span className="text-[8px] font-bold uppercase mt-1">No Image</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info List */}
                <div className="space-y-3 px-2">
                    <DetailItem
                        icon={<Info size={16} className="text-emerald-500" />}
                        label="Category Name"
                        value={category.name}
                    />

                    <DetailItem
                        icon={<AlignLeft size={16} className="text-blue-500" />}
                        label="Description"
                        value={category.description || "No description provided."}
                    />

                    <div className="grid grid-cols-2 gap-6">
                        <DetailItem
                            icon={<Hash size={16} className="text-orange-500" />}
                            label="Display Order"
                            value={category.displayOrder?.toString() || "0"}
                        />

                        <DetailItem
                            icon={<Package size={16} className="text-purple-500" />}
                            label="Status"
                            value={category.status}
                            isBadge
                            badgeColor={category.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-3 border-t">
                    <Button variant="secondary" onClick={onClose} className="px-6 py-2 text-xs">
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const DetailItem = ({ icon, label, value, isBadge = false, badgeColor = "" }: {
    icon: React.ReactNode,
    label: string,
    value: string,
    isBadge?: boolean,
    badgeColor?: string
}) => (
    <div className="flex flex-col">
        <div className="flex items-center gap-1.5 mb-0.5">
            {icon}
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        {isBadge ? (
            <div className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black ${badgeColor}`}>
                    {value}
                </span>
            </div>
        ) : (
            <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">{value}</p>
        )}
    </div>
);

export default ViewCategoryDetailsModal;
