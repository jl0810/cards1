/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BankAccountsView } from "@/components/velocity/bank-accounts-view";

// Mock dependencies
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    promise: jest.fn(),
  },
}));

jest.mock("@/components/shared/plaid-link", () => {
  return function MockPlaidLink() {
    return <button>Connect Bank Account</button>;
  };
});

jest.mock("@/components/velocity/card-product-matcher", () => ({
  CardProductMatcher: () => null,
}));

jest.mock("@/hooks/use-bank-brand", () => ({
  useBankBrand: () => ({ brand: null, loading: false }),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock("lucide-react", () => ({
  Building2: () => null,
  CreditCard: () => null,
  Plus: () => null,
  Trash2: () => null,
  RefreshCw: () => null,
  Users: () => null,
  Link: () => null,
}));

jest.mock("@/components/velocity/family-member-selector", () => ({
  FamilyMemberSelector: () => null,
}));

jest.mock("@/components/velocity/linked-card-display", () => ({
  LinkedCardDisplay: () => null,
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("BankAccountsView - Disconnect Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockItems = [
    {
      id: "item-1",
      itemId: "plaid-item-1",
      institutionId: "chase",
      institutionName: "Chase",
      status: "active",
      familyMemberId: "member-1",
      bankId: "bank-1",
      accounts: [
        {
          id: "acc-1",
          name: "Chase Sapphire",
          mask: "1234",
          currentBalance: 1000,
          isoCurrencyCode: "USD",
          officialName: "Chase Sapphire Preferred",
          extended: null,
        },
      ],
    },
  ];

  it("should call POST /disconnect endpoint instead of DELETE when disconnecting", async () => {
    // Mock initial fetch for items
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockItems }),
      }),
    );

    // Mock family members fetch
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    );

    const { container } = render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    // Mock disconnect endpoint
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }),
    );

    // Mock the confirm dialog
    global.confirm = jest.fn(() => true);

    // Find and click disconnect button (trash icon)
    const disconnectButton = container.querySelector(
      '[title="Disconnect Bank"]',
    );
    expect(disconnectButton).toBeInTheDocument();

    fireEvent.click(disconnectButton!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/plaid/items/item-1/disconnect",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    // Verify it did NOT call DELETE
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/plaid/items/item-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("should show confirmation dialog with data preservation message", async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockItems }),
      }),
    );

    global.confirm = jest.fn(() => false);

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    const disconnectButton = screen.getByTitle("Disconnect Bank");
    fireEvent.click(disconnectButton);

    expect(global.confirm).toHaveBeenCalledWith(
      "Disconnect Chase? This will stop syncing but preserve your data.",
    );
  });

  it("should refresh data after successful disconnect", async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockItems }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ ...mockItems[0], status: "disconnected" }],
            }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        }),
      );

    global.confirm = jest.fn(() => true);

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    const disconnectButton = screen.getByTitle("Disconnect Bank");
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      // Should have called fetch 5 times:
      // 1. Initial items fetch
      // 2. Initial family fetch
      // 3. Disconnect POST
      // 4. Refresh fetch items
      // 5. Refresh fetch family
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });
  });

  it("should handle disconnect errors gracefully", async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockItems }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        }),
      );

    global.confirm = jest.fn(() => true);

    const { toast } = require("sonner");

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    const disconnectButton = screen.getByTitle("Disconnect Bank");
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to disconnect bank");
    });
  });

  it("should not disconnect if user cancels confirmation", async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockItems }),
      }),
    );

    global.confirm = jest.fn(() => false);

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    const initialFetchCount = (global.fetch as jest.Mock).mock.calls.length;

    const disconnectButton = screen.getByTitle("Disconnect Bank");
    fireEvent.click(disconnectButton);

    // Should not make any additional fetch calls
    expect(global.fetch).toHaveBeenCalledTimes(initialFetchCount);
  });
});

describe("BankAccountsView - Business Rule Compliance", () => {
  it("should never permanently delete items (BR-034)", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    );

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("No accounts linked")).toBeInTheDocument();
    });

    // Verify no DELETE endpoints are ever called
    const allCalls = fetchSpy.mock.calls;
    allCalls.forEach(([url, options]) => {
      if (url?.toString().includes("/api/plaid/items/")) {
        expect(options?.method).not.toBe("DELETE");
      }
    });

    fetchSpy.mockRestore();
  });
});
