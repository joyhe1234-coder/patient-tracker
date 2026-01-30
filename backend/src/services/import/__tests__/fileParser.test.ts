/**
 * Unit tests for fileParser.ts
 * Tests CSV and Excel parsing with title row detection
 */

import { describe, it, expect } from '@jest/globals';
import { parseCSV, parseExcel, parseFile, validateRequiredColumns } from '../fileParser.js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test data files
const testDataDir = path.join(__dirname, '../../../../../test-data');

describe('fileParser', () => {
  describe('parseCSV', () => {
    it('should parse CSV with headers on first row', () => {
      const csv = 'Name,DOB,Phone\nJohn Smith,01/15/1990,5551234567';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['Name', 'DOB', 'Phone']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]['Name']).toBe('John Smith');
      expect(result.dataStartRow).toBe(2); // Headers on row 1, data starts row 2
    });

    it('should parse CSV with multiple rows', () => {
      const csv = 'Name,DOB\nJohn,01/01/1990\nJane,02/02/1985\nBob,03/03/1970';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.rows).toHaveLength(3);
      expect(result.totalRows).toBe(3);
    });

    it('should handle empty values', () => {
      const csv = 'Name,DOB,Phone\nJohn,,5551234567\n,01/01/1990,';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.rows[0]['DOB']).toBeUndefined();
      expect(result.rows[1]['Name']).toBeUndefined();
      expect(result.rows[1]['Phone']).toBeUndefined();
    });

    it('should detect and skip title row', () => {
      const csv = 'Report Generated 2026-01-01\nName,DOB,Phone\nJohn,01/15/1990,5551234567';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['Name', 'DOB', 'Phone']);
      expect(result.rows).toHaveLength(1);
      expect(result.dataStartRow).toBe(3); // Title row 1, headers row 2, data row 3
    });

    it('should detect title row with "All (" pattern', () => {
      const csv = 'All (Active Patients)\nPatient,DOB,Phone\nSmith,01/01/1980,5551234567';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['Patient', 'DOB', 'Phone']);
      expect(result.dataStartRow).toBe(3);
    });

    it('should trim whitespace from headers and values', () => {
      const csv = '  Name  ,  DOB  \n  John Smith  ,  01/15/1990  ';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['Name', 'DOB']);
      expect(result.rows[0]['Name']).toBe('John Smith');
      expect(result.rows[0]['DOB']).toBe('01/15/1990');
    });

    it('should handle quoted values with commas', () => {
      const csv = 'Name,Address\n"Smith, John","123 Main St, Apt 4"';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.rows[0]['Name']).toBe('Smith, John');
      expect(result.rows[0]['Address']).toBe('123 Main St, Apt 4');
    });

    it('should throw error for empty CSV', () => {
      const buffer = Buffer.from('');

      expect(() => parseCSV(buffer, 'empty.csv')).toThrow(); // Throws parsing error
    });

    it('should detect title row with "--" pattern', () => {
      const csv = '-- Report Data --\nName,DOB,Phone\nJohn,01/15/1990,5551234567';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['Name', 'DOB', 'Phone']);
      expect(result.dataStartRow).toBe(3); // Title row 1, headers row 2, data row 3
    });

    it('should detect sparse title row (few values in many columns)', () => {
      // Title row with only first cell filled, rest empty (more than 10 columns)
      const csv = 'Report Title,,,,,,,,,,,,,\nA,B,C,D,E,F,G,H,I,J,K,L,M,N\nV1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']);
      expect(result.dataStartRow).toBe(3);
    });
  });

  describe('parseExcel', () => {
    /**
     * Helper to create an Excel buffer from data
     */
    function createExcelBuffer(data: unknown[][]): Buffer {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }

    it('should parse Excel with headers on first row', () => {
      const data = [
        ['Name', 'DOB', 'Phone'],
        ['John Smith', '01/15/1990', '5551234567']
      ];
      const buffer = createExcelBuffer(data);

      const result = parseExcel(buffer, 'test.xlsx');

      expect(result.headers).toEqual(['Name', 'DOB', 'Phone']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]['Name']).toBe('John Smith');
      expect(result.fileType).toBe('xlsx');
      expect(result.dataStartRow).toBe(2); // Headers on row 1, data starts row 2
    });

    it('should parse Excel with multiple rows', () => {
      const data = [
        ['Name', 'DOB'],
        ['John', '01/01/1990'],
        ['Jane', '02/02/1985'],
        ['Bob', '03/03/1970']
      ];
      const buffer = createExcelBuffer(data);

      const result = parseExcel(buffer, 'test.xlsx');

      expect(result.rows).toHaveLength(3);
      expect(result.totalRows).toBe(3);
    });

    it('should handle empty values in Excel', () => {
      const data = [
        ['Name', 'DOB', 'Phone'],
        ['John', '', '5551234567'],
        ['', '01/01/1990', '']
      ];
      const buffer = createExcelBuffer(data);

      const result = parseExcel(buffer, 'test.xlsx');

      expect(result.rows[0]['DOB']).toBeUndefined();
      expect(result.rows[1]['Name']).toBeUndefined();
      expect(result.rows[1]['Phone']).toBeUndefined();
    });

    it('should detect and skip title row in Excel', () => {
      const data = [
        ['Report Generated 2026-01-01'],
        ['Name', 'DOB', 'Phone'],
        ['John', '01/15/1990', '5551234567']
      ];
      const buffer = createExcelBuffer(data);

      const result = parseExcel(buffer, 'test.xlsx');

      expect(result.headers).toEqual(['Name', 'DOB', 'Phone']);
      expect(result.rows).toHaveLength(1);
      expect(result.dataStartRow).toBe(3); // Title row 1, headers row 2, data row 3
    });

    it('should throw error for empty Excel', () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      expect(() => parseExcel(buffer, 'empty.xlsx')).toThrow('Excel file is empty');
    });

    // Note: "Excel file has no sheets" and "Could not read worksheet" errors (lines 124, 129)
    // are defensive checks that can't easily be triggered in tests since the XLSX library
    // validates workbooks before we can pass them to our parser.

    it('should throw error for Excel with only title row', () => {
      // Create a sparse title row (only first cell has content)
      const data = [
        ['Report Title', '', '', '', '', '', '', '', '', '', '', '', '', '']
      ];
      const buffer = createExcelBuffer(data);

      expect(() => parseExcel(buffer, 'titleonly.xlsx')).toThrow('Excel file has no data rows');
    });

    it('should trim whitespace from headers and values in Excel', () => {
      const data = [
        ['  Name  ', '  DOB  '],
        ['  John Smith  ', '  01/15/1990  ']
      ];
      const buffer = createExcelBuffer(data);

      const result = parseExcel(buffer, 'test.xlsx');

      expect(result.headers).toEqual(['Name', 'DOB']);
      expect(result.rows[0]['Name']).toBe('John Smith');
      expect(result.rows[0]['DOB']).toBe('01/15/1990');
    });
  });

  describe('parseFile', () => {
    /**
     * Helper to create an Excel buffer from data
     */
    function createExcelBuffer(data: unknown[][]): Buffer {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }

    it('should parse CSV file by extension', () => {
      const csv = 'Name,DOB\nJohn,01/01/1990';
      const buffer = Buffer.from(csv);

      const result = parseFile(buffer, 'test.csv');

      expect(result.fileType).toBe('csv');
      expect(result.fileName).toBe('test.csv');
    });

    it('should parse xlsx file by extension', () => {
      const data = [
        ['Name', 'DOB'],
        ['John', '01/01/1990']
      ];
      const buffer = createExcelBuffer(data);

      const result = parseFile(buffer, 'test.xlsx');

      expect(result.fileType).toBe('xlsx');
      expect(result.fileName).toBe('test.xlsx');
    });

    it('should parse xls file by extension', () => {
      const data = [
        ['Name', 'DOB'],
        ['John', '01/01/1990']
      ];
      const buffer = createExcelBuffer(data);

      const result = parseFile(buffer, 'test.xls');

      expect(result.fileType).toBe('xlsx');
      expect(result.fileName).toBe('test.xls');
    });

    it('should throw error for unsupported file type', () => {
      const buffer = Buffer.from('some data');

      expect(() => parseFile(buffer, 'test.txt')).toThrow('Unsupported file type');
    });

    it('should handle uppercase file extensions', () => {
      const csv = 'Name,DOB\nJohn,01/01/1990';
      const buffer = Buffer.from(csv);

      const result = parseFile(buffer, 'test.CSV');

      expect(result.fileType).toBe('csv');
    });
  });

  describe('validateRequiredColumns', () => {
    it('should return valid when all required columns present', () => {
      const headers = ['Patient', 'DOB', 'Phone', 'Address'];
      const required = ['Patient', 'DOB'];

      const result = validateRequiredColumns(headers, required);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return invalid with missing columns', () => {
      const headers = ['Patient', 'Phone'];
      const required = ['Patient', 'DOB', 'Address'];

      const result = validateRequiredColumns(headers, required);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('DOB');
      expect(result.missing).toContain('Address');
    });

    it('should be case-insensitive', () => {
      const headers = ['PATIENT', 'dob', 'Phone'];
      const required = ['patient', 'DOB'];

      const result = validateRequiredColumns(headers, required);

      expect(result.valid).toBe(true);
    });
  });

  describe('with test data files', () => {
    it('should parse test-valid.csv correctly', () => {
      const csvPath = path.join(testDataDir, 'test-valid.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-valid.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = parseCSV(buffer, 'test-valid.csv');

      expect(result.totalRows).toBe(10);
      expect(result.headers).toContain('Patient');
      expect(result.headers).toContain('DOB');
      expect(result.dataStartRow).toBe(2); // No title row
    });

    it('should parse test-validation-errors.csv correctly', () => {
      const csvPath = path.join(testDataDir, 'test-validation-errors.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-validation-errors.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = parseCSV(buffer, 'test-validation-errors.csv');

      expect(result.totalRows).toBe(10);
      // Row 3 should have empty name
      expect(result.rows[1]['Patient']).toBeUndefined();
    });

    it('should parse test-no-measures.csv correctly', () => {
      const csvPath = path.join(testDataDir, 'test-no-measures.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-no-measures.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = parseCSV(buffer, 'test-no-measures.csv');

      expect(result.totalRows).toBe(10);
      // Check that some rows have empty measure columns
      const noMeasurePatient = result.rows.find(r => r['Patient']?.includes('NoMeasures'));
      expect(noMeasurePatient).toBeDefined();
    });
  });
});
