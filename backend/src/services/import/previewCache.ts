/**
 * Preview Cache for Import
 * Stores diff results in memory with TTL for preview before commit
 */

import { DiffResult } from './diffCalculator.js';
import { TransformedRow } from './dataTransformer.js';
import { ValidationResult } from './validator.js';
import crypto from 'crypto';

/**
 * Default TTL for preview cache entries (30 minutes)
 */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/**
 * Interval for cleanup of expired entries (5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Warning item for display
 */
export interface ValidationWarning {
  rowIndex: number;
  field: string;
  message: string;
  memberName?: string;
}

/**
 * Patient reassignment info - when import would change patient's owner
 */
export interface PatientReassignment {
  patientId: number;
  memberName: string;
  memberDob: string;
  currentOwnerId: number | null;
  currentOwnerName: string | null;
  newOwnerId: number | null;
}

/**
 * Cached preview entry
 */
export interface PreviewEntry {
  id: string;
  systemId: string;
  mode: 'replace' | 'merge';
  fileName?: string;
  diff: DiffResult;
  rows: TransformedRow[];
  validation: ValidationResult;
  warnings: ValidationWarning[];
  reassignments: PatientReassignment[];
  targetOwnerId: number | null;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * In-memory cache storage
 */
const cache = new Map<string, PreviewEntry>();

/**
 * Cleanup timer reference
 */
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Generate a unique preview ID
 */
function generatePreviewId(): string {
  return crypto.randomUUID();
}

/**
 * Store a preview in the cache
 * @returns The preview ID to retrieve later
 */
export function storePreview(
  systemId: string,
  mode: 'replace' | 'merge',
  diff: DiffResult,
  rows: TransformedRow[],
  validation: ValidationResult,
  warnings: ValidationWarning[] = [],
  reassignments: PatientReassignment[] = [],
  targetOwnerId: number | null = null,
  ttlMs: number = DEFAULT_TTL_MS,
  fileName?: string
): string {
  const id = generatePreviewId();
  const now = new Date();

  const entry: PreviewEntry = {
    id,
    systemId,
    mode,
    fileName,
    diff,
    rows,
    validation,
    warnings,
    reassignments,
    targetOwnerId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
  };

  cache.set(id, entry);

  // Start cleanup timer if not already running
  startCleanupTimer();

  return id;
}

/**
 * Retrieve a preview from the cache
 * @returns The preview entry or null if not found or expired
 */
export function getPreview(id: string): PreviewEntry | null {
  const entry = cache.get(id);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (new Date() > entry.expiresAt) {
    cache.delete(id);
    return null;
  }

  return entry;
}

/**
 * Delete a preview from the cache
 * @returns true if deleted, false if not found
 */
export function deletePreview(id: string): boolean {
  return cache.delete(id);
}

/**
 * Check if a preview exists and is valid
 */
export function hasValidPreview(id: string): boolean {
  const entry = getPreview(id);
  return entry !== null;
}

/**
 * Get all active (non-expired) previews
 * Useful for debugging/monitoring
 */
export function getActivePreviews(): PreviewEntry[] {
  const now = new Date();
  const active: PreviewEntry[] = [];

  for (const entry of cache.values()) {
    if (now <= entry.expiresAt) {
      active.push(entry);
    }
  }

  return active;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
} {
  const now = new Date();
  let activeCount = 0;
  let expiredCount = 0;
  let oldestDate: Date | null = null;
  let newestDate: Date | null = null;

  for (const entry of cache.values()) {
    if (now <= entry.expiresAt) {
      activeCount++;
    } else {
      expiredCount++;
    }

    if (!oldestDate || entry.createdAt < oldestDate) {
      oldestDate = entry.createdAt;
    }
    if (!newestDate || entry.createdAt > newestDate) {
      newestDate = entry.createdAt;
    }
  }

  return {
    totalEntries: cache.size,
    activeEntries: activeCount,
    expiredEntries: expiredCount,
    oldestEntry: oldestDate,
    newestEntry: newestDate,
  };
}

/**
 * Clean up expired entries from the cache
 * @returns Number of entries removed
 */
export function cleanupExpired(): number {
  const now = new Date();
  let removed = 0;

  for (const [id, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(id);
      removed++;
    }
  }

  return removed;
}

/**
 * Clear all entries from the cache
 * Useful for testing or emergency cleanup
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Start the cleanup timer if not already running
 */
function startCleanupTimer(): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    const removed = cleanupExpired();
    if (removed > 0) {
      console.log(`[PreviewCache] Cleaned up ${removed} expired entries`);
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node from exiting
  cleanupTimer.unref();
}

/**
 * Stop the cleanup timer
 * Call this when shutting down the server
 */
export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Extend the expiration time of a preview
 * Useful if user is actively viewing the preview
 */
export function extendPreviewTTL(
  id: string,
  additionalMs: number = DEFAULT_TTL_MS
): boolean {
  const entry = cache.get(id);

  if (!entry) {
    return false;
  }

  // Only extend if not already expired
  if (new Date() > entry.expiresAt) {
    cache.delete(id);
    return false;
  }

  entry.expiresAt = new Date(entry.expiresAt.getTime() + additionalMs);
  return true;
}

/**
 * Get preview summary for API response
 */
export function getPreviewSummary(entry: PreviewEntry): {
  previewId: string;
  systemId: string;
  mode: string;
  fileName?: string;
  summary: DiffResult['summary'];
  totalChanges: number;
  expiresAt: string;
  createdAt: string;
} {
  return {
    previewId: entry.id,
    systemId: entry.systemId,
    mode: entry.mode,
    fileName: entry.fileName,
    summary: entry.diff.summary,
    totalChanges: entry.diff.changes.length,
    expiresAt: entry.expiresAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  };
}
