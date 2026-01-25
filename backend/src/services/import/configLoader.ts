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

export interface SystemConfig {
  name: string;
  version: string;
  patientColumns: Record<string, string>;
  measureColumns: Record<string, MeasureColumnMapping>;
  statusMapping: Record<string, StatusMapping>;
  skipColumns: string[];
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
