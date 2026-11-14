import { describe, expect, it } from 'vitest';
import { escapeCsvCell, slugify, todayStamp, toCsv } from '../../src/lib/csv';

describe('escapeCsvCell', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvCell('John Doe')).toBe('John Doe');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('renders null and undefined as empty cells', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(escapeCsvCell('Doe, John')).toBe('"Doe, John"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });

  it('does not alter negative numbers passed as numbers', () => {
    expect(escapeCsvCell(-5)).toBe('-5');
  });
});

describe('toCsv', () => {
  it('joins header and rows with CRLF', () => {
    expect(
      toCsv(
        ['Name', 'Score'],
        [
          ['A, B', 1],
          ['C', null],
        ],
      ),
    ).toBe('Name,Score\r\n"A, B",1\r\nC,');
  });
});

describe('slugify / todayStamp', () => {
  it('creates file-name friendly slugs', () => {
    expect(slugify('Innovation & Design Thinking')).toBe('innovation-design-thinking');
    expect(slugify('***')).toBe('export');
  });

  it('formats the local date as YYYY-MM-DD', () => {
    expect(todayStamp(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
