import React from 'react';
import EnhancedModal from '../../components/ui/EnhancedModal';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface OrderItem {
  id: number;
  productId?: number;
  productName: string;
  sku?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  subtotal?: number;
  lineTotal?: number;
  discount?: number;
}

interface OrderPayment {
  id?: number;
  method: string;
  amount: number;
}

interface Order {
  id: number;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  cashierName?: string;
  subtotal?: number;
  tax?: number;
  subtotalBeforeDiscount?: number;
  taxAmount?: number;
  discount?: number;
  discountAmount?: number;
  finalTotal?: number;
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  payments?: OrderPayment[];
  items?: OrderItem[];
  originalLineItems?: OrderItem[];
}

interface DisplayOrderItem extends OrderItem {
  originalQuantity: number;
  netQuantity: number;
  refundedQuantity: number;
  refundAmount: number;
  netSubtotal: number;
}

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const toSafeAmount = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const roundCurrency = (value: number): number => Number(value.toFixed(2));

const getItemKey = (item: Partial<OrderItem>) =>
  String(item.productId ?? item.sku ?? item.productName ?? item.id ?? '');

const getDisplayItemsForModal = (order: Order): DisplayOrderItem[] => {
  const originalItems = order.originalLineItems || order.items || [];
  const currentByProduct = new Map((order.items || []).map((item) => [getItemKey(item), item]));

  return originalItems.map((original, index) => {
    const current = currentByProduct.get(getItemKey(original));
    const originalQty = Number(original.quantity || 0);
    const currentQty = Number(current?.quantity ?? originalQty);
    const refundedQty = Math.max(0, originalQty - currentQty);
    const unitPrice = Number(original.price ?? original.unitPrice ?? 0);
    const netSubtotal = Number((unitPrice * currentQty).toFixed(2));
    const refundAmount = Number((unitPrice * refundedQty).toFixed(2));

    return {
      ...(current || original),
      id: (current || original).id ?? original.id ?? index,
      originalQuantity: originalQty,
      netQuantity: currentQty,
      refundedQuantity: refundedQty,
      refundAmount,
      netSubtotal,
    };
  });
};

const getPositivePayments = (order: Order) =>
  (order.payments || []).filter((payment) => Number(payment.amount || 0) > 0);

const getRefundPayments = (order: Order) =>
  (order.payments || []).filter((payment) => Number(payment.amount || 0) < 0);

const getGrossPaidAmount = (order: Order) =>
  getPositivePayments(order).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

const getRefundedAmount = (order: Order) =>
  Math.abs(getRefundPayments(order).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));

const getNetPaidAmount = (order: Order) => {
  if (!order.payments || order.payments.length === 0) {
    return toSafeAmount(order.finalTotal ?? order.total);
  }

  return order.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
};

const getOrderFinancials = (order: Order) => {
  const subtotalBase = toSafeAmount(order.subtotalBeforeDiscount ?? order.subtotal);
  let subtotal = subtotalBase > 0 ? subtotalBase : 0;
  let tax = toSafeAmount(order.taxAmount ?? order.tax);
  let discount = toSafeAmount(order.discountAmount ?? order.discount);
  const paidAmount = roundCurrency(getNetPaidAmount(order));
  const declaredTotal = toSafeAmount(order.finalTotal ?? order.total);
  let total = declaredTotal > 0 ? declaredTotal : paidAmount;

  if (subtotal > 0 && tax >= 0 && discount <= 0 && total > 0) {
    const inferredDiscount = roundCurrency(subtotal + tax - total);
    if (inferredDiscount > 0 && inferredDiscount <= subtotal) {
      discount = inferredDiscount;
    }
  }

  if (subtotal > 0 && tax <= 0 && discount >= 0 && total > 0) {
    const inferredTax = roundCurrency(total + discount - subtotal);
    if (inferredTax > 0) {
      tax = inferredTax;
    }
  }

  if (subtotal <= 0) {
    const lineSubtotal = roundCurrency(
      (order.items || []).reduce(
        (sum, item) => sum + toSafeAmount(item.subtotal ?? item.lineTotal),
        0,
      ),
    );
    subtotal = lineSubtotal > 0 ? lineSubtotal : 0;
  }

  if (total <= 0) {
    total = paidAmount > 0 ? paidAmount : roundCurrency(subtotal + tax - discount);
  }

  return {
    subtotal: roundCurrency(subtotal),
    tax: roundCurrency(Math.max(0, tax)),
    discount: roundCurrency(Math.max(0, discount)),
    total: roundCurrency(total),
  };
};

const getPaymentMethods = (paymentMethod?: string): string[] => {
  if (!paymentMethod) return [];
  return paymentMethod
    .split('+')
    .map((method) => method.trim())
    .filter(Boolean);
};

const getStatusBadge = (status: string) => {
  const badges = {
    COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
    PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
    PARTIAL_REFUND: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
    REFUNDED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertCircle },
  };

  const badge = badges[status as keyof typeof badges] || badges.PENDING;
  const Icon = badge.icon || Clock;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
};

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  const selectedOrderFinancials = getOrderFinancials(order);
  const selectedOrderDisplayItems = getDisplayItemsForModal(order);
  const selectedOrderPositivePayments = getPositivePayments(order);
  const selectedOrderRefundPayments = getRefundPayments(order);
  const selectedOrderGrossPaid = getGrossPaidAmount(order);
  const selectedOrderRefunded = getRefundedAmount(order);

  const getRefundAllocations = (items: DisplayOrderItem[], refundedAmount: number) => {
    const allocations = new Map<string, number>();
    const refundableItems = items.filter((item) => item.refundedQuantity > 0 && item.refundAmount > 0);

    if (refundableItems.length === 0) {
      return allocations;
    }

    const totalRefundBase = refundableItems.reduce((sum, item) => sum + item.refundAmount, 0);
    const shouldAllocateFromPayments = refundedAmount > 0 && totalRefundBase > 0;
    let allocatedSoFar = 0;

    refundableItems.forEach((item, index) => {
      let allocated = item.refundAmount;
      if (shouldAllocateFromPayments) {
        if (index === refundableItems.length - 1) {
          allocated = roundCurrency(refundedAmount - allocatedSoFar);
        } else {
          allocated = roundCurrency((refundedAmount * item.refundAmount) / totalRefundBase);
          allocatedSoFar += allocated;
        }
      } else if (selectedOrderFinancials.subtotal > 0) {
        const ratio = item.refundAmount / selectedOrderFinancials.subtotal;
        const proportionalTax = selectedOrderFinancials.tax * ratio;
        const proportionalDiscount = selectedOrderFinancials.discount * ratio;
        allocated = roundCurrency(item.refundAmount + proportionalTax - proportionalDiscount);
      }
      allocations.set(getItemKey(item), Math.max(0, allocated));
    });

    return allocations;
  };

  const selectedRefundAllocations = getRefundAllocations(selectedOrderDisplayItems, selectedOrderRefunded);

  const getAdjustedRefundLineAmount = (item: DisplayOrderItem) => {
    if (item.refundedQuantity <= 0) return 0;

    const allocated = selectedRefundAllocations.get(getItemKey(item));
    if (typeof allocated === 'number' && allocated > 0) {
      return allocated;
    }

    if (selectedOrderFinancials.subtotal <= 0) {
      return item.refundAmount;
    }

    const ratio = item.refundAmount / selectedOrderFinancials.subtotal;
    const proportionalTax = selectedOrderFinancials.tax * ratio;
    const proportionalDiscount = selectedOrderFinancials.discount * ratio;
    return roundCurrency(item.refundAmount + proportionalTax - proportionalDiscount);
  };

  const selectedOrderRefundBase = selectedOrderDisplayItems.reduce(
    (sum, item) => sum + (item.refundAmount || 0),
    0,
  );
  const selectedOrderRefundTax =
    selectedOrderFinancials.subtotal > 0
      ? roundCurrency((selectedOrderRefundBase / selectedOrderFinancials.subtotal) * selectedOrderFinancials.tax)
      : 0;
  const selectedOrderRefundDiscount =
    selectedOrderFinancials.subtotal > 0
      ? roundCurrency((selectedOrderRefundBase / selectedOrderFinancials.subtotal) * selectedOrderFinancials.discount)
      : 0;
  const selectedOrderCompletedSubtotal = roundCurrency(selectedOrderFinancials.subtotal + selectedOrderRefundBase);
  const selectedOrderCompletedTax = roundCurrency(selectedOrderFinancials.tax + selectedOrderRefundTax);
  const selectedOrderCompletedDiscount = roundCurrency(selectedOrderFinancials.discount + selectedOrderRefundDiscount);
  const selectedOrderCompletedTotal = roundCurrency(
    selectedOrderCompletedSubtotal + selectedOrderCompletedTax - selectedOrderCompletedDiscount,
  );

  return (
    <EnhancedModal
      isOpen={true}
      onClose={onClose}
      title={`Order #${order.orderNumber || order.id}`}
      size="small"
      className="max-h-[550px] h-[550px]"
      hideScrollbar={true}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Date & Time
            </label>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <div className="mt-1">{getStatusBadge(order.status)}</div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer
            </label>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {order.customerName || 'Walk-in Customer'}
            </p>
            {order.customerEmail && (
              <p className="text-xs text-slate-500">{order.customerEmail.toLowerCase()}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cashier
            </label>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {order.cashierName || 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Payment Method
              {order.payments && order.payments.length > 1 ? 's' : ''}
            </label>
            {order.payments && order.payments.length > 0 ? (
              <div className="mt-2 space-y-2">
                {selectedOrderPositivePayments.map((payment, index) => (
                  <div
                    key={payment.id || index}
                    className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg"
                  >
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold uppercase">
                      {payment.method}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(payment.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                {selectedOrderRefundPayments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">
                      Refunded Amounts
                    </p>
                    {selectedOrderRefundPayments.map((payment, index) => (
                      <div
                        key={`refund-${payment.id || index}`}
                        className="flex items-center justify-between bg-amber-50 px-3 py-2 rounded-lg"
                      >
                        <span className="inline-flex items-center px-2 py-1 rounded bg-amber-600 text-white text-xs font-bold uppercase">
                          {payment.method}
                        </span>
                        <span className="text-sm font-bold text-amber-700">
                          -₹{Math.abs(Number(payment.amount || 0)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              getPaymentMethods(order.paymentMethod).length > 1 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {getPaymentMethods(order.paymentMethod).map((method, index) => (
                    <span key={`${method}-${index}`} className="inline-flex items-center px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold uppercase">
                      {method}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {order.paymentMethod}
                </p>
              )
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            Order Items
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedOrderDisplayItems.flatMap((item) => {
                  const soldSubtotal = roundCurrency((item.price || 0) * (item.originalQuantity || 0));

                  const soldRow = (
                    <tr key={`${item.id}-sold`}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{item.productName}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Sold</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                        {item.originalQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                        ₹{(item.price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                        ₹{soldSubtotal.toFixed(2)}
                      </td>
                    </tr>
                  );

                  if (item.refundedQuantity <= 0) {
                    return [soldRow];
                  }

                  const refundRow = (
                    <tr key={`${item.id}-refund`} className="bg-amber-50/40">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-amber-700">{item.productName}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                        <div className="text-[11px] font-semibold text-amber-600 mt-0.5">Refund</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-amber-700">
                        {item.refundedQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                        ₹{(item.price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-amber-700">
                        -₹{getAdjustedRefundLineAmount(item).toFixed(2)}
                      </td>
                    </tr>
                  );

                  return [soldRow, refundRow];
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t-2 border-slate-200 pt-4 space-y-2">
          {selectedOrderRefunded > 0 && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-1">
                Completed (Before Refund)
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">Subtotal:</span>
                <span className="font-bold text-slate-900">₹{selectedOrderCompletedSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">Tax:</span>
                <span className="font-bold text-slate-900">₹{selectedOrderCompletedTax.toFixed(2)}</span>
              </div>
              {selectedOrderCompletedDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-emerald-600">Discount:</span>
                  <span className="font-bold text-emerald-600">-₹{selectedOrderCompletedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">Completed Total:</span>
                <span className="font-bold text-slate-900">
                  ₹{(selectedOrderGrossPaid || selectedOrderCompletedTotal).toFixed(2)}
                </span>
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 pt-2">
                Refunded Portion
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">Refunded Base:</span>
                <span className="font-bold text-slate-900">₹{selectedOrderRefundBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">Refunded Tax:</span>
                <span className="font-bold text-slate-900">₹{selectedOrderRefundTax.toFixed(2)}</span>
              </div>
              {selectedOrderRefundDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-emerald-600">Refunded Discount:</span>
                  <span className="font-bold text-emerald-600">-₹{selectedOrderRefundDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="font-medium text-amber-600">Refunded Total:</span>
                <span className="font-bold text-amber-600">-₹{selectedOrderRefunded.toFixed(2)}</span>
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-2">
                Current (After Refund)
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-700">Subtotal:</span>
            <span className="font-bold text-slate-900">₹{selectedOrderFinancials.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-700">Tax:</span>
            <span className="font-bold text-slate-900">₹{selectedOrderFinancials.tax.toFixed(2)}</span>
          </div>
          {selectedOrderFinancials.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-medium text-emerald-600">Discount:</span>
              <span className="font-bold text-emerald-600">-₹{selectedOrderFinancials.discount.toFixed(2)}</span>
            </div>
          )}
          {selectedOrderRefunded > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-medium text-amber-600">Refunded:</span>
              <span className="font-bold text-amber-600">-₹{selectedOrderRefunded.toFixed(2)}</span>
            </div>
          )}
          {selectedOrderRefunded > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-700">Gross Paid:</span>
              <span className="font-bold text-slate-900">₹{selectedOrderGrossPaid.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg border-t-2 border-slate-200 pt-3">
            <span className="font-black text-slate-900">
              {selectedOrderRefunded > 0 ? 'NET TOTAL:' : 'TOTAL:'}
            </span>
            <span className="font-black text-emerald-600">
              ₹{selectedOrderFinancials.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default OrderDetailModal;
