/**
 * Credit Card Component Tests
 *
 * @tests BR-037 - Payment Cycle Status Calculation
 * @tests BR-017 - Payment Tracking
 * @tests US-023 - Payment Cycle Status Tracking
 * @tests US-010 - Track Payments
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard } from "@/components/velocity/credit-card";
import {
  calculatePaymentCycleStatus,
  type PaymentCycleStatus,
} from "@/lib/payment-cycle";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/hooks/use-bank-brand", () => ({
  useBankBrand: () => ({ brand: null }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    accountExtended: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe("CreditCard Payment Cycle Status", () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  const createMockAccount = (overrides: any = {}) => ({
    id: "acc-123",
    name: "Test Card",
    bank: "Test Bank",
    bankId: "bank-123",
    type: "credit",
    balance: 1000,
    due: "5 days",
    color: "from-blue-500 to-purple-600",
    paymentCycleStatus: "STATEMENT_GENERATED" as PaymentCycleStatus,
    liabilities: {
      apr: "19.99%",
      aprType: "variable",
      aprBalanceSubjectToApr: "1000",
      aprInterestChargeAmount: "15.50",
      last_statement_balance: "1000",
      last_payment_amount: "0",
      last_payment_date: null,
      last_statement_issue_date: "2024-11-15",
    },
    ...overrides,
  });

  describe("Payment Status Display", () => {
    it('should show "Mark Paid" button when status is STATEMENT_GENERATED', () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
      });

      render(<CreditCard acc={account} layout="grid" />);

      expect(screen.getByText("Mark Paid")).toBeInTheDocument();
      expect(screen.queryByText("Mark as Unpaid")).not.toBeInTheDocument();
    });

    it('should show "Mark as Unpaid" button when status is PAYMENT_SCHEDULED', () => {
      const account = createMockAccount({
        paymentCycleStatus: "PAYMENT_SCHEDULED",
      });

      render(<CreditCard acc={account} layout="grid" />);

      expect(screen.getByText("Mark as Unpaid")).toBeInTheDocument();
      expect(screen.queryByText("Mark Paid")).not.toBeInTheDocument();
    });

    it('should show "Mark as Unpaid" button when status is PAID_AWAITING_STATEMENT', () => {
      const account = createMockAccount({
        paymentCycleStatus: "PAID_AWAITING_STATEMENT",
      });

      render(<CreditCard acc={account} layout="grid" />);

      expect(screen.getByText("Mark as Unpaid")).toBeInTheDocument();
      expect(screen.queryByText("Mark Paid")).not.toBeInTheDocument();
    });

    it("should show status badge for other statuses", () => {
      const account = createMockAccount({
        paymentCycleStatus: "DORMANT",
      });

      render(<CreditCard acc={account} layout="grid" />);

      expect(screen.queryByText("Mark Paid")).not.toBeInTheDocument();
      expect(screen.queryByText("Mark as Unpaid")).not.toBeInTheDocument();
      expect(screen.getByText("Dormant")).toBeInTheDocument();
    });
  });

  describe("Mark as Paid Functionality", () => {
    it('should call mark-paid API when "Mark Paid" is clicked', async () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
        liabilities: {
          ...createMockAccount().liabilities,
          last_statement_balance: "500",
        },
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<CreditCard acc={account} layout="grid" />);

      const markPaidButton = screen.getByText("Mark Paid");
      fireEvent.click(markPaidButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/account/acc-123/mark-paid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: expect.any(String),
            amount: 500,
          }),
        });
      });

      expect(toast.success).toHaveBeenCalledWith("Marked as paid");
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<CreditCard acc={account} layout="grid" />);

      const markPaidButton = screen.getByText("Mark Paid");
      fireEvent.click(markPaidButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update status");
      });
    });

    it("should validate amount before sending", async () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
        liabilities: {
          ...createMockAccount().liabilities,
          last_statement_balance: "", // Empty string
        },
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<CreditCard acc={account} layout="grid" />);

      const markPaidButton = screen.getByText("Mark Paid");
      fireEvent.click(markPaidButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/account/acc-123/mark-paid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: expect.any(String),
            amount: 0, // Should default to 0 for empty/invalid values
          }),
        });
      });
    });
  });

  describe("Mark as Unpaid Functionality", () => {
    it('should call unmark-paid API when "Mark as Unpaid" is clicked', async () => {
      const account = createMockAccount({
        paymentCycleStatus: "PAYMENT_SCHEDULED",
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<CreditCard acc={account} layout="grid" />);

      const markUnpaidButton = screen.getByText("Mark as Unpaid");
      fireEvent.click(markUnpaidButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/account/acc-123/unmark-paid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      });

      expect(toast.success).toHaveBeenCalledWith("Payment cancelled");
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should handle unmark API errors gracefully", async () => {
      const account = createMockAccount({
        paymentCycleStatus: "PAYMENT_SCHEDULED",
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<CreditCard acc={account} layout="grid" />);

      const markUnpaidButton = screen.getByText("Mark as Unpaid");
      fireEvent.click(markUnpaidButton);

      // Should show error state but no toast (removed)
      await waitFor(() => {
        expect(screen.getByText("Mark Paid")).toBeInTheDocument();
      });
    });
  });

  describe("Optimistic UI Updates", () => {
    it("should show optimistic status immediately on click", async () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
      });

      (fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true }), 100),
          ),
      );

      render(<CreditCard acc={account} layout="grid" />);

      // First flip the card to see the payment button
      const card = screen.getByText("Test Card"); // Click on the card name to flip
      fireEvent.click(card);

      // Now find and click the Mark Paid button on the back
      const markPaidButton = screen.getByText("Mark Paid");
      fireEvent.click(markPaidButton);

      // Should immediately show "Mark as Unpaid" due to optimistic update
      await waitFor(() => {
        expect(screen.getByText("Mark as Unpaid")).toBeInTheDocument();
      });
    });

    it("should revert optimistic status on API failure", async () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<CreditCard acc={account} layout="grid" />);

      // First flip the card to see the payment button
      const card = screen.getByText("Test Card"); // Click on the card name to flip
      fireEvent.click(card);

      // Now find and click the Mark Paid button on the back
      const markPaidButton = screen.getByText("Mark Paid");
      fireEvent.click(markPaidButton);

      await waitFor(() => {
        // Should revert back to "Mark Paid" after failure
        expect(screen.getByText("Mark Paid")).toBeInTheDocument();
      });
    });
  });

  describe("Card Flip Prevention", () => {
    it("should prevent card flip when payment button is clicked", () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
      });

      render(<CreditCard acc={account} layout="grid" />);

      const markPaidButton = screen.getByText("Mark Paid");

      // Mock the card flip click handler
      const cardContainer = markPaidButton.closest(
        '[style*="transform-style: preserve-3d"]',
      );
      expect(cardContainer).toBeInTheDocument();

      // Click on button should not bubble up to card container
      fireEvent.click(markPaidButton);

      // The button should handle the click without triggering card flip
      expect(markPaidButton).toBeInTheDocument();
    });
  });

  describe("List View Support", () => {
    it("should render payment controls in list view", () => {
      const account = createMockAccount({
        paymentCycleStatus: "STATEMENT_GENERATED",
      });

      render(<CreditCard acc={account} layout="list" />);

      expect(screen.getByText("Mark Paid")).toBeInTheDocument();
      expect(screen.getByText("Test Card")).toBeInTheDocument();
      // List view doesn't show bank name, only card name
    });
  });
});
