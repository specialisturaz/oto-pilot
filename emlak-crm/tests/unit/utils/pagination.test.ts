import { describe, it, expect } from 'vitest';
import { parsePaginationParams, createPaginatedResponse } from '../../../src/backend/utils/pagination';

// ---------------------------------------------------------------------------
// parsePaginationParams
// ---------------------------------------------------------------------------
describe('parsePaginationParams', () => {
  it('should return defaults when no params are provided', () => {
    const result = parsePaginationParams({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe('desc');
  });

  it('should parse valid page and limit', () => {
    const result = parsePaginationParams({ page: '3', limit: '10' });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(20); // (3-1) * 10
  });

  it('should handle numeric page and limit values', () => {
    const result = parsePaginationParams({ page: 5, limit: 25 });

    expect(result.page).toBe(5);
    expect(result.limit).toBe(25);
    expect(result.skip).toBe(100); // (5-1) * 25
  });

  it('should clamp page to 1 when page is less than 1', () => {
    const result = parsePaginationParams({ page: '-5' });

    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('should clamp page to 1 when page is zero', () => {
    const result = parsePaginationParams({ page: '0' });

    expect(result.page).toBe(1);
  });

  it('should use default limit when limit is negative', () => {
    const result = parsePaginationParams({ limit: '-10' });

    expect(result.limit).toBe(20);
  });

  it('should cap limit at MAX_LIMIT (100)', () => {
    const result = parsePaginationParams({ limit: '500' });

    expect(result.limit).toBe(100);
  });

  it('should use default limit when limit is exactly 100', () => {
    const result = parsePaginationParams({ limit: '100' });

    expect(result.limit).toBe(100);
  });

  it('should use default limit for non-numeric limit', () => {
    const result = parsePaginationParams({ limit: 'abc' });

    expect(result.limit).toBe(20);
  });

  it('should use default page for non-numeric page', () => {
    const result = parsePaginationParams({ page: 'xyz' });

    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('should accept custom sortBy field', () => {
    const result = parsePaginationParams({ sortBy: 'price' });

    expect(result.sortBy).toBe('price');
  });

  it('should accept ascending sort order', () => {
    const result = parsePaginationParams({ sortOrder: 'asc' });

    expect(result.sortOrder).toBe('asc');
  });

  it('should default to desc for invalid sortOrder', () => {
    const result = parsePaginationParams({ sortOrder: 'invalid' });

    expect(result.sortOrder).toBe('desc');
  });

  it('should default sortBy to created_at when not a string', () => {
    const result = parsePaginationParams({ sortBy: 123 });

    expect(result.sortBy).toBe('createdAt');
  });

  it('should calculate skip correctly for page 1', () => {
    const result = parsePaginationParams({ page: '1', limit: '15' });

    expect(result.skip).toBe(0);
  });

  it('should calculate skip correctly for large pages', () => {
    const result = parsePaginationParams({ page: '10', limit: '50' });

    expect(result.skip).toBe(450); // (10-1) * 50
  });
});

// ---------------------------------------------------------------------------
// createPaginatedResponse
// ---------------------------------------------------------------------------
describe('createPaginatedResponse', () => {
  it('should create a valid paginated response with data', () => {
    const items = [
      { id: '1', name: 'Kadikoy Dairesi' },
      { id: '2', name: 'Besiktas Villasi' },
    ];

    const response = createPaginatedResponse(items, 50, 1, 20);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(items);
    expect(response.data).toHaveLength(2);
    expect(response.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 50,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('should handle empty data array', () => {
    const response = createPaginatedResponse([], 0, 1, 20);

    expect(response.success).toBe(true);
    expect(response.data).toEqual([]);
    expect(response.pagination.total).toBe(0);
    expect(response.pagination.totalPages).toBe(0);
    expect(response.pagination.hasNext).toBe(false);
    expect(response.pagination.hasPrev).toBe(false);
  });

  it('should set hasNext to false on the last page', () => {
    const items = [{ id: '1', name: 'Uskudar Dairesi' }];
    const response = createPaginatedResponse(items, 41, 3, 20);

    // total 41, limit 20 => totalPages = 3
    expect(response.pagination.totalPages).toBe(3);
    expect(response.pagination.hasNext).toBe(false);
    expect(response.pagination.hasPrev).toBe(true);
  });

  it('should set hasPrev to true when page > 1', () => {
    const items = [{ id: '1', name: 'Sisli Ofisi' }];
    const response = createPaginatedResponse(items, 100, 2, 20);

    expect(response.pagination.hasPrev).toBe(true);
    expect(response.pagination.hasNext).toBe(true);
  });

  it('should correctly calculate totalPages with exact division', () => {
    const response = createPaginatedResponse([], 60, 1, 20);

    expect(response.pagination.totalPages).toBe(3); // 60 / 20 = 3
  });

  it('should correctly calculate totalPages with remainder', () => {
    const response = createPaginatedResponse([], 61, 1, 20);

    expect(response.pagination.totalPages).toBe(4); // ceil(61/20) = 4
  });

  it('should handle single item total', () => {
    const items = [{ id: '1', title: 'Ankara Cankaya Dairesi' }];
    const response = createPaginatedResponse(items, 1, 1, 20);

    expect(response.pagination.totalPages).toBe(1);
    expect(response.pagination.hasNext).toBe(false);
    expect(response.pagination.hasPrev).toBe(false);
  });

  it('should preserve the data type in the response', () => {
    interface Emlak {
      id: string;
      title: string;
      price: number;
      city: string;
    }

    const properties: Emlak[] = [
      { id: '1', title: '3+1 Daire Kadikoy', price: 5500000, city: 'Istanbul' },
      { id: '2', title: '2+1 Daire Cankaya', price: 3200000, city: 'Ankara' },
    ];

    const response = createPaginatedResponse(properties, 2, 1, 20);

    expect(response.data[0].price).toBe(5500000);
    expect(response.data[1].city).toBe('Ankara');
  });
});
