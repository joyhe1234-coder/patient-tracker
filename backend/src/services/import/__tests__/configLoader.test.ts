/**
 * Unit tests for configLoader.ts
 * Tests system configuration loading and registry management
 */

import { describe, it, expect } from '@jest/globals';
import {
  loadSystemsRegistry,
  loadSystemConfig,
  listSystems,
  getDefaultSystemId,
  systemExists,
  getRequiredColumns,
  type SystemConfig,
  type SystemsRegistry,
  type HillSystemConfig,
  type SutterSystemConfig,
  isHillConfig,
  isSutterConfig,
} from '../configLoader.js';

describe('configLoader', () => {
  describe('loadSystemsRegistry', () => {
    it('should load the systems registry successfully', () => {
      const registry = loadSystemsRegistry();

      expect(registry).toBeDefined();
      expect(registry.systems).toBeDefined();
      expect(registry.default).toBeDefined();
      expect(typeof registry.default).toBe('string');
    });

    it('should have at least one system defined', () => {
      const registry = loadSystemsRegistry();

      const systemIds = Object.keys(registry.systems);
      expect(systemIds.length).toBeGreaterThan(0);
    });

    it('should have default system in systems list', () => {
      const registry = loadSystemsRegistry();

      expect(registry.systems[registry.default]).toBeDefined();
    });
  });

  describe('loadSystemConfig', () => {
    it('should load hill system config successfully', () => {
      const config = loadSystemConfig('hill');

      expect(config).toBeDefined();
      expect(config.name).toBe('Hill Healthcare');
      expect(config.version).toBeDefined();
    });

    it('should have patientColumns defined', () => {
      const config = loadSystemConfig('hill');

      expect(config.patientColumns).toBeDefined();
      expect(config.patientColumns['Patient']).toBe('memberName');
      expect(config.patientColumns['DOB']).toBe('memberDob');
      expect(config.patientColumns['Phone']).toBe('memberTelephone');
      expect(config.patientColumns['Address']).toBe('memberAddress');
    });

    it('should have measureColumns defined', () => {
      const config = loadSystemConfig('hill');
      expect(isHillConfig(config)).toBe(true);
      const hillConfig = config as HillSystemConfig;

      expect(hillConfig.measureColumns).toBeDefined();
      expect(Object.keys(hillConfig.measureColumns).length).toBeGreaterThan(0);

      // Check specific measure
      const awv = hillConfig.measureColumns['Annual Wellness Visit'];
      expect(awv).toBeDefined();
      expect(awv.requestType).toBe('AWV');
      expect(awv.qualityMeasure).toBe('Annual Wellness Visit');
    });

    it('should have statusMapping defined', () => {
      const config = loadSystemConfig('hill');
      const hillConfig = config as HillSystemConfig;

      expect(hillConfig.statusMapping).toBeDefined();

      const awvStatus = hillConfig.statusMapping['Annual Wellness Visit'];
      expect(awvStatus).toBeDefined();
      expect(awvStatus.compliant).toBe('AWV completed');
      expect(awvStatus.nonCompliant).toBe('Not Addressed');
    });

    it('should have skipColumns defined', () => {
      const config = loadSystemConfig('hill');
      const hillConfig = config as HillSystemConfig;

      expect(hillConfig.skipColumns).toBeDefined();
      expect(Array.isArray(hillConfig.skipColumns)).toBe(true);
      expect(hillConfig.skipColumns).toContain('Sex');
      expect(hillConfig.skipColumns).toContain('MembID');
    });

    it('should throw error for unknown system', () => {
      expect(() => loadSystemConfig('nonexistent-system')).toThrow('System not found');
    });
  });

  describe('listSystems', () => {
    it('should return array of system items', () => {
      const systems = listSystems();

      expect(Array.isArray(systems)).toBe(true);
      expect(systems.length).toBeGreaterThan(0);
    });

    it('should include id, name, and isDefault for each system', () => {
      const systems = listSystems();

      for (const system of systems) {
        expect(system.id).toBeDefined();
        expect(typeof system.id).toBe('string');
        expect(system.name).toBeDefined();
        expect(typeof system.name).toBe('string');
        expect(typeof system.isDefault).toBe('boolean');
      }
    });

    it('should have exactly one default system', () => {
      const systems = listSystems();

      const defaults = systems.filter(s => s.isDefault);
      expect(defaults).toHaveLength(1);
    });

    it('should include hill system', () => {
      const systems = listSystems();

      const hill = systems.find(s => s.id === 'hill');
      expect(hill).toBeDefined();
      expect(hill?.name).toBe('Hill Healthcare');
    });
  });

  describe('getDefaultSystemId', () => {
    it('should return a valid system id', () => {
      const defaultId = getDefaultSystemId();

      expect(defaultId).toBeDefined();
      expect(typeof defaultId).toBe('string');
      expect(defaultId.length).toBeGreaterThan(0);
    });

    it('should return system that exists', () => {
      const defaultId = getDefaultSystemId();

      expect(systemExists(defaultId)).toBe(true);
    });

    it('should match the default in registry', () => {
      const defaultId = getDefaultSystemId();
      const registry = loadSystemsRegistry();

      expect(defaultId).toBe(registry.default);
    });
  });

  describe('systemExists', () => {
    it('should return true for existing system', () => {
      expect(systemExists('hill')).toBe(true);
    });

    it('should return false for non-existing system', () => {
      expect(systemExists('nonexistent')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(systemExists('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      // 'hill' exists but 'HILL' should not (unless explicitly defined)
      expect(systemExists('hill')).toBe(true);
      expect(systemExists('HILL')).toBe(false);
    });
  });

  describe('Sutter system config', () => {
    it('should load sutter system config successfully', () => {
      const config = loadSystemConfig('sutter');

      expect(config).toBeDefined();
      expect(config.name).toBe('Sutter/SIP');
      expect(config.version).toBeDefined();
    });

    it('should have format "long" for Sutter config', () => {
      const config = loadSystemConfig('sutter');

      expect(isSutterConfig(config)).toBe(true);
      const sutterConfig = config as SutterSystemConfig;
      expect(sutterConfig.format).toBe('long');
    });

    it('should have headerRow defined for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      expect(config.headerRow).toBeDefined();
      expect(config.headerRow).toBe(3);
    });

    it('should have patientColumns defined for Sutter', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      expect(config.patientColumns).toBeDefined();
      expect(config.patientColumns['Member Name']).toBe('memberName');
      expect(config.patientColumns['Member DOB']).toBe('memberDob');
      expect(config.patientColumns['Member Telephone']).toBe('memberTelephone');
      expect(config.patientColumns['Member Home Address']).toBe('memberAddress');
    });

    it('should have dataColumns array for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      expect(Array.isArray(config.dataColumns)).toBe(true);
      expect(config.dataColumns).toContain('Possible Actions Needed');
      expect(config.dataColumns).toContain('Request Type');
      expect(config.dataColumns).toContain('Measure Details');
    });

    it('should have requestTypeMapping for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      expect(config.requestTypeMapping).toBeDefined();
      expect(config.requestTypeMapping['AWV']).toBeDefined();
      expect(config.requestTypeMapping['AWV'].requestType).toBe('AWV');
      expect(config.requestTypeMapping['HCC']).toBeDefined();
      expect(config.requestTypeMapping['HCC'].requestType).toBe('Chronic DX');
      expect(config.requestTypeMapping['Quality']).toBeDefined();
      expect(config.requestTypeMapping['Quality'].requestType).toBeNull();
    });

    it('should have actionMapping array for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      expect(Array.isArray(config.actionMapping)).toBe(true);
      expect(config.actionMapping.length).toBeGreaterThan(0);

      // Each entry should have pattern, requestType, qualityMeasure, measureStatus
      for (const entry of config.actionMapping) {
        expect(typeof entry.pattern).toBe('string');
        expect(typeof entry.requestType).toBe('string');
        expect(typeof entry.qualityMeasure).toBe('string');
        expect(typeof entry.measureStatus).toBe('string');
      }
    });

    it('should have skipActions array for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      expect(Array.isArray(config.skipActions)).toBe(true);
      expect(config.skipActions.length).toBeGreaterThan(0);
    });

    it('should have skipTabs array for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      expect(Array.isArray(config.skipTabs)).toBe(true);
      expect(config.skipTabs.length).toBeGreaterThan(0);

      // Each entry should have type and value
      for (const tab of config.skipTabs) {
        expect(['suffix', 'prefix', 'exact', 'contains']).toContain(tab.type);
        expect(typeof tab.value).toBe('string');
      }
    });
  });

  describe('type guards', () => {
    it('isSutterConfig should return true for Sutter config', () => {
      const config = loadSystemConfig('sutter');
      expect(isSutterConfig(config)).toBe(true);
    });

    it('isSutterConfig should return false for Hill config', () => {
      const config = loadSystemConfig('hill');
      expect(isSutterConfig(config)).toBe(false);
    });

    it('isHillConfig should return true for Hill config', () => {
      const config = loadSystemConfig('hill');
      expect(isHillConfig(config)).toBe(true);
    });

    it('isHillConfig should return false for Sutter config', () => {
      const config = loadSystemConfig('sutter');
      expect(isHillConfig(config)).toBe(false);
    });

    it('union type allows both Hill and Sutter configs', () => {
      const hillConfig: SystemConfig = loadSystemConfig('hill');
      const sutterConfig: SystemConfig = loadSystemConfig('sutter');

      // Both should be assignable to SystemConfig
      expect(hillConfig).toBeDefined();
      expect(sutterConfig).toBeDefined();

      // And distinguishable via type guards
      expect(isHillConfig(hillConfig)).toBe(true);
      expect(isSutterConfig(sutterConfig)).toBe(true);
    });
  });

  describe('Sutter in system registry', () => {
    it('should include sutter in systems list', () => {
      const systems = listSystems();

      const sutter = systems.find(s => s.id === 'sutter');
      expect(sutter).toBeDefined();
      expect(sutter?.name).toBe('Sutter/SIP');
    });

    it('systemExists should return true for sutter', () => {
      expect(systemExists('sutter')).toBe(true);
    });
  });

  describe('config structure validation', () => {
    it('should have consistent measure types across measureColumns and statusMapping', () => {
      const config = loadSystemConfig('hill') as HillSystemConfig;

      // Get unique quality measures from measureColumns
      const measureQualityMeasures = new Set<string>();
      for (const mapping of Object.values(config.measureColumns)) {
        measureQualityMeasures.add(mapping.qualityMeasure);
      }

      // Each quality measure should have a status mapping
      for (const qualityMeasure of measureQualityMeasures) {
        const statusMapping = config.statusMapping[qualityMeasure];
        expect(statusMapping).toBeDefined();
        expect(statusMapping.compliant).toBeDefined();
        expect(statusMapping.nonCompliant).toBeDefined();
      }
    });

    it('should have multiple measure column mappings', () => {
      const config = loadSystemConfig('hill') as HillSystemConfig;

      // Should have various measure types
      const qualityMeasures = new Set<string>();
      for (const mapping of Object.values(config.measureColumns)) {
        qualityMeasures.add(mapping.qualityMeasure);
      }

      // Should have AWV, screenings, quality measures
      expect(qualityMeasures.has('Annual Wellness Visit')).toBe(true);
      expect(qualityMeasures.has('Breast Cancer Screening')).toBe(true);
      expect(qualityMeasures.has('Diabetic Eye Exam')).toBe(true);
    });
  });

  describe('getRequiredColumns', () => {
    it('should return correct patient columns for Hill config', () => {
      const config = loadSystemConfig('hill') as HillSystemConfig;

      const result = getRequiredColumns(config);

      // Hill patientColumns has Patient->memberName and DOB->memberDob
      expect(result.patientColumns).toContain('Patient');
      expect(result.patientColumns).toContain('DOB');
      expect(result.patientColumns).toHaveLength(2);
    });

    it('should return first 3 measureColumns keys as dataColumns for Hill config', () => {
      const config = loadSystemConfig('hill') as HillSystemConfig;

      const result = getRequiredColumns(config);

      // First 3 keys from hill.json measureColumns
      const expectedFirst3 = Object.keys(config.measureColumns).slice(0, 3);
      expect(result.dataColumns).toEqual(expectedFirst3);
      expect(result.dataColumns).toHaveLength(3);

      // Verify the actual values from hill.json
      expect(result.dataColumns[0]).toBe('Annual Wellness Visit');
      expect(result.dataColumns[1]).toBe('Breast Cancer Screening E');
      expect(result.dataColumns[2]).toBe('Breast Cancer Screening 42-51 Years E');
    });

    it('should return correct patient columns for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      const result = getRequiredColumns(config);

      // Sutter patientColumns has Member Name->memberName and Member DOB->memberDob
      expect(result.patientColumns).toContain('Member Name');
      expect(result.patientColumns).toContain('Member DOB');
      expect(result.patientColumns).toHaveLength(2);
    });

    it('should return dataColumns array entries for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      const result = getRequiredColumns(config);

      // Sutter dataColumns come directly from config.dataColumns
      expect(result.dataColumns).toEqual(config.dataColumns);
      expect(result.dataColumns).toContain('Health Plans');
      expect(result.dataColumns).toContain('Race-Ethnicity');
      expect(result.dataColumns).toContain('Possible Actions Needed');
      expect(result.dataColumns).toContain('Request Type');
      expect(result.dataColumns).toContain('Measure Details');
      expect(result.dataColumns).toContain('High Priority');
    });

    it('should set minDataColumns to 1 for Hill config', () => {
      const config = loadSystemConfig('hill') as HillSystemConfig;

      const result = getRequiredColumns(config);

      expect(result.minDataColumns).toBe(1);
    });

    it('should set minDataColumns to 1 for Sutter config', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      const result = getRequiredColumns(config);

      expect(result.minDataColumns).toBe(1);
    });

    it('should not include non-name/dob patient columns in patientColumns', () => {
      const config = loadSystemConfig('hill') as HillSystemConfig;

      const result = getRequiredColumns(config);

      // Phone->memberTelephone and Address->memberAddress should NOT be included
      expect(result.patientColumns).not.toContain('Phone');
      expect(result.patientColumns).not.toContain('Address');
    });

    it('should not include non-name/dob patient columns for Sutter', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      const result = getRequiredColumns(config);

      // Member Telephone->memberTelephone and Member Home Address->memberAddress should NOT be included
      expect(result.patientColumns).not.toContain('Member Telephone');
      expect(result.patientColumns).not.toContain('Member Home Address');
    });

    it('should return a new copy of Sutter dataColumns (not a reference)', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      const result = getRequiredColumns(config);

      // Mutating the result should not affect config
      result.dataColumns.push('Extra Column');
      expect(config.dataColumns).not.toContain('Extra Column');
    });
  });
});
