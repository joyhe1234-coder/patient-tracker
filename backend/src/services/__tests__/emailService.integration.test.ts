/**
 * Email Service Integration Tests — Ethereal SMTP
 *
 * These tests create a disposable Ethereal mailbox, then send real emails
 * through it.  No mocking — the full nodemailer pipeline is exercised.
 *
 * Each Jest worker gets its own module scope, so these tests cannot
 * interfere with the mock-based tests in emailService.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import nodemailer from 'nodemailer';

// ── Types ───────────────────────────────────────────────────────────

interface EtherealAccount {
  user: string;
  pass: string;
  smtp: { host: string; port: number; secure: boolean };
}

// ── Module-level state ──────────────────────────────────────────────

let account: EtherealAccount;
const originalEnv = { ...process.env };

// We'll dynamically import the service *after* env vars are set so the
// singleton transporter picks up the Ethereal credentials.
let isSmtpConfigured: typeof import('../emailService.js').isSmtpConfigured;
let sendPasswordResetEmail: typeof import('../emailService.js').sendPasswordResetEmail;
let sendAdminPasswordResetNotification: typeof import('../emailService.js').sendAdminPasswordResetNotification;
let _resetTransporterForTesting: typeof import('../emailService.js')._resetTransporterForTesting;
let _getTransporterForTesting: typeof import('../emailService.js')._getTransporterForTesting;

// ── Suite ───────────────────────────────────────────────────────────

describe('emailService — Ethereal integration', () => {
  // Creating an Ethereal account makes a real HTTP call — allow 15 s.
  beforeAll(async () => {
    // 1. Create disposable Ethereal account
    account = (await nodemailer.createTestAccount()) as unknown as EtherealAccount;

    // 2. Inject SMTP env vars
    process.env.SMTP_HOST = account.smtp.host;
    process.env.SMTP_PORT = String(account.smtp.port);
    process.env.SMTP_USER = account.user;
    process.env.SMTP_PASS = account.pass;
    process.env.SMTP_SECURE = String(account.smtp.secure);
    process.env.NODE_ENV = 'test';

    // 3. Dynamic import so the module reads the env vars we just set
    const mod = await import('../emailService.js');
    isSmtpConfigured = mod.isSmtpConfigured;
    sendPasswordResetEmail = mod.sendPasswordResetEmail;
    sendAdminPasswordResetNotification = mod.sendAdminPasswordResetNotification;
    _resetTransporterForTesting = mod._resetTransporterForTesting;
    _getTransporterForTesting = mod._getTransporterForTesting;

    // 4. Reset transporter so it picks up the Ethereal credentials
    _resetTransporterForTesting();
  }, 15_000);

  afterAll(() => {
    // Clean up: reset transporter and restore env
    try {
      _resetTransporterForTesting();
    } catch { /* ignore if already cleaned */ }
    process.env = originalEnv;
  });

  // ── Tests ───────────────────────────────────────────────────────

  it('detects SMTP as configured with Ethereal env vars', () => {
    expect(isSmtpConfigured()).toBe(true);
  });

  it('sends a password-reset email via Ethereal', async () => {
    const result = await sendPasswordResetEmail(account.user, 'test-token-abc');
    expect(result).toBe(true);
  });

  it('sends an admin-reset notification email via Ethereal', async () => {
    const result = await sendAdminPasswordResetNotification(account.user, 'Dr. Admin');
    expect(result).toBe(true);
  });

  it('produces a valid Ethereal preview URL via direct sendMail', async () => {
    const transport = _getTransporterForTesting();
    expect(transport).not.toBeNull();

    const info = await transport!.sendMail({
      from: account.user,
      to: account.user,
      subject: 'Integration test — preview URL',
      text: 'This email was sent from the integration test suite.',
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    // Log it so a developer can click through if desired
    // eslint-disable-next-line no-console
    console.log(`Ethereal preview URL: ${previewUrl}`);

    expect(typeof previewUrl).toBe('string');
    expect((previewUrl as string).startsWith('https://ethereal.email/message/')).toBe(true);
  });

  it('returns false when SMTP is not configured', async () => {
    // Remove SMTP_HOST so config check fails
    delete process.env.SMTP_HOST;
    _resetTransporterForTesting();

    expect(isSmtpConfigured()).toBe(false);

    const result = await sendPasswordResetEmail('nobody@example.com', 'tok');
    expect(result).toBe(false);

    // Restore for subsequent tests
    process.env.SMTP_HOST = account.smtp.host;
    _resetTransporterForTesting();
  });

  it('returns false on SMTP connection error (bad host)', async () => {
    // Point at an unreachable host
    process.env.SMTP_HOST = 'smtp.invalid.localhost';
    process.env.SMTP_PORT = '587';
    _resetTransporterForTesting();

    const result = await sendPasswordResetEmail(account.user, 'tok');
    expect(result).toBe(false);

    // Restore
    process.env.SMTP_HOST = account.smtp.host;
    process.env.SMTP_PORT = String(account.smtp.port);
    _resetTransporterForTesting();
  }, 15_000); // connection timeout may take a few seconds
});
