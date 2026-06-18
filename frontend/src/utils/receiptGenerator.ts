import { CartItem } from '../features/pos/Cart';

export interface ReceiptData {
  orderId: string | number;
  transactionOrderId?: number;
  orderDate: Date;
  cashierName: string;
  customerName?: string;
  customerEmail?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  payments?: Array<{
    method: string;
    amount: number;
    transactionId?: string;
  }>;
  amountPaid: number;
  change: number;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
}

export interface CompanyInfo {
  name: string;
  storeName: string;
  displayStoreName: string;
  address: string;
  phone: string;
  email: string;
  taxId?: string;
  logo?: string;
}

/**
 * Generate HTML receipt for printing or email
 */
export const generateReceiptHTML = (receiptData: ReceiptData, companyInfo: CompanyInfo): string => {
  const {
    orderId,
    orderDate,
    cashierName,
    customerName,
    items,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod,
    amountPaid,
    change,
    loyaltyPointsEarned,
    loyaltyPointsRedeemed,
  } = receiptData;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt #${orderId}</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
      .no-print {
        display: none !important;
      }
    }
    body {
      font-family: 'Courier New', monospace;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      color: #000;
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    body::-webkit-scrollbar {
      display: none;
    }
    .receipt {
      border: 1.5px solid #000;
      padding: 20px;
      border-radius: 4px;
    }
    .header {
      text-align: center;
      border-bottom: none;
      padding-bottom: 15px;
      margin-bottom: 15px;
      position: relative;
      min-height: 50px;
    }
    .logo {
      max-width: 50px;
      max-height: 50px;
      position: absolute;
      top: 0;
      left: 0;
      margin: 10px;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 5px;
      margin-top: 10px;
    }
    .company-info {
      font-size: 12px;
      line-height: 1.4;
    }
    .order-info {
      margin-bottom: 15px;
      font-size: 12px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    .order-info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .items {
      margin-bottom: 15px;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
    }
    .item {
      margin-bottom: 8px;
      font-size: 13px;
    }
    .item-name {
      font-weight: bold;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      margin-top: 2px;
    }
    .totals {
      margin-bottom: 15px;
      font-size: 13px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .total-row.grand-total {
      font-size: 16px;
      font-weight: bold;
      border-top: 2px solid #000;
      padding-top: 8px;
      margin-top: 8px;
    }
    .payment {
      margin-bottom: 15px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      font-size: 13px;
    }
    .loyalty {
      background: #f0f0f0;
      padding: 10px;
      margin-bottom: 15px;
      border: 1px solid #000;
      font-size: 12px;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px dashed #000;
    }
    .thank-you {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header">
      <img src="${companyInfo.logo || 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png'}" alt="${companyInfo.storeName || companyInfo.name}" class="logo" />
      <div class="company-name">${companyInfo.displayStoreName}</div>
      <div class="branch-name" style="font-size:16px; font-weight:500; margin-bottom:6px;">${companyInfo.name || companyInfo.storeName}</div>
      <div class="company-info">
        ${companyInfo.address}<br/>
        ${companyInfo.phone}<br/>
        ${companyInfo.email}
        ${companyInfo.taxId ? `<br/>Tax ID: ${companyInfo.taxId}` : ''}
      </div>
    </div>
    <!-- Order Info -->
    <div class="order-info">
      <div class="order-info-row">
        <span>Order #:</span>
        <span><strong>${orderId}</strong></span>
      </div>
      <div class="order-info-row">
        <span>Date:</span>
        <span>${formatDate(orderDate)}</span>
      </div>
      <div class="order-info-row">
        <span>Time:</span>
        <span>${formatTime(orderDate)}</span>
      </div>
      <div class="order-info-row">
        <span>Cashier:</span>
        <span>${cashierName}</span>
      </div>
      ${customerName
      ? `
      <div class="order-info-row">
        <span>Customer:</span>
        <span>${customerName}</span>
      </div>
      `
      : ''
    }
    </div>
    <!-- Items -->
    <div class="items">
      ${items
      .map(
        (item) => `
        <div class="item">
          <div class="item-name">${item.name}</div>
          <div class="item-details">
            <span>${item.quantity} × ₹${item.price.toFixed(2)}</span>
            <span>₹${item.subtotal.toFixed(2)}</span>
          </div>
          ${item.discount > 0
            ? `
          <div class="item-details" style="color: #059669;">
            <span>Discount (${item.discount}%)</span>
            <span>-₹${((item.price * item.quantity * item.discount) / 100).toFixed(2)}</span>
          </div>
          `
            : ''
          }
        </div>
      `,
      )
      .join('')}
    </div>
    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>₹${subtotal.toFixed(2)}</span>
      </div>
      ${discount > 0
      ? `
      <div class="total-row" style="color: #059669;">
        <span>Discount:</span>
        <span>-₹${discount.toFixed(2)}</span>
      </div>
      `
      : ''
    }
     <div class="total-row">
        <span>Tax:</span>
        <span>₹${(tax || 0).toFixed(2)}</span>
      </div>
      
      <div class="total-row grand-total">
        <span>Total:</span>
        <span>₹${(total || 0).toFixed(2)}</span>
      </div>
    </div>
    <!-- Payment -->
    <div class="payment">
      <div class="total-row">
        <span>Payment Method:</span>
        <span>${paymentMethod}</span>
      </div>
      <div class="total-row">
        <span>Amount Paid:</span>
        <span>₹${amountPaid.toFixed(2)}</span>
      </div>
      ${change > 0
      ? `
      <div class="total-row">
        <span>Change:</span>
        <span>₹${change.toFixed(2)}</span>
      </div>
      `
      : ''
    }
    </div>
    <!-- Loyalty Points -->
    ${loyaltyPointsEarned && loyaltyPointsEarned > 0
      ? `
    <div class="loyalty">
      <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">
        🎁 LOYALTY REWARDS 🎁
      </div>
      <div class="total-row">
        <span>Points Earned:</span>
        <span><strong>+${loyaltyPointsEarned} pts</strong></span>
      </div>
      <div style="text-align: center; margin-top: 5px; font-size: 10px;">
        Thank you for your loyalty!
      </div>
    </div>
    `
      : ''
    }
    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">We appreciate your business!</div>
      <div style="font-size:13px; margin-bottom:8px;">Your satisfaction is our priority.</div>
      <div style="margin-top: 10px;">
        <strong>Contact us:</strong> ${companyInfo.email}<br/>
        <span style="font-size:12px; color:#059669;">Follow us on social media for offers and updates!</span>
      </div>
      <div style="margin-top: 8px; font-size:12px; color:#888;">Powered by PayPoint POS</div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Format date as MM/DD/YYYY
 */
const formatDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

/**
 * Format time as HH:MM AM/PM
 */
const formatTime = (date: Date): string => {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};


/**
 * Print receipt by opening in new window
 */
export const printReceipt = (receiptData: ReceiptData, companyInfo: CompanyInfo): void => {
  const html = generateReceiptHTML(receiptData, companyInfo);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener,noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

/**
 * Email receipt to customer
 */
export const emailReceipt = async (
  receiptData: ReceiptData,
  companyInfo: CompanyInfo,
  customerEmail: string,
): Promise<void> => {
  const html = generateReceiptHTML(receiptData, companyInfo);

  // Call backend API to send email
  const response = await fetch('/api/receipts/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: customerEmail,
      subject: `Receipt #${receiptData.orderId} - ${companyInfo.name}`,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send receipt email');
  }
};

/**
 * Download receipt as HTML file
 */
export const downloadReceipt = (receiptData: ReceiptData, companyInfo: CompanyInfo): void => {
  const html = generateReceiptHTML(receiptData, companyInfo);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${receiptData.orderId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
