/**
 * Unit tests for sutterColumnMapper.ts
 * Tests column mapping for Sutter/SIP long-format imports
 */

import { describe, it, expect } from '@jest/globals';
import { mapSutterColumns } from '../sutterColumnMapper.js';
import type { SutterSystemConfig } from '../configLoader.js';

// Load actual Sutter config for realistic tests
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sutterConfigPath = path.join(__dirname, '../../../config/import/sutter.json');
const sutterConfig = JSON.parse(fs.readFileSync(sutterConfigPath, 'utf-8')) as SutterSystemConfig;

describe('sutterColumnMapper', () => {
  describe('patient column mapping', () => {
    it('should map Member Name to memberName', () => {
      const headers = ['Member Name', 'Member DOB'];

      const result = mapSutterColumns(headers, sutterConfig);

      const nameMapping = result.mappedColumns.find(m => m.sourceColumn === 'Member Name');
      expect(nameMapping).toBeDefined();
      expect(nameMapping!.targetField).toBe('memberName');
      expect(nameMapping!.columnType).toBe('patient');
    });

    it('should map Member DOB to memberDob', () => {
      const headers = ['Member Name', 'Member DOB'];

      const result = mapSutterColumns(headers, sutterConfig);

      const dobMapping = result.mappedColumns.find(m => m.sourceColumn === 'Member DOB');
      expect(dobMapping).toBeDefined();
      expect(dobMapping!.targetField).toBe('memberDob');
      expect(dobMapping!.columnType).toBe('patient');
    });

    it('should map Member Telephone to memberTelephone', () => {
      const headers = ['Member Name', 'Member DOB', 'Member Telephone'];

      const result = mapSutterColumns(headers, sutterConfig);

      const phoneMapping = result.mappedColumns.find(m => m.sourceColumn === 'Member Telephone');
      expect(phoneMapping).toBeDefined();
      expect(phoneMapping!.targetField).toBe('memberTelephone');
      expect(phoneMapping!.columnType).toBe('patient');
    });

    it('should map Member Home Address to memberAddress', () => {
      const headers = ['Member Name', 'Member DOB', 'Member Home Address'];

      const result = mapSutterColumns(headers, sutterConfig);

      const addrMapping = result.mappedColumns.find(m => m.sourceColumn === 'Member Home Address');
      expect(addrMapping).toBeDefined();
      expect(addrMapping!.targetField).toBe('memberAddress');
      expect(addrMapping!.columnType).toBe('patient');
    });

    it('should map all four patient columns simultaneously', () => {
      const headers = ['Member Name', 'Member DOB', 'Member Telephone', 'Member Home Address'];

      const result = mapSutterColumns(headers, sutterConfig);

      const patientMappings = result.mappedColumns.filter(m => m.columnType === 'patient');
      expect(patientMappings).toHaveLength(4);
    });
  });

  describe('data column mapping', () => {
    it('should map data columns with columnType "data"', () => {
      const headers = ['Member Name', 'Member DOB', 'Request Type', 'Possible Actions Needed'];

      const result = mapSutterColumns(headers, sutterConfig);

      const rtMapping = result.mappedColumns.find(m => m.sourceColumn === 'Request Type');
      expect(rtMapping).toBeDefined();
      expect(rtMapping!.columnType).toBe('data');
      expect(rtMapping!.targetField).toBe('Request Type');

      const actionsMapping = result.mappedColumns.find(m => m.sourceColumn === 'Possible Actions Needed');
      expect(actionsMapping).toBeDefined();
      expect(actionsMapping!.columnType).toBe('data');
    });

    it('should map all 6 data columns from config', () => {
      const headers = [
        'Member Name', 'Member DOB',
        'Health Plans', 'Race-Ethnicity', 'Possible Actions Needed',
        'Request Type', 'Measure Details', 'High Priority',
      ];

      const result = mapSutterColumns(headers, sutterConfig);

      const dataMappings = result.mappedColumns.filter(m => m.columnType === 'data');
      expect(dataMappings).toHaveLength(6);
    });

    it('should set targetField to the header name for data columns', () => {
      const headers = ['Member Name', 'Member DOB', 'Measure Details'];

      const result = mapSutterColumns(headers, sutterConfig);

      const mdMapping = result.mappedColumns.find(m => m.sourceColumn === 'Measure Details');
      expect(mdMapping!.targetField).toBe('Measure Details');
    });
  });

  describe('unmapped columns', () => {
    it('should collect unmapped columns', () => {
      const headers = ['Member Name', 'Member DOB', 'Unknown Column', 'Random Field'];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.unmappedColumns).toContain('Unknown Column');
      expect(result.unmappedColumns).toContain('Random Field');
    });

    it('should not include mapped columns in unmapped list', () => {
      const headers = ['Member Name', 'Member DOB', 'Request Type'];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.unmappedColumns).toHaveLength(0);
    });
  });

  describe('missing required columns', () => {
    it('should report missing Member Name', () => {
      const headers = ['Member DOB', 'Request Type'];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.missingRequired).toContain('Member Name');
    });

    it('should report missing Member DOB', () => {
      const headers = ['Member Name', 'Request Type'];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.missingRequired).toContain('Member DOB');
    });

    it('should report both missing when neither present', () => {
      const headers = ['Request Type', 'Possible Actions Needed'];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.missingRequired).toContain('Member Name');
      expect(result.missingRequired).toContain('Member DOB');
      expect(result.missingRequired).toHaveLength(2);
    });

    it('should not report missing when both are present', () => {
      const headers = ['Member Name', 'Member DOB'];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe('no Q1/Q2 suffix logic', () => {
    it('should not apply Q1/Q2 suffix matching', () => {
      // These are Hill-style headers; Sutter should NOT recognize them as measures
      const headers = ['Member Name', 'Member DOB', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];

      const result = mapSutterColumns(headers, sutterConfig);

      // Q1/Q2 columns should be unmapped, not treated as measures
      expect(result.unmappedColumns).toContain('Annual Wellness Visit Q1');
      expect(result.unmappedColumns).toContain('Annual Wellness Visit Q2');

      // No measure-type columns should exist
      const measureMappings = result.mappedColumns.filter(m => m.columnType === 'measure');
      expect(measureMappings).toHaveLength(0);
    });
  });

  describe('stats calculation', () => {
    it('should calculate stats correctly', () => {
      const headers = ['Member Name', 'Member DOB', 'Request Type', 'Unknown Col', ''];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.stats.total).toBe(4); // Excludes empty
      expect(result.stats.mapped).toBe(3); // Member Name, Member DOB, Request Type
      expect(result.stats.unmapped).toBe(1); // Unknown Col
      expect(result.stats.skipped).toBe(0); // Sutter doesn't use skip columns
    });
  });

  describe('case sensitivity', () => {
    it('should require exact case match for column names', () => {
      // Column matching should be case-sensitive since config has exact names
      const headers = ['member name', 'member dob']; // lowercase

      const result = mapSutterColumns(headers, sutterConfig);

      // Should NOT map because config has "Member Name" not "member name"
      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.unmappedColumns).toContain('member name');
      expect(result.unmappedColumns).toContain('member dob');
    });
  });

  describe('empty and whitespace headers', () => {
    it('should skip empty headers', () => {
      const headers = ['Member Name', '', 'Member DOB', '   '];

      const result = mapSutterColumns(headers, sutterConfig);

      expect(result.stats.total).toBe(2); // Only non-empty headers counted
      expect(result.mappedColumns).toHaveLength(2);
    });
  });
});
