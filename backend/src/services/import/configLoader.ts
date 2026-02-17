import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
export interface MeasureColumnMapping {
  requestType: string;
  qualityMeasure: string;
}

export interface StatusMapping {
  compliant: string;
  nonCompliant: string;
}

/**
 * Action mapping entry for Sutter config.
 * Maps a regex pattern (applied to "Possible Actions Needed" text)
 * to a requestType, qualityMeasure, and measureStatus tuple.
 */
export interface ActionMappingEntry {
  pattern: string;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
}

/**
 * Skip tab pattern for Sutter config.
 * Defines how to match tab names that should be excluded from import.
 */
export interface SkipTabPattern {
  type: 'suffix' | 'prefix' | 'exact' | 'contains';
  value: string;
}

/**
 * Column definition for configurable preview columns.
 * System configs can declare additional columns for the import preview.
 */
export interface PreviewColumnDef {
  field: string;
  label: string;
  source: string;
}

/**
 * Required columns derived from system config for header validation.
 * Used by validateSheetHeaders() to determine if a sheet is valid.
 */
export interface RequiredColumns {
  patientColumns: string[];
  dataColumns: string[];
  minDataColumns: number;
}

/**
 * Shared base fields for all system configurations.
 */
export interface SystemConfigBase {
  name: string;
  version: string;
  patientColumns: Record<string, string>;
  /** Optional preview columns for enhanced import preview display */
  previewColumns?: PreviewColumnDef[];
  /** 0-indexed row number containing headers. Defaults to 0 if not specified. */
  headerRow?: number;
}

/**
 * Hill-specific config (wide format).
 * Uses Q1/Q2 suffix column matching with measure columns.
 */
export interface HillSystemConfig extends SystemConfigBase {
  format?: 'wide';
  measureColumns: Record<string, MeasureColumnMapping>;
  statusMapping: Record<string, StatusMapping>;
  skipColumns: string[];
}

/**
 * Sutter-specific config (long format).
 * Uses direct column mapping with action-based measure resolution.
 */
export interface SutterSystemConfig extends SystemConfigBase {
  format: 'long';
  headerRow: number;
  dataColumns: string[];
  requestTypeMapping: Record<string, {
    requestType: string | null;
    qualityMeasure: string | null;
  }>;
  actionMapping: ActionMappingEntry[];
  skipActions: string[];
  skipTabs: SkipTabPattern[];
}

/**
 * Discriminated union of all system configurations.
 * Use isSutterConfig() or isHillConfig() type guards to narrow.
 */
export type SystemConfig = HillSystemConfig | SutterSystemConfig;

/**
 * Type guard: returns true if config is a Sutter/long-format config.
 */
export function isSutterConfig(config: SystemConfig): config is SutterSystemConfig {
  return (config as SutterSystemConfig).format === 'long';
}

/**
 * Type guard: returns true if config is a Hill/wide-format config.
 */
export function isHillConfig(config: SystemConfig): config is HillSystemConfig {
  return !isSutterConfig(config);
}

export interface SystemInfo {
  name: string;
  configFile: string;
}

export interface SystemsRegistry {
  systems: Record<string, SystemInfo>;
  default: string;
}

export interface SystemListItem {
  id: string;
  name: string;
  isDefault: boolean;
}

// Config directory path
const CONFIG_DIR = path.join(__dirname, '../../config/import');

/**
 * Load the systems registry
 */
export function loadSystemsRegistry(): SystemsRegistry {
  const registryPath = path.join(CONFIG_DIR, 'systems.json');

  if (!fs.existsSync(registryPath)) {
    throw new Error('Systems registry not found: systems.json');
  }

  const content = fs.readFileSync(registryPath, 'utf-8');
  return JSON.parse(content) as SystemsRegistry;
}

/**
 * Get list of available systems
 */
export function listSystems(): SystemListItem[] {
  const registry = loadSystemsRegistry();

  return Object.entries(registry.systems).map(([id, info]) => ({
    id,
    name: info.name,
    isDefault: id === registry.default
  }));
}

/**
 * Load a specific system's configuration
 */
export function loadSystemConfig(systemId: string): SystemConfig {
  const registry = loadSystemsRegistry();

  const systemInfo = registry.systems[systemId];
  if (!systemInfo) {
    throw new Error(`System not found: ${systemId}`);
  }

  const configPath = path.join(CONFIG_DIR, systemInfo.configFile);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found for system ${systemId}: ${systemInfo.configFile}`);
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content) as SystemConfig;
}

/**
 * Get the default system ID
 */
export function getDefaultSystemId(): string {
  const registry = loadSystemsRegistry();
  return registry.default;
}

/**
 * Check if a system exists
 */
export function systemExists(systemId: string): boolean {
  try {
    const registry = loadSystemsRegistry();
    return systemId in registry.systems;
  } catch {
    return false;
  }
}

/**
 * Derive required columns from any system config for header validation.
 * Works for both Hill-style (measureColumns) and Sutter-style (dataColumns) configs.
 * @param config - The system configuration to extract required columns from
 * @returns RequiredColumns with patient columns, data columns, and minimum count
 */
export function getRequiredColumns(config: HillSystemConfig | SutterSystemConfig): RequiredColumns {
  // Extract patient columns mapped to memberName and memberDob
  const patientColumns: string[] = [];
  for (const [columnName, mapping] of Object.entries(config.patientColumns)) {
    if (mapping === 'memberName' || mapping === 'memberDob') {
      patientColumns.push(columnName);
    }
  }

  let dataColumns: string[];

  if (isSutterConfig(config)) {
    // Sutter: use dataColumns entries directly
    dataColumns = [...config.dataColumns];
  } else {
    // Hill: use first few keys from measureColumns
    dataColumns = Object.keys(config.measureColumns).slice(0, 3);
  }

  return {
    patientColumns,
    dataColumns,
    minDataColumns: 1,
  };
}
