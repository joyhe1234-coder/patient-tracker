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
export function isTitleRow(row: unknown[]): boolean {
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
 * Parse an Excel file buffer.
 * @param buffer - The file buffer to read
 * @param fileName - Original file name
 * @param options - Optional: sheet selection and header row override
 */
export function parseExcel(buffer: Buffer, fileName: string, options?: ParseOptions): ParseResult {
  // Use raw: true to prevent XLSX from auto-converting dates to serial numbers
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });

  // Select sheet: use options.sheetName if provided, otherwise first sheet
  let selectedSheetName: string;
  if (options?.sheetName) {
    if (!workbook.SheetNames.includes(options.sheetName)) {
      throw new Error(`Sheet "${options.sheetName}" not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }
    selectedSheetName = options.sheetName;
  } else {
    selectedSheetName = workbook.SheetNames[0];
    if (!selectedSheetName) {
      throw new Error('Excel file has no sheets');
    }
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  if (!worksheet) {
    throw new Error('Could not read worksheet');
  }

  // Convert to JSON with header row, preserving raw string values.
  // blankrows: true preserves physical row positions so headerRowIndex
  // (e.g., Sutter headerRow=3) points to the correct row even when
  // blank rows exist between the title rows and the header row.
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
    raw: true  // Preserve raw cell values (prevent date auto-conversion)
  }) as unknown[][];

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Determine header row index
  let headerRowIndex: number;
  if (options?.headerRow !== undefined) {
    // Use fixed header row index (0-indexed) from options
    headerRowIndex = options.headerRow;
    if (headerRowIndex < 0 || headerRowIndex >= jsonData.length) {
      throw new Error(`Header row index ${headerRowIndex} is out of range (0-${jsonData.length - 1})`);
    }
  } else {
    // Auto-detect: check if first row is a title row (skip if so)
    headerRowIndex = 0;
    if (isTitleRow(jsonData[0] as unknown[])) {
      headerRowIndex = 1;
    }
  }

  if (jsonData.length <= headerRowIndex) {
    throw new Error('Excel file has no data rows');
  }

  // Get headers from the header row
  const headerRow = jsonData[headerRowIndex] as unknown[];
  const headers = headerRow.map(h => String(h || '').trim());

  // Remaining rows are data (filter out completely blank rows from blankrows: true)
  const rows: ParsedRow[] = jsonData.slice(headerRowIndex + 1)
    .filter(row => {
      const arr = row as unknown[];
      return arr.some(cell => cell !== undefined && cell !== null && cell !== '');
    })
    .map(row => {
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
 * Options for parsing Excel files.
 * Used to select a specific sheet and/or override header row detection.
 */
export interface ParseOptions {
  /** Name of the sheet to parse. If omitted, the first sheet is used. */
  sheetName?: string;
  /** 0-indexed row number to use as the header row. If omitted, auto-detect via isTitleRow(). */
  headerRow?: number;
}

/**
 * Read workbook from buffer. Returns sheet names and workbook object.
 * Single XLSX.read() call for reuse — callers can access both sheet names
 * and the workbook without re-parsing.
 * @param buffer - The file buffer to read
 * @returns Object with sheetNames array and workbook object
 */
export function getWorkbookInfo(buffer: Buffer): { sheetNames: string[]; workbook: XLSX.WorkBook } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return { sheetNames: workbook.SheetNames, workbook };
}

/**
 * Read header rows from specified sheets in an already-loaded workbook.
 * No second XLSX.read() call — uses the workbook object directly.
 * @param workbook - The already-loaded workbook object
 * @param sheetNames - Array of sheet names to read headers from
 * @param headerRowIndex - 0-indexed row number containing headers
 * @returns Map of sheet name to array of trimmed header strings
 */
export function getSheetHeaders(
  workbook: XLSX.WorkBook,
  sheetNames: string[],
  headerRowIndex: number
): Map<string, string[]> {
  const headerMap = new Map<string, string[]>();

  for (const sheetName of sheetNames) {
    try {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        headerMap.set(sheetName, []);
        continue;
      }

      // Read sheet data using sheet_to_json with header: 1 to get raw arrays.
      // blankrows: true preserves physical row positions so headerRowIndex
      // maps correctly even when blank rows exist before the header.
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: true,
        raw: true,
      }) as unknown[][];

      // Handle out-of-bounds row index
      if (headerRowIndex < 0 || headerRowIndex >= jsonData.length) {
        headerMap.set(sheetName, []);
        continue;
      }

      // Apply the same title-row heuristic used by parseExcel():
      // when headerRowIndex is 0 and the first row looks like a report
      // title, advance to row 1 so validation matches actual parsing.
      let effectiveIndex = headerRowIndex;
      if (effectiveIndex === 0 && isTitleRow(jsonData[0] as unknown[]) && jsonData.length > 1) {
        effectiveIndex = 1;
      }

      const headerRow = jsonData[effectiveIndex] as unknown[];
      const headers = headerRow.map(h => String(h || '').trim());
      headerMap.set(sheetName, headers);
    } catch (error) {
      // Log error and return empty array for this sheet
      console.error(`Error reading headers from sheet "${sheetName}":`, error);
      headerMap.set(sheetName, []);
    }
  }

  return headerMap;
}

/**
 * Get all sheet names from an Excel workbook.
 * Useful for multi-sheet files (e.g., Sutter physician tabs).
 * Delegates to getWorkbookInfo() for single XLSX.read() reuse.
 * @param buffer - The file buffer to read
 * @returns Array of sheet names in workbook order
 */
export function getSheetNames(buffer: Buffer): string[] {
  return getWorkbookInfo(buffer).sheetNames;
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
