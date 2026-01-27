import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: string | undefined;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  /** 1-indexed spreadsheet row number where data starts (after headers) */
  dataStartRow: number;
}

export interface ParseError {
  row?: number;
  message: string;
}

/**
 * Parse a CSV file buffer
 */
export function parseCSV(buffer: Buffer, fileName: string): ParseResult {
  const content = buffer.toString('utf-8');

  const result = Papa.parse(content, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map((e: Papa.ParseError) => e.message).join(', ');
    throw new Error(`CSV parsing error: ${errorMessages}`);
  }

  const data = result.data as string[][];

  if (data.length === 0) {
    throw new Error('CSV file is empty');
  }

  // First row is headers
  const headers = data[0].map(h => (h || '').trim());

  // Remaining rows are data
  const rows: ParsedRow[] = data.slice(1).map(row => {
    const obj: ParsedRow = {};
    headers.forEach((header, index) => {
      obj[header] = row[index]?.trim() || undefined;
    });
    return obj;
  });

  // Check if first row is a title row
  let headerRowIndex = 0;
  if (isTitleRow(data[0])) {
    headerRowIndex = 1;
    // Re-parse with correct header row
    const actualHeaders = data[headerRowIndex].map(h => (h || '').trim());
    const actualRows: ParsedRow[] = data.slice(headerRowIndex + 1).map(row => {
      const obj: ParsedRow = {};
      actualHeaders.forEach((header, index) => {
        obj[header] = row[index]?.trim() || undefined;
      });
      return obj;
    });
    return {
      headers: actualHeaders,
      rows: actualRows,
      totalRows: actualRows.length,
      fileName,
      fileType: 'csv',
      dataStartRow: headerRowIndex + 2  // 1-indexed: title row + header row + 1
    };
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName,
    fileType: 'csv',
    dataStartRow: 2  // 1-indexed: header row at 1, data starts at 2
  };
}

/**
 * Detect if a row is a title/report info row (not actual headers)
 * Title rows typically have content only in the first cell
 */
function isTitleRow(row: unknown[]): boolean {
  if (!row || row.length === 0) return false;

  // Check if first cell looks like a title (contains report info patterns)
  const firstCell = String(row[0] || '').toLowerCase();
  if (firstCell.includes('report generated') ||
      firstCell.includes('all (') ||
      firstCell.includes('--')) {
    return true;
  }

  // Check if most cells after the first are empty
  const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '');
  if (nonEmptyCells.length <= 2 && row.length > 10) {
    return true;
  }

  return false;
}

/**
 * Parse an Excel file buffer
 */
export function parseExcel(buffer: Buffer, fileName: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file has no sheets');
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('Could not read worksheet');
  }

  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false
  }) as unknown[][];

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Check if first row is a title row (skip if so)
  let headerRowIndex = 0;
  if (isTitleRow(jsonData[0] as unknown[])) {
    headerRowIndex = 1;
  }

  if (jsonData.length <= headerRowIndex) {
    throw new Error('Excel file has no data rows');
  }

  // Get headers from the header row
  const headerRow = jsonData[headerRowIndex] as unknown[];
  const headers = headerRow.map(h => String(h || '').trim());

  // Remaining rows are data
  const rows: ParsedRow[] = jsonData.slice(headerRowIndex + 1).map(row => {
    const rowArray = row as unknown[];
    const obj: ParsedRow = {};
    headers.forEach((header, index) => {
      const value = rowArray[index];
      obj[header] = value !== undefined && value !== null && value !== ''
        ? String(value).trim()
        : undefined;
    });
    return obj;
  });

  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName,
    fileType: 'xlsx',
    dataStartRow: headerRowIndex + 2  // 1-indexed: headerRowIndex is 0 or 1, +1 for 1-index, +1 for data after header
  };
}

/**
 * Parse a file based on its extension
 */
export function parseFile(buffer: Buffer, fileName: string): ParseResult {
  const extension = fileName.toLowerCase().split('.').pop();

  switch (extension) {
    case 'csv':
      return parseCSV(buffer, fileName);
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer, fileName);
    default:
      throw new Error(`Unsupported file type: ${extension}. Please upload a CSV or Excel file.`);
  }
}

/**
 * Validate that required columns exist in the parsed data
 */
export function validateRequiredColumns(
  headers: string[],
  requiredColumns: string[]
): { valid: boolean; missing: string[] } {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  const missing = requiredColumns.filter(col => !headerSet.has(col.toLowerCase()));

  return {
    valid: missing.length === 0,
    missing
  };
}
