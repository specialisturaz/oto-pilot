/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { cn, formatPrice, formatPriceShort, formatPhone, formatDate, formatArea } from '../../../src/frontend/lib/utils';

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------
describe('formatPrice', () => {
  it('should format a standard Turkish property price', () => {
    const result = formatPrice(1500000);
    // Turkish locale uses dot as thousand separator
    expect(result).toBe('1.500.000 ₺');
  });

  it('should format zero', () => {
    expect(formatPrice(0)).toBe('0 ₺');
  });

  it('should format a small price', () => {
    expect(formatPrice(5000)).toBe('5.000 ₺');
  });

  it('should format a large Istanbul villa price', () => {
    const result = formatPrice(25000000);
    expect(result).toBe('25.000.000 ₺');
  });

  it('should format a very large price (100 million TL)', () => {
    const result = formatPrice(100000000);
    expect(result).toBe('100.000.000 ₺');
  });

  it('should handle decimal values by rounding', () => {
    const result = formatPrice(1500000.75);
    // maximumFractionDigits: 0 means no decimals
    expect(result).toBe('1.500.001 ₺');
  });

  it('should format rental price', () => {
    expect(formatPrice(15000)).toBe('15.000 ₺');
  });
});

// ---------------------------------------------------------------------------
// formatPriceShort
// ---------------------------------------------------------------------------
describe('formatPriceShort', () => {
  it('should format millions with M suffix', () => {
    const result = formatPriceShort(1500000);
    expect(result).toBe('1,5M ₺');
  });

  it('should format exact millions', () => {
    expect(formatPriceShort(2000000)).toBe('2,0M ₺');
  });

  it('should format thousands with K suffix', () => {
    expect(formatPriceShort(15000)).toBe('15K ₺');
  });

  it('should format values below 1000 as regular price', () => {
    const result = formatPriceShort(500);
    expect(result).toBe('500 ₺');
  });

  it('should format exactly 1 million', () => {
    expect(formatPriceShort(1000000)).toBe('1,0M ₺');
  });

  it('should format exactly 1 thousand', () => {
    expect(formatPriceShort(1000)).toBe('1K ₺');
  });
});

// ---------------------------------------------------------------------------
// formatPhone
// ---------------------------------------------------------------------------
describe('formatPhone', () => {
  it('should format a 10-digit Turkish mobile number', () => {
    expect(formatPhone('5551234567')).toBe('0 (555) 123 45 67');
  });

  it('should format a number starting with 0', () => {
    expect(formatPhone('05551234567')).toBe('0 (555) 123 45 67');
  });

  it('should format a number starting with +90', () => {
    expect(formatPhone('+905551234567')).toBe('0 (555) 123 45 67');
  });

  it('should format a number starting with 90', () => {
    expect(formatPhone('905551234567')).toBe('0 (555) 123 45 67');
  });

  it('should return original input for invalid length', () => {
    expect(formatPhone('123')).toBe('123');
  });

  it('should strip non-digit characters', () => {
    expect(formatPhone('(555) 123-4567')).toBe('0 (555) 123 45 67');
  });

  it('should handle an Istanbul landline', () => {
    expect(formatPhone('2161234567')).toBe('0 (216) 123 45 67');
  });

  it('should handle Ankara landline', () => {
    expect(formatPhone('3121234567')).toBe('0 (312) 123 45 67');
  });

  it('should return original for empty string', () => {
    expect(formatPhone('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('should format a date string in Turkish locale', () => {
    const result = formatDate('2024-03-15');
    expect(result).toBe('15 Mart 2024');
  });

  it('should format a Date object', () => {
    const date = new Date(2025, 0, 1); // January 1, 2025
    const result = formatDate(date);
    expect(result).toBe('1 Ocak 2025');
  });

  it('should format with custom pattern', () => {
    const result = formatDate('2024-12-31', 'dd.MM.yyyy');
    expect(result).toBe('31.12.2024');
  });

  it('should handle Turkish month names correctly', () => {
    // Test various months
    expect(formatDate('2024-01-15')).toContain('Ocak');
    expect(formatDate('2024-06-15')).toContain('Haziran');
    expect(formatDate('2024-09-15')).toContain('Eylul'); // Eylul in Turkish
    expect(formatDate('2024-12-15')).toContain('Aralik'); // Aralik in Turkish
  });

  it('should format ISO date string', () => {
    const result = formatDate('2026-03-28T10:30:00.000Z');
    expect(result).toContain('28');
    expect(result).toContain('Mart');
    expect(result).toContain('2026');
  });
});

// ---------------------------------------------------------------------------
// cn (className merger)
// ---------------------------------------------------------------------------
describe('cn', () => {
  it('should merge simple class names', () => {
    expect(cn('p-4', 'bg-white')).toBe('p-4 bg-white');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('btn', isActive && 'btn-active');
    expect(result).toBe('btn btn-active');
  });

  it('should filter out falsy values', () => {
    expect(cn('base', false, null, undefined, 'extra')).toBe('base extra');
  });

  it('should merge conflicting Tailwind classes (last wins)', () => {
    // twMerge should resolve p-4 vs p-2 to the last one
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle array input via clsx', () => {
    expect(cn(['p-4', 'text-lg'])).toBe('p-4 text-lg');
  });

  it('should merge conflicting text colors', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should keep non-conflicting classes', () => {
    expect(cn('p-4', 'mt-2', 'text-lg', 'font-bold')).toBe('p-4 mt-2 text-lg font-bold');
  });
});

// ---------------------------------------------------------------------------
// formatArea
// ---------------------------------------------------------------------------
describe('formatArea', () => {
  it('should format square meters with m2 symbol', () => {
    expect(formatArea(120)).toBe('120 m\u00B2');
  });

  it('should format zero area', () => {
    expect(formatArea(0)).toBe('0 m\u00B2');
  });

  it('should format large area', () => {
    expect(formatArea(500)).toBe('500 m\u00B2');
  });
});
