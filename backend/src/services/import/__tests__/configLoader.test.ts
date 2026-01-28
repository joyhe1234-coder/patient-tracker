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
  SystemConfig,
  SystemsRegistry,
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

      expect(config.measureColumns).toBeDefined();
      expect(Object.keys(config.measureColumns).length).toBeGreaterThan(0);

      // Check specific measure
      const awv = config.measureColumns['Annual Wellness Visit'];
      expect(awv).toBeDefined();
      expect(awv.requestType).toBe('AWV');
      expect(awv.qualityMeasure).toBe('Annual Wellness Visit');
    });

    it('should have statusMapping defined', () => {
      const config = loadSystemConfig('hill');

      expect(config.statusMapping).toBeDefined();

      const awvStatus = config.statusMapping['Annual Wellness Visit'];
      expect(awvStatus).toBeDefined();
      expect(awvStatus.compliant).toBe('AWV completed');
      expect(awvStatus.nonCompliant).toBe('Not Addressed');
    });

    it('should have skipColumns defined', () => {
      const config = loadSystemConfig('hill');

      expect(config.skipColumns).toBeDefined();
      expect(Array.isArray(config.skipColumns)).toBe(true);
      expect(config.skipColumns).toContain('Sex');
      expect(config.skipColumns).toContain('MembID');
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

  describe('config structure validation', () => {
    it('should have consistent measure types across measureColumns and statusMapping', () => {
      const config = loadSystemConfig('hill');

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
      const config = loadSystemConfig('hill');

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
});
