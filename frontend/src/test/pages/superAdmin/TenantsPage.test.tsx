import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TenantsListPage from "../../../pages/superadmin/TenantsPage";
import api from "../../../services/api";

jest.mock("../../../services/api");

jest.mock("../../../components/ui/ConfirmModal", () => (props: any) => {
  if (!props.isOpen) return null;

  return (
    <div>
      <p>{props.title}</p>
      <button onClick={props.onConfirm}>Confirm</button>
      <button onClick={props.onClose}>Cancel</button>
    </div>
  );
});

jest.mock("../../../utils/toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

const mockTenant = {
  tenantId: "1",
  tenantName: "Bluepal",
  active: true,
  planType: "PRO",
  subscriptionStatus: "ACTIVE",
  subscriptionStartDate: "2024-01-01",
  nextBillingDate: "2024-02-01",
  monthlyPrice: 1000,
  currentUsers: 5,
  maxUsers: 10,
  currentBranches: 1,
  maxBranches: 5,
  currentProducts: 10,
  maxProducts: 100,
  createdAt: "2024-01-01",
  totalOrders: 50,
  totalRevenue: 20000,
};

const mockResponse = {
  data: {
    content: [mockTenant],
    totalPages: 1,
    totalElements: 1,
  },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <TenantsListPage />
    </MemoryRouter>
  );

describe("TenantsListPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test("renders tenants page title", async () => {
    mockedApi.get.mockResolvedValueOnce(mockResponse as any);

    renderPage();

    expect(screen.getByText("Platform Tenants")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Bluepal")).toBeInTheDocument();
    });
  });

  test("search tenant by name", async () => {
    mockedApi.get.mockResolvedValueOnce(mockResponse as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Bluepal")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by company name..."
    );

    fireEvent.change(searchInput, {
      target: { value: "Blue" },
    });

    expect(screen.getByText("Bluepal")).toBeInTheDocument();
  });

  test("opens confirm modal when clicking status button", async () => {
    mockedApi.get.mockResolvedValueOnce(mockResponse as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Bluepal")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /Active/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Deactivate Tenant|Activate Tenant/i)
      ).toBeInTheDocument();
    });
  });

  test("toggle tenant status", async () => {
    mockedApi.get.mockResolvedValueOnce(mockResponse as any);
    mockedApi.post.mockResolvedValueOnce({} as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Bluepal")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /Active/i });

    fireEvent.click(button);

    const confirmButton = await screen.findByText("Confirm");

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalled();
    });
  });
});