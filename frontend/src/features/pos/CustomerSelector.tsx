import React, { useState, useEffect } from 'react';
import { Search, User, X, Plus } from 'lucide-react';
import customerService from '../../services/customerService';
import CreateCustomerModal from '../../components/modal/CreateCustomerModal';
import EnhancedModal from '../../components/ui/EnhancedModal';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalPurchases?: number;
}

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCreateCustomer: () => void;
  isOpen?: boolean; // Add isOpen prop
  onClose?: () => void; // Add onClose prop
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onSelectCustomer,
  onCreateCustomer,
  isOpen: externalIsOpen,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync with external isOpen prop
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (isOpen && searchTerm.length >= 2) {
      searchCustomers();
    }
  }, [searchTerm, isOpen]);

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerService.search(searchTerm);
      const payload = response?.data;
      const rows = Array.isArray(payload) ? payload : payload?.content;
      const normalized = Array.isArray(rows)
        ? rows.map((c: any) => ({
          id: c.id,
          name: c.name || c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer',
          email: c.email || '',
          phone: c.phone || '',
          loyaltyPoints: c.loyaltyPoints || 0,
          loyaltyTier: c.loyaltyTier || 'BRONZE',
          totalPurchases: c.totalPurchases || 0,
        }))
        : [];
      setCustomers(normalized);
    } catch (error) {
      console.error('Failed to search customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    handleClose();
    setSearchTerm('');
  };

  const handleCreateCustomer = () => {
    setIsCreateModalOpen(true);
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setIsCreateModalOpen(false);
    onSelectCustomer(newCustomer);
    handleClose();
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      BRONZE: 'text-orange-700 bg-orange-100',
      SILVER: 'text-gray-700 bg-gray-200',
      GOLD: 'text-yellow-700 bg-yellow-100',
      PLATINUM: 'text-purple-700 bg-purple-100',
      DIAMOND: 'text-blue-700 bg-blue-100',
    };
    return colors[tier] || 'text-gray-700 bg-gray-100';
  };

  return (
    <div className="relative">
      {/* Selected Customer Display */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <div>
              <p className="font-medium text-sm">{selectedCustomer.name}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <span>{selectedCustomer.phone}</span>
                <span className={`px-2 py-0.5 rounded ${getTierColor(selectedCustomer.loyaltyTier)}`}>
                  {selectedCustomer.loyaltyTier}
                </span>
                <span className="text-blue-600 font-medium">
                  {selectedCustomer.loyaltyPoints} pts
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectCustomer(null)}
            className="text-gray-500 hover:text-red-500 p-1"
            title="Remove customer"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 text-gray-600"
        >
          <User size={20} />
          <span>Add Customer (Optional)</span>
        </button>
      )}

      {/* Search Modal */}
      <EnhancedModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Select Customer"
        size="small"
        className="max-h-[550px] h-[550px]"
        hideHeaderBorder={true}
        hideScrollbar={true}
      >
        <div className="space-y-6">
          {/* Search Input */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <button
              onClick={handleCreateCustomer}
              className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} />
              <span>Create New Customer</span>
            </button>
          </div>

          {/* Customer List */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            {loading ? (
              <div className="text-center text-gray-500 py-8 italic">Searching...</div>
            ) : searchTerm.length < 2 ? (
              <div className="text-center text-gray-400 py-8">
                Enter at least 2 characters to search
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No customers found
              </div>
            ) : (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium group-hover:text-blue-700">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                        <p className="text-xs text-gray-500">{customer.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getTierColor(customer.loyaltyTier)}`}>
                          {customer.loyaltyTier}
                        </span>
                        <p className="text-sm text-blue-600 font-bold mt-1">
                          {customer.loyaltyPoints} pts
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </EnhancedModal>

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
};
