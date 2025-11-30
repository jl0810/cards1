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
  lastPaymentAmount: number | null;
  lastPaymentDate: Date | null;
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
    lastPaymentAmount,
    lastPaymentDate,
  } = data;

  const now = new Date();

  // Handle null/undefined values
  const statementBalance = lastStatementBalance ?? 0;
  const balance = currentBalance ?? 0;
  const paymentAmount = lastPaymentAmount ?? 0;

  // Calculate days since last statement
  let daysSinceIssue = Infinity;
  if (lastStatementIssueDate) {
    const issueDate = new Date(lastStatementIssueDate);
    daysSinceIssue = (now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  // Calculate days since last payment
  let daysSincePayment = Infinity;
  if (lastPaymentDate) {
    const paymentDate = new Date(lastPaymentDate);
    daysSincePayment = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  const isRecentStatement = daysSinceIssue < 30;
  const isRecentPayment = daysSincePayment < 30;

  // Helper for zero check (handle floating point)
  const isZero = (val: number) => Math.abs(val) < 0.01;
  const isPaidOff = balance < 0.01; // Less than 1 cent means paid (or credit)
  
  // Check if last payment covered the statement balance
  const paymentCoversStatement = paymentAmount > 0 && Math.abs(paymentAmount - statementBalance) < 1.0;

  console.log('[PAYMENT CYCLE]', {
    balance,
    statementBalance,
    paymentAmount,
    daysSinceIssue,
    daysSincePayment,
    isPaidOff,
    isRecentPayment,
    paymentCoversStatement,
    isZeroBalance: isZero(balance),
    isZeroStmt: isZero(statementBalance),
    rawBalance: currentBalance,
    rawStmt: lastStatementBalance
  });

  // Check for Dormant Account
  // Rule 1: No activity (Statement ~0 AND Current ~0)
  // Rule 2: Inactive for > 90 days (Statement > 90 days old AND Balance ~0)
  // Rule 3: No current balance and statement > 30 days old (likely paid and inactive)
  const isDormant =
    (isZero(statementBalance) && isZero(balance)) ||
    (daysSinceIssue > 90 && isZero(balance)) ||
    (daysSinceIssue > 30 && isZero(balance));

  if (isDormant) {
    console.log('[PAYMENT CYCLE] -> DORMANT');
    return 'DORMANT';
  }

  // Check for Payment Scheduled / Paid
  // Rule 1: User manually marked as paid
  // Rule 2: Current balance is effectively 0 or negative
  // Rule 3: Recent payment that covers the statement balance
  if (paymentMarkedPaidDate || isPaidOff || (isRecentPayment && paymentCoversStatement)) {
    // If it's a credit balance (negative) or zero, it's definitely "Paid"
    if (isPaidOff) {
      console.log('[PAYMENT CYCLE] -> PAID_AWAITING_STATEMENT (balance paid off)');
      return 'PAID_AWAITING_STATEMENT';
    }
    // If recent payment covered the statement, consider it paid
    if (isRecentPayment && paymentCoversStatement) {
      console.log('[PAYMENT CYCLE] -> PAID_AWAITING_STATEMENT (recent payment covers statement)');
      return 'PAID_AWAITING_STATEMENT';
    }
    console.log('[PAYMENT CYCLE] -> PAYMENT_SCHEDULED');
    return 'PAYMENT_SCHEDULED';
  }

  // Check for Statement Generated (Action Required)
  // Rule: You owe money on the last statement.
  if (statementBalance > 0) {
    // If statementBalance > 0 and currentBalance > 0 (checked above),
    // it means you have an unpaid bill.
    // Whether it's recent (< 30 days) or old (> 30 days), it's a liability.
    console.log('[PAYMENT CYCLE] -> STATEMENT_GENERATED');
    return 'STATEMENT_GENERATED';
  }

  // Fallback: Statement was $0 (or negative), so no payment is due.
  // Any current balance is new spend.
  console.log('[PAYMENT CYCLE] -> PAID_AWAITING_STATEMENT (fallback)');
  return 'PAID_AWAITING_STATEMENT';
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
        text: 'text-red-200',
        bg: 'bg-red-950',
      };
    case 'PAYMENT_SCHEDULED':
      return {
        badge: '⏳',
        text: 'text-yellow-200',
        bg: 'bg-yellow-950',
      };
    case 'PAID_AWAITING_STATEMENT':
      return {
        badge: '🟢',
        text: 'text-emerald-200',
        bg: 'bg-emerald-950',
      };
    case 'DORMANT':
      return {
        badge: '🌙',
        text: 'text-slate-300',
        bg: 'bg-slate-800',
      };
    default:
      return {
        badge: '❓',
        text: 'text-slate-300',
        bg: 'bg-slate-800',
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

/**
 * Enhanced sort comparator for credit card accounts
 * Sorts by:
 * 1. Payment cycle status priority (STATEMENT_GENERATED first)
 * 2. Days until due date (soonest first) for same status
 * 3. Days since last payment (oldest first) for same status
 * 
 * @implements BR-037 - Payment Cycle Status Calculation
 * @satisfies US-023 - Payment Cycle Status Tracking
 * 
 * @param a - First account with payment data
 * @param b - Second account with payment data
 * @returns Sort order (-1, 0, 1)
 */
export function sortAccountsByPaymentPriority(
  a: { 
    paymentCycleStatus: PaymentCycleStatus;
    nextPaymentDueDate: Date | null;
    lastPaymentDate: Date | null;
  },
  b: { 
    paymentCycleStatus: PaymentCycleStatus;
    nextPaymentDueDate: Date | null;
    lastPaymentDate: Date | null;
  }
): number {
  // Primary sort: Payment cycle status priority
  const priorityDiff = getPaymentCyclePriority(a.paymentCycleStatus) - getPaymentCyclePriority(b.paymentCycleStatus);
  if (priorityDiff !== 0) return priorityDiff;

  // Secondary sort: For STATEMENT_GENERATED, sort by due date (soonest first)
  if (a.paymentCycleStatus === 'STATEMENT_GENERATED' && b.paymentCycleStatus === 'STATEMENT_GENERATED') {
    if (a.nextPaymentDueDate && b.nextPaymentDueDate) {
      return a.nextPaymentDueDate.getTime() - b.nextPaymentDueDate.getTime();
    }
    if (a.nextPaymentDueDate) return -1; // a has due date, b doesn't
    if (b.nextPaymentDueDate) return 1;  // b has due date, a doesn't
  }

  // Tertiary sort: For PAID_AWAITING_STATEMENT, sort by last payment date (oldest first)
  // This helps surface cards that haven't been used in a while
  if (a.paymentCycleStatus === 'PAID_AWAITING_STATEMENT' && b.paymentCycleStatus === 'PAID_AWAITING_STATEMENT') {
    if (a.lastPaymentDate && b.lastPaymentDate) {
      return a.lastPaymentDate.getTime() - b.lastPaymentDate.getTime(); // Oldest first
    }
    if (a.lastPaymentDate) return -1; // a has payment date, b doesn't
    if (b.lastPaymentDate) return 1;  // b has payment date, a doesn't
  }

  return 0; // Equal priority
}
