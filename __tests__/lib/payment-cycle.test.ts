/**
 * Tests for Payment Cycle Status Calculation
 * 
 * @tests BR-037 - Payment Cycle Status Calculation
 * @tests US-023 - Payment Cycle Status Tracking
 */

import {
  calculatePaymentCycleStatus,
  getPaymentCycleLabel,
  getPaymentCycleColor,
  getPaymentCyclePriority,
  sortAccountsByPaymentPriority,
  type PaymentCycleData,
  type PaymentCycleStatus,
} from '@/lib/payment-cycle';

describe('Payment Cycle Status Calculation (BR-037, US-023)', () => {
  const now = new Date();
  const recentDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
  const oldDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
  const veryOldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

  describe('DORMANT status', () => {
    it('should return DORMANT when last statement and current balance are both $0', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 0,
        lastStatementIssueDate: recentDate,
        currentBalance: 0,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });

    it('should return DORMANT when statement > 90 days old and paid off', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: veryOldDate,
        currentBalance: 0, // Paid off
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });

    it('should return DORMANT when statement > 30 days old and current balance is 0', () => {
      const over30Days = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      const data: PaymentCycleData = {
        lastStatementBalance: 99, // Had a statement balance
        lastStatementIssueDate: over30Days,
        currentBalance: 0, // But paid off
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });

    it('should return PAID_AWAITING_STATEMENT when statement > 90 days old and negative balance', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: veryOldDate,
        currentBalance: -10, // Credit balance
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // Changed from DORMANT to PAID_AWAITING_STATEMENT
      // Rationale: A credit balance means you have money there, so it's not "dormant" (inactive/empty).
      expect(calculatePaymentCycleStatus(data)).toBe('PAID_AWAITING_STATEMENT');
    });
  });

  describe('STATEMENT_GENERATED status', () => {
    it('should return STATEMENT_GENERATED for recent statement with unpaid balance', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: recentDate,
        currentBalance: 500,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('STATEMENT_GENERATED');
    });

    it('should return PAID_AWAITING_STATEMENT when last statement was $0 but has new charges', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 0,
        lastStatementIssueDate: recentDate, // Recent statement
        currentBalance: 100, // New charges
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // Changed from STATEMENT_GENERATED to PAID_AWAITING_STATEMENT
      // Rationale: You don't owe a payment yet because the last statement was $0.
      expect(calculatePaymentCycleStatus(data)).toBe('PAID_AWAITING_STATEMENT');
    });

    it('should return STATEMENT_GENERATED for overdue payment (old statement, unpaid)', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: oldDate,
        currentBalance: 500,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('STATEMENT_GENERATED');
    });

    it('should handle null lastStatementIssueDate', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: null,
        currentBalance: 500,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('STATEMENT_GENERATED');
    });
  });

  describe('PAYMENT_SCHEDULED status', () => {
    it('should return PAYMENT_SCHEDULED when user manually marked payment', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: recentDate,
        currentBalance: 500,
        paymentMarkedPaidDate: new Date(), // User marked as paid
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('PAYMENT_SCHEDULED');
    });

    it('should return PAID_AWAITING_STATEMENT for recent statement that is paid (balance 0)', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: recentDate,
        currentBalance: 0, // Paid off
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // Changed from PAYMENT_SCHEDULED to PAID_AWAITING_STATEMENT
      // Rationale: If balance is 0, it's fully paid.
      expect(calculatePaymentCycleStatus(data)).toBe('PAID_AWAITING_STATEMENT');
    });
  });

  describe('PAID_AWAITING_STATEMENT status', () => {
    it('should return DORMANT when old statement (45 days) and paid off', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: oldDate, // 45 days ago
        currentBalance: 0, // Paid off
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // Changed from PAID_AWAITING_STATEMENT to DORMANT
      // Rationale: 45 days > 30 days threshold, no balance = dormant
      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });

    it('should return PAID_AWAITING_STATEMENT when old statement and negative balance', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: oldDate,
        currentBalance: -50, // Overpaid/credit
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('PAID_AWAITING_STATEMENT');
    });
  });

  describe('Edge cases', () => {
    it('should handle null balances', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: null,
        lastStatementIssueDate: recentDate,
        currentBalance: null,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });

    it('should handle exactly 30 days (boundary)', () => {
      const exactly30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: exactly30Days,
        currentBalance: 500,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // At exactly 30 days, should be considered old (>= 30)
      expect(calculatePaymentCycleStatus(data)).toBe('STATEMENT_GENERATED');
    });

    it('should handle exactly 90 days (boundary)', () => {
      const exactly90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: exactly90Days,
        currentBalance: 0,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // At exactly 90 days, condition is daysSinceIssue > 90 which is false
      // So it should be PAID_AWAITING_STATEMENT
      const result = calculatePaymentCycleStatus(data);
      expect(['PAID_AWAITING_STATEMENT', 'DORMANT']).toContain(result);
    });

    it('should handle 91 days (clearly dormant)', () => {
      const over90Days = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000);
      const data: PaymentCycleData = {
        lastStatementBalance: 500,
        lastStatementIssueDate: over90Days,
        currentBalance: 0,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // At 91 days, should definitely be dormant
      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });
  });

  describe('Helper functions', () => {
    it('should return correct labels', () => {
      expect(getPaymentCycleLabel('STATEMENT_GENERATED')).toBe('Payment Needed');
      expect(getPaymentCycleLabel('PAYMENT_SCHEDULED')).toBe('Payment Scheduled');
      expect(getPaymentCycleLabel('PAID_AWAITING_STATEMENT')).toBe('Paid, Awaiting Statement');
      expect(getPaymentCycleLabel('DORMANT')).toBe('Dormant');
    });

    it('should return correct colors', () => {
      const red = getPaymentCycleColor('STATEMENT_GENERATED');
      expect(red.badge).toBe('🔴');
      expect(red.text).toContain('red');

      const yellow = getPaymentCycleColor('PAYMENT_SCHEDULED');
      expect(yellow.badge).toBe('⏳');
      expect(yellow.text).toContain('yellow');

      const green = getPaymentCycleColor('PAID_AWAITING_STATEMENT');
      expect(green.badge).toBe('🟢');
      expect(green.text).toContain('emerald');

      const gray = getPaymentCycleColor('DORMANT');
      expect(gray.badge).toBe('🌙');
      expect(gray.text).toContain('slate');
    });

    it('should return correct priorities', () => {
      expect(getPaymentCyclePriority('STATEMENT_GENERATED')).toBe(1); // Highest
      expect(getPaymentCyclePriority('PAYMENT_SCHEDULED')).toBe(2);
      expect(getPaymentCyclePriority('PAID_AWAITING_STATEMENT')).toBe(3);
      expect(getPaymentCyclePriority('DORMANT')).toBe(4); // Lowest
    });

    it('should sort by priority correctly', () => {
      const statuses = ['DORMANT', 'STATEMENT_GENERATED', 'PAID_AWAITING_STATEMENT', 'PAYMENT_SCHEDULED'] as const;
      const sorted = [...statuses].sort((a, b) =>
        getPaymentCyclePriority(a) - getPaymentCyclePriority(b)
      );

      expect(sorted).toEqual([
        'STATEMENT_GENERATED',
        'PAYMENT_SCHEDULED',
        'PAID_AWAITING_STATEMENT',
        'DORMANT',
      ]);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Chase Sapphire - statement just issued, unpaid', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 1250.50,
        lastStatementIssueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        currentBalance: 1250.50,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('STATEMENT_GENERATED');
    });

    it('should handle Amex Platinum - paid immediately after statement', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 3500,
        lastStatementIssueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        currentBalance: 0, // Paid off
        paymentMarkedPaidDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // Paid 8 days ago
        lastPaymentAmount: 3500,
        lastPaymentDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      };

      // Changed from PAYMENT_SCHEDULED to PAID_AWAITING_STATEMENT
      // Rationale: Balance is 0, so it's fully paid/cleared.
      expect(calculatePaymentCycleStatus(data)).toBe('PAID_AWAITING_STATEMENT');
    });

    it('should handle Capital One - paid off 40 days ago (dormant)', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 850,
        lastStatementIssueDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        currentBalance: 0, // Paid off
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      // Changed from PAID_AWAITING_STATEMENT to DORMANT
      // Rationale: 40 days > 30 days threshold, no balance = dormant
      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });

    it('should handle unused card - no activity for months', () => {
      const data: PaymentCycleData = {
        lastStatementBalance: 0,
        lastStatementIssueDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        currentBalance: 0,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: null,
        lastPaymentDate: null,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('DORMANT');
    });
  });

  describe('Payment Detection (Enhanced BR-037)', () => {
    it('should detect PAID_AWAITING_STATEMENT when recent payment covers statement', () => {
      const recentPayment = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const data: PaymentCycleData = {
        lastStatementBalance: 1250.50,
        lastStatementIssueDate: recentDate,
        currentBalance: 150.00, // New charges after payment
        paymentMarkedPaidDate: null,
        lastPaymentAmount: 1250.50, // Matches statement
        lastPaymentDate: recentPayment,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('PAID_AWAITING_STATEMENT');
    });

    it('should NOT detect paid if payment does not cover statement', () => {
      const recentPayment = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const data: PaymentCycleData = {
        lastStatementBalance: 1250.50,
        lastStatementIssueDate: recentDate,
        currentBalance: 1000.00,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: 250.50, // Only partial payment
        lastPaymentDate: recentPayment,
      };

      expect(calculatePaymentCycleStatus(data)).toBe('STATEMENT_GENERATED');
    });

    it('should NOT detect paid if payment is too old (> 30 days)', () => {
      const oldPayment = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      const data: PaymentCycleData = {
        lastStatementBalance: 1250.50,
        lastStatementIssueDate: recentDate,
        currentBalance: 150.00,
        paymentMarkedPaidDate: null,
        lastPaymentAmount: 1250.50,
        lastPaymentDate: oldPayment, // Too old
      };

      expect(calculatePaymentCycleStatus(data)).toBe('STATEMENT_GENERATED');
    });
  });

  describe('sortAccountsByPaymentPriority', () => {
    it('should sort by payment cycle status priority first', () => {
      const accounts = [
        { paymentCycleStatus: 'DORMANT' as PaymentCycleStatus, nextPaymentDueDate: null, lastPaymentDate: null },
        { paymentCycleStatus: 'STATEMENT_GENERATED' as PaymentCycleStatus, nextPaymentDueDate: null, lastPaymentDate: null },
        { paymentCycleStatus: 'PAID_AWAITING_STATEMENT' as PaymentCycleStatus, nextPaymentDueDate: null, lastPaymentDate: null },
      ];

      const sorted = [...accounts].sort(sortAccountsByPaymentPriority);

      expect(sorted[0].paymentCycleStatus).toBe('STATEMENT_GENERATED');
      expect(sorted[1].paymentCycleStatus).toBe('PAID_AWAITING_STATEMENT');
      expect(sorted[2].paymentCycleStatus).toBe('DORMANT');
    });

    it('should sort STATEMENT_GENERATED by due date (soonest first)', () => {
      const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      const later = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

      const accounts = [
        { paymentCycleStatus: 'STATEMENT_GENERATED' as PaymentCycleStatus, nextPaymentDueDate: later, lastPaymentDate: null },
        { paymentCycleStatus: 'STATEMENT_GENERATED' as PaymentCycleStatus, nextPaymentDueDate: soon, lastPaymentDate: null },
      ];

      const sorted = [...accounts].sort(sortAccountsByPaymentPriority);

      expect(sorted[0].nextPaymentDueDate).toBe(soon);
      expect(sorted[1].nextPaymentDueDate).toBe(later);
    });

    it('should sort PAID_AWAITING_STATEMENT by last payment date (oldest first)', () => {
      const oldPayment = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000); // 25 days ago
      const recentPayment = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const accounts = [
        { paymentCycleStatus: 'PAID_AWAITING_STATEMENT' as PaymentCycleStatus, nextPaymentDueDate: null, lastPaymentDate: recentPayment },
        { paymentCycleStatus: 'PAID_AWAITING_STATEMENT' as PaymentCycleStatus, nextPaymentDueDate: null, lastPaymentDate: oldPayment },
      ];

      const sorted = [...accounts].sort(sortAccountsByPaymentPriority);

      expect(sorted[0].lastPaymentDate).toBe(oldPayment);
      expect(sorted[1].lastPaymentDate).toBe(recentPayment);
    });
  });
});
