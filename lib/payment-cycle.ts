/**
 * Payment Cycle Status Calculation
 * 
 * Automatically categorizes credit card accounts into 4 payment cycle statuses
 * based on Plaid liability data and user actions.
 * 
 * @module lib/payment-cycle
 * @implements BR-037 - Payment Cycle Status Calculation
 * @satisfies US-023 - Payment Cycle Status Tracking
 */

export type PaymentCycleStatus = 
  | 'STATEMENT_GENERATED'      // Payment needed (< 30 days, unpaid)
  | 'PAYMENT_SCHEDULED'         // User marked as paid
  | 'PAID_AWAITING_STATEMENT'  // Paid off, waiting for next statement
  | 'DORMANT';                  // No activity

export interface PaymentCycleData {
  lastStatementBalance: number | null;
  lastStatementIssueDate: Date | null;
  currentBalance: number | null;
  paymentMarkedPaidDate: Date | null;
}

/**
 * Calculate payment cycle status for a credit card account
 * 
 * Logic based on Google Apps Script implementation:
 * - Checks for dormant accounts first (no activity)
 * - Then checks statement age (< 30 days = recent)
 * - Then checks if paid (current balance <= 0)
 * - Finally checks user manual payment flag
 * 
 * @param data - Payment cycle data from Plaid and user input
 * @returns Payment cycle status
 */
export function calculatePaymentCycleStatus(data: PaymentCycleData): PaymentCycleStatus {
  const {
    lastStatementBalance,
    lastStatementIssueDate,
    currentBalance,
    paymentMarkedPaidDate,
  } = data;

  const now = new Date();
  
  // Handle null/undefined values
  const statementBalance = lastStatementBalance ?? 0;
  const balance = currentBalance ?? 0;
  
  // Calculate days since last statement
  let daysSinceIssue = Infinity;
  if (lastStatementIssueDate) {
    const issueDate = new Date(lastStatementIssueDate);
    daysSinceIssue = (now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24);
  }
  
  const isRecentStatement = daysSinceIssue < 30;
  const isPaid = balance <= 0;
  
  // Check for dormant account
  // Dormant if: (last statement was $0 AND current balance is $0) OR (statement > 90 days old AND paid)
  const isDormant = 
    (statementBalance === 0 && balance === 0) || 
    (daysSinceIssue > 90 && isPaid);
  
  if (isDormant) {
    return 'DORMANT';
  }
  
  // Recent statement (< 30 days)
  if (isRecentStatement) {
    if (!isPaid) {
      // Recent statement, not paid yet
      // Check if user manually marked as paid
      if (paymentMarkedPaidDate) {
        return 'PAYMENT_SCHEDULED';
      }
      return 'STATEMENT_GENERATED';
    } else {
      // Recent statement, already paid
      return 'PAYMENT_SCHEDULED';
    }
  }
  
  // Older statement (> 30 days)
  if (!isRecentStatement) {
    if (isPaid) {
      // Paid off, waiting for next statement
      return 'PAID_AWAITING_STATEMENT';
    } else {
      // Not paid, statement is old
      // Check if there was a balance on last statement
      if (statementBalance > 0) {
        // Check if user marked as paid
        if (paymentMarkedPaidDate) {
          return 'PAYMENT_SCHEDULED';
        }
        // Overdue - treat as statement generated (needs attention)
        return 'STATEMENT_GENERATED';
      } else {
        // Last statement was $0, so new charges accruing
        return 'STATEMENT_GENERATED';
      }
    }
  }
  
  // Default fallback
  return 'STATEMENT_GENERATED';
}

/**
 * Get human-readable label for payment cycle status
 */
export function getPaymentCycleLabel(status: PaymentCycleStatus): string {
  switch (status) {
    case 'STATEMENT_GENERATED':
      return 'Payment Needed';
    case 'PAYMENT_SCHEDULED':
      return 'Payment Scheduled';
    case 'PAID_AWAITING_STATEMENT':
      return 'Paid, Awaiting Statement';
    case 'DORMANT':
      return 'Dormant';
    default:
      return 'Unknown';
  }
}

/**
 * Get color/badge indicator for payment cycle status
 */
export function getPaymentCycleColor(status: PaymentCycleStatus): {
  badge: string;
  text: string;
  bg: string;
} {
  switch (status) {
    case 'STATEMENT_GENERATED':
      return {
        badge: '🔴',
        text: 'text-red-700',
        bg: 'bg-red-50',
      };
    case 'PAYMENT_SCHEDULED':
      return {
        badge: '⏳',
        text: 'text-yellow-700',
        bg: 'bg-yellow-50',
      };
    case 'PAID_AWAITING_STATEMENT':
      return {
        badge: '🟢',
        text: 'text-green-700',
        bg: 'bg-green-50',
      };
    case 'DORMANT':
      return {
        badge: '⚪',
        text: 'text-gray-700',
        bg: 'bg-gray-50',
      };
    default:
      return {
        badge: '❓',
        text: 'text-gray-700',
        bg: 'bg-gray-50',
      };
  }
}

/**
 * Get priority/sort order for payment cycle status
 * Lower number = higher priority (needs attention first)
 */
export function getPaymentCyclePriority(status: PaymentCycleStatus): number {
  switch (status) {
    case 'STATEMENT_GENERATED':
      return 1; // Highest priority - needs payment
    case 'PAYMENT_SCHEDULED':
      return 2; // Medium priority - payment pending
    case 'PAID_AWAITING_STATEMENT':
      return 3; // Low priority - all good
    case 'DORMANT':
      return 4; // Lowest priority - inactive
    default:
      return 5;
  }
}
