import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom"; 
import OrderDetailModal from "../../../features/orders/OrderDetailModal";

/**
 * 1. MOCKING THE UI DEPENDENCIES
 * We use { virtual: true } to tell Jest to mock this path even if it 
 * has trouble resolving the physical file location during the build.
 */
jest.mock("../../../components/ui/EnhancedModal", () => ({
  __esModule: true,
  default: ({ children, title, onClose, isOpen }: any) => 
    // Simplified version of the modal for testing logic
    isOpen !== false ? (
      <div data-testid="enhanced-modal">
        <header>
          <h1>{title}</h1>
          <button onClick={onClose} aria-label="Close Modal">X</button>
        </header>
        <div className="modal-content-wrapper">{children}</div>
      </div>
    ) : null,
}), { virtual: true });

/**
 * 2. MOCK DATA
 * Includes a full order with items and a minimal "Walk-in" order.
 */
const MOCK_ORDER_FULL = {
  id: 1,
  orderNumber: "ORD-998877",
  customerName: "Jane Smith",
  customerEmail: "jane@example.com",
  cashierName: "Admin User",
  subtotal: 1200.00,
  tax: 50.00,
  discount: 150.00,
  total: 1100.00,
  status: "completed",
  createdAt: "2024-05-20T14:30:00Z",
  paymentMethod: "UPI",
  items: [
    {
      id: 10,
      productName: "Mechanical Keyboard",
      sku: "KB-RGB-01",
      quantity: 1,
      price: 1000.00,
      discount: 0,
      lineTotal: 1000.00
    },
    {
      id: 11,
      productName: "USB-C Cable",
      sku: "CBL-02",
      quantity: 2,
      price: 100.00,
      discount: 0,
      lineTotal: 200.00
    }
  ]
};

const MOCK_ORDER_MINIMAL = {
  id: 2,
  orderNumber: "ORD-0000",
  total: 500.00,
  status: "pending",
  createdAt: "2024-05-21T09:00:00Z",
  items: [] // Test empty items array
};

/**
 * 3. TEST SUITE
 */
describe("OrderDetailModal Component", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the correct order number in the modal header", () => {
    render(<OrderDetailModal order={MOCK_ORDER_FULL} onClose={mockOnClose} />);
    expect(screen.getByText("Order #ORD-998877")).toBeInTheDocument();
  });

  it("should display customer details when provided", () => {
    render(<OrderDetailModal order={MOCK_ORDER_FULL} onClose={mockOnClose} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("should default to 'Walk-in' when customerName is missing", () => {
    render(<OrderDetailModal order={MOCK_ORDER_MINIMAL} onClose={mockOnClose} />);
    expect(screen.getByText("Walk-in")).toBeInTheDocument();
  });

  it("should render the items list correctly in the table", () => {
    render(<OrderDetailModal order={MOCK_ORDER_FULL} onClose={mockOnClose} />);
    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("USB-C Cable")).toBeInTheDocument();
    // Check quantity of second item
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should display the discount row only if discount exists and is > 0", () => {
    const { rerender } = render(<OrderDetailModal order={MOCK_ORDER_FULL} onClose={mockOnClose} />);
    expect(screen.getByText("DISCOUNT")).toBeInTheDocument();
    expect(screen.getByText("-₹150.00")).toBeInTheDocument();

    // Rerender with minimal order (0 discount)
    rerender(<OrderDetailModal order={MOCK_ORDER_MINIMAL} onClose={mockOnClose} />);
    expect(screen.queryByText("DISCOUNT")).not.toBeInTheDocument();
  });

  it("should format currency with two decimal places", () => {
    render(<OrderDetailModal order={MOCK_ORDER_FULL} onClose={mockOnClose} />);
    // Checking the calculated Total (1100.00)
    expect(screen.getByText("1100.00")).toBeInTheDocument();
  });

  it("should trigger the onClose callback when the 'CLOSE DETAILS' button is clicked", () => {
    render(<OrderDetailModal order={MOCK_ORDER_FULL} onClose={mockOnClose} />);
    const closeBtn = screen.getByText(/CLOSE DETAILS/i);
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});