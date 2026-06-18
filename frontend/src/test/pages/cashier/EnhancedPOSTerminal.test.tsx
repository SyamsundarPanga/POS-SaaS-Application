import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedPOSTerminal from '../../../pages/cashier/EnhancedPOSTerminal';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));
jest.mock('../../../store/slices/cartSlice', () => ({
  addToCart: jest.fn((payload: any) => ({ type: 'cart/add', payload })),
  removeFromCart: jest.fn((payload: any) => ({ type: 'cart/remove', payload })),
  updateQuantity: jest.fn((payload: any) => ({ type: 'cart/updateQty', payload })),
  clearCart: jest.fn(() => ({ type: 'cart/clear' })),
  applyDiscount: jest.fn((payload: any) => ({ type: 'cart/discount', payload })),
  removeDiscount: jest.fn(() => ({ type: 'cart/removeDiscount' })),
  setTaxRate: jest.fn((payload: any) => ({ type: 'cart/setTaxRate', payload })),
}));
jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../features/pos/POSProductSearch', () => () => <div>ProductSearch</div>);
jest.mock('../../../features/pos/Cart', () => ({ Cart: () => <div>Cart</div> }));
jest.mock('../../../features/pos/CheckoutModal', () => ({ CheckoutModal: () => null }));
jest.mock('../../../features/pos/CustomerSelector', () => ({ CustomerSelector: () => null }));
jest.mock('../../../features/pos/SplitPaymentModal', () => () => null);
jest.mock('../../../components/barcode/BarcodeScanner', () => () => <div>BarcodeScanner</div>);
jest.mock('../../../components/cashier/DiscountModal', () => () => null);
jest.mock('../../../features/pos/RefundModal', () => () => null);
jest.mock('../../../features/pos/VoidTransactionModal', () => () => null);
jest.mock('../../../features/pos/KeyboardShortcutsHelp', () => () => null);
jest.mock('../../../features/pos/CategoryProductBrowser', () => () => <div>CategoryBrowser</div>);
jest.mock('../../../features/products/ProductCard', () => () => <div>ProductCard</div>);
jest.mock('../../../components/ui/EnhancedModal', () => ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null));
jest.mock('../../../hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: jest.fn() }));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('../../../services/shiftService', () => ({
  __esModule: true,
  default: {
    getCurrentShift: jest.fn().mockResolvedValue(null),
    getShiftReport: jest.fn(),
    validateStartingCash: jest.fn().mockReturnValue({ valid: true }),
    validateFinalCash: jest.fn().mockReturnValue({ valid: true }),
    openShift: jest.fn(),
    closeShift: jest.fn(),
    formatTime: jest.fn(() => '05:52 PM'),
    formatCurrency: jest.fn((value: number) => `₹${value}`),
    getVarianceStatus: jest.fn(() => 'EXACT'),
    isVarianceAcceptable: jest.fn(() => true),
  },
}));
jest.mock('../../../services/branchService', () => ({
  __esModule: true,
  default: { getBranchSettings: jest.fn().mockResolvedValue({ taxRate: 10 }) },
}));
jest.mock('../../../utils/receiptGenerator', () => ({
  printReceipt: jest.fn(),
  emailReceipt: jest.fn(),
}));

describe('EnhancedPOSTerminal', () => {
  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        cart: {
          items: [],
          discount: 0,
          taxRate: 0,
          subtotalBeforeDiscount: 0,
          taxAmount: 0,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 0,
        },
        auth: { user: { username: 'cashier1' } },
      }),
    );
  });

  it('renders enhanced POS terminal shell', () => {
    render(<EnhancedPOSTerminal />);
    expect(screen.getByText('Point of Sale')).toBeInTheDocument();
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });
});

