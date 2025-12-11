/**
 * Tests for Credit Card Component
 *
 * @implements BR-032 - Card Product Matching
 * @satisfies US-019 - Link Card Product
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreditCard } from "@/components/velocity/credit-card";
import { useBankBrand } from "@/hooks/use-bank-brand";

// Mock hooks
jest.mock("@/hooks/use-bank-brand", () => ({
  useBankBrand: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

describe("Credit Card Component", () => {
  const mockAccount = {
    id: "acc_123",
    userId: "user_123",
    bank: "Chase",
    name: "Sapphire Preferred",
    mask: "1234",
    balance: 5000.5,
    due: "2023-12-31",
    type: "credit",
    color: "#000000",
    liabilities: {
      apr: "15.99%",
      aprType: "variable",
      aprBalanceSubjectToApr: "1000",
      aprInterestChargeAmount: "0",
      limit: "10000",
      min_due: "25.00",
      last_statement: "450.00",
      next_due_date: "2023-12-31",
      last_statement_date: "2023-12-01",
      last_payment_amount: "450.00",
      last_payment_date: "2023-11-25",
      status: "Current",
    },
  };

  beforeEach(() => {
    (useBankBrand as jest.Mock).mockReturnValue({ brand: null });
  });

  it("should render card details correctly", () => {
    render(<CreditCard acc={mockAccount} layout="grid" />);

    expect(screen.getByText("Chase")).toBeInTheDocument();
    expect(screen.getByText("Sapphire Preferred")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
    expect(screen.getByText("$5,000.50")).toBeInTheDocument();
  });

  it("should toggle flip state on click", () => {
    render(<CreditCard acc={mockAccount} layout="grid" />);

    // Initial state (front)
    expect(screen.getByText("$5,000.50")).toBeVisible();

    // Click to flip
    const cardContent = screen.getByText("$5,000.50");
    fireEvent.click(cardContent);

    // Should show back details (liabilities)
    expect(screen.getByText("Statement Bal")).toBeVisible();
    expect(screen.getByText("Min Payment")).toBeVisible();
  });

  it("should render list layout correctly", () => {
    render(<CreditCard acc={mockAccount} layout="list" />);

    expect(screen.getByText("Sapphire Preferred")).toBeInTheDocument();
    // List view specific elements
    expect(screen.getByText("Statement")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("should display overdue status correctly", () => {
    const overdueAccount = {
      ...mockAccount,
      due: "Overdue",
    };
    render(<CreditCard acc={overdueAccount} layout="list" />);

    const overdueElement = screen.getByText("Overdue");
    expect(overdueElement).toHaveClass("text-red-400");
  });
});
