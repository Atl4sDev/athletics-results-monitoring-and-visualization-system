import { describe, it, expect } from 'vitest';
import { parseMarkToSortValue } from '../../../utils/time.util';

describe('parseMarkToSortValue', () => {
  it('is importable', () => {
    expect(typeof parseMarkToSortValue).toBe('function');
  });

  describe('null / empty input', () => {
    it('returns null for null', () => {
      expect(parseMarkToSortValue(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(parseMarkToSortValue(undefined)).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(parseMarkToSortValue('')).toBeNull();
    });

    it('returns null for a whitespace-only string', () => {
      // trim() reduces it to '', which is falsy after trimming -> regex never matches
      expect(parseMarkToSortValue('   ')).toBeNull();
    });
  });

  describe('SS.ss — single segment (sprints)', () => {
    it('parses a decimal sprint time', () => {
      expect(parseMarkToSortValue('10.45')).toBe(10.45);
    });

    it('parses a sub-10 sprint time', () => {
      expect(parseMarkToSortValue('9.58')).toBe(9.58);
    });

    it('parses an integer second value', () => {
      expect(parseMarkToSortValue('45')).toBe(45);
    });

    it('parses a value with no leading zero', () => {
      expect(parseMarkToSortValue('0.55')).toBe(0.55);
    });
  });

  describe('MM:SS.ss — two segments (middle distance)', () => {
    it('parses minutes and decimal seconds', () => {
      expect(parseMarkToSortValue('2:04.12')).toBe(124.12);
    });

    it('parses whole minutes with integer seconds', () => {
      expect(parseMarkToSortValue('1:30')).toBe(90);
    });

    it('parses exactly one minute', () => {
      expect(parseMarkToSortValue('1:00.00')).toBe(60);
    });

    it('parses a long middle-distance time', () => {
      // 13 min * 60 + 26.5 = 806.5
      expect(parseMarkToSortValue('13:26.50')).toBe(806.5);
    });
  });

  describe('HH:MM:SS.ss — three segments (race walk / marathon)', () => {
    it('parses hours, minutes, and decimal seconds', () => {
      // 1*3600 + 5*60 + 12 = 3912
      expect(parseMarkToSortValue('1:05:12.00')).toBe(3912);
    });

    it('parses exactly two hours', () => {
      expect(parseMarkToSortValue('2:00:00.00')).toBe(7200);
    });

    it('parses a marathon-length time with fractional seconds', () => {
      // 2*3600 + 1*60 + 9.55 = 7269.55
      expect(parseMarkToSortValue('2:01:09.55')).toBe(7269.55);
    });
  });

  describe('rounding to 3 decimal places (milliseconds)', () => {
    it('rounds up at the 4th decimal', () => {
      expect(parseMarkToSortValue('10.4567')).toBe(10.457);
    });

    it('rounds down at the 4th decimal', () => {
      expect(parseMarkToSortValue('10.4564')).toBe(10.456);
    });

    it('never returns more than 3 decimal places', () => {
      const value = parseMarkToSortValue('10.123456') as number;
      const decimals = value.toString().split('.')[1] ?? '';
      expect(decimals.length).toBeLessThanOrEqual(3);
    });
  });

  describe('non-numeric status strings are rejected', () => {
    it('returns null for DNF', () => {
      expect(parseMarkToSortValue('DNF')).toBeNull();
    });

    it('returns null for DQ', () => {
      expect(parseMarkToSortValue('DQ')).toBeNull();
    });

    it('returns null for DNS', () => {
      expect(parseMarkToSortValue('DNS')).toBeNull();
    });

    it('returns null for a mixed alphanumeric value', () => {
      expect(parseMarkToSortValue('10.45s')).toBeNull();
    });

    it('returns null when a comma is used as the decimal separator', () => {
      expect(parseMarkToSortValue('10,45')).toBeNull();
    });
  });

  describe('malformed numeric-looking input', () => {
    it('returns null for more than three colon-separated segments', () => {
      expect(parseMarkToSortValue('1:2:3:4')).toBeNull();
    });

    it('returns null for a lone colon (segments parse to NaN)', () => {
      expect(parseMarkToSortValue(':')).toBeNull();
    });

    it('returns null for a lone dot', () => {
      expect(parseMarkToSortValue('.')).toBeNull();
    });

    it('returns null for an empty trailing segment', () => {
      // "2:" -> parts ["2", ""], parseFloat("") = NaN
      expect(parseMarkToSortValue('2:')).toBeNull();
    });
  });

  describe('whitespace handling', () => {
    it('trims surrounding whitespace before parsing', () => {
      expect(parseMarkToSortValue('  10.45  ')).toBe(10.45);
    });
  });
});
