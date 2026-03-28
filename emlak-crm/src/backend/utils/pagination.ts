export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  let page = Number(query.page) || DEFAULT_PAGE;
  if (page < 1) page = DEFAULT_PAGE;

  let limit = Number(query.limit) || DEFAULT_LIMIT;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;

  return { page, limit, skip, sortBy, sortOrder };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
