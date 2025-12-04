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

jest.mock("@/components/shared/plaid-link-with-family", () => {
  return function MockPlaidLinkWithFamily() {
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
    div: ({ children, onClick, ...props }: any) => (
      <div onClick={onClick} {...props}>
        {children}
      </div>
    ),
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
  AlertCircle: () => null,
  AlertTriangle: () => null,
}));

jest.mock("@/components/velocity/family-member-selector", () => ({
  FamilyMemberSelector: () => null,
}));

jest.mock("@/components/velocity/linked-card-display", () => ({
  LinkedCardDisplay: () => null,
}));

// Mock Sheet components
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetDescription: ({ children }: any) => <div>{children}</div>,
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("BankAccountsView", () => {
  const mockItems = [
    {
      id: "1",
      status: "active",
      institutionName: "Chase",
      accounts: [],
      familyMemberId: "member1",
      bankId: "chase",
    },
    {
      id: "2", 
      status: "needs_reauth",
      institutionName: "Wells Fargo",
      accounts: [],
      familyMemberId: "member2",
      bankId: "wells",
    },
    {
      id: "3",
      status: "disconnected", 
      institutionName: "Bank of America",
      accounts: [],
      familyMemberId: "member1",
      bankId: "boa",
    },
  ];

  const mockFamilyMembers = [
    { id: "member1", name: "John Smith", avatar: null, isPrimary: true },
    { id: "member2", name: "Sarah Davis", avatar: null, isPrimary: false },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render warning badge when connections need attention", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        items: mockItems,
        family: mockFamilyMembers,
      }),
    });

    render(<BankAccountsView activeUser="all" onLinkSuccess={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/2 Needs Update/)).toBeInTheDocument();
    });
  });

  it("should not show warning badge when all connections are active", async () => {
    const activeItems = mockItems.map(item => ({ ...item, status: "active" }));

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        items: activeItems,
        family: mockFamilyMembers,
      }),
    });

    render(<BankAccountsView activeUser="all" onLinkSuccess={() => {}} />);

    await waitFor(() => {
      expect(screen.queryByText(/Needs Update/)).not.toBeInTheDocument();
    });
  });

  it("should show singular 'Need Update' for single problematic connection", async () => {
    const singleProblemItem = [mockItems[1]]; // Only the needs_reauth item

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        items: singleProblemItem,
        family: mockFamilyMembers,
      }),
    });

    render(<BankAccountsView activeUser="all" onLinkSuccess={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/1 Need Update/)).toBeInTheDocument();
    });
  });
});

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

  const setupFetchMock = (items = mockItems, family = []) => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === "/api/plaid/items") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: items }),
        });
      }
      if (url === "/api/user/family") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: family }),
        });
      }
      if (url.includes("/disconnect")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  };

  it("should call POST /disconnect endpoint instead of DELETE when disconnecting", async () => {
    setupFetchMock();

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    // Click the card to open the sheet
    fireEvent.click(screen.getByText("Chase"));

    // Wait for sheet to open and find disconnect button
    await waitFor(() => {
      expect(screen.getByTestId("sheet")).toBeInTheDocument();
    });

    // Mock the confirm dialog
    global.confirm = jest.fn(() => true);

    const disconnectButton = screen.getByTitle("Disconnect Bank");
    fireEvent.click(disconnectButton);

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
    setupFetchMock();
    global.confirm = jest.fn(() => false);

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Chase"));

    await waitFor(() => {
      expect(screen.getByTitle("Disconnect Bank")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Disconnect Bank"));

    expect(global.confirm).toHaveBeenCalledWith(
      "Disconnect Chase? This will stop syncing but preserve your data.",
    );
  });

  it("should not disconnect if user cancels confirmation", async () => {
    setupFetchMock();
    global.confirm = jest.fn(() => false);

    render(<BankAccountsView activeUser="all" />);

    await waitFor(() => {
      expect(screen.getByText("Chase")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Chase"));

    await waitFor(() => {
      expect(screen.getByTitle("Disconnect Bank")).toBeInTheDocument();
    });

    const initialFetchCount = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByTitle("Disconnect Bank"));

    // Should not make any additional fetch calls (beyond the initial ones)
    expect(global.fetch).toHaveBeenCalledTimes(initialFetchCount);
  });
});

describe("BankAccountsView - Business Rule Compliance", () => {
  it("should never permanently delete items (BR-034)", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    // Mock empty items
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === "/api/plaid/items") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

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
