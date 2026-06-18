export type BranchStatus = 'ACTIVE' | 'INACTIVE' | 'TEMPORARILY_CLOSED';

export interface Branch {
  id: number;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  status: BranchStatus;
  managerId: number;
  managerName?: string | null;
  openingTime: string; // "09:00:00"
  closingTime: string; // "21:00:00"
  taxRate: number;
  isMainBranch: boolean;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}