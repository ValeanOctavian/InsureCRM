export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterParams {
  field: string;
  value: string | number | boolean | null;
  operator?: "eq" | "neq" | "contains" | "gt" | "gte" | "lt" | "lte";
}

export type ActionResponse<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  roles?: string[];
}
