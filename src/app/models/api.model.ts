export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ApiResult<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
}
