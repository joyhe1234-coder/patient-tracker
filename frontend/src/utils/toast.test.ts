/**
 * Toast notification utility tests
 *
 * Tests DOM manipulation, timers, accessibility attributes, and auto-cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from './toast';

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clean up any leftover toast containers
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();
  });

  afterEach(() => {
    vi.useRealTimers();
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();
  });

  it('creates toast container on first call', () => {
    showToast('Hello');
    const container = document.getElementById('toast-container');
    expect(container).not.toBeNull();
    expect(container!.parentElement).toBe(document.body);
  });

  it('creates toast element with correct message text', () => {
    showToast('Test message');
    const toast = document.querySelector('[data-testid="toast-notification"]');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toBe('Test message');
  });

  it('toast has role="alert" for accessibility', () => {
    showToast('Accessible toast');
    const toast = document.querySelector('[data-testid="toast-notification"]');
    expect(toast!.getAttribute('role')).toBe('alert');
  });

  it('toast has data-testid="toast-notification"', () => {
    showToast('ID toast');
    const toast = document.querySelector('[data-testid="toast-notification"]');
    expect(toast).not.toBeNull();
  });

  it('info type applies blue background (#2563eb)', () => {
    // jsdom can't parse complex cssText; spy on the setter to capture the raw string
    const spy = vi.spyOn(CSSStyleDeclaration.prototype, 'cssText', 'set');
    showToast('Info toast', 'info');
    const cssValues = spy.mock.calls.map(c => c[0] as string);
    expect(cssValues.some(c => c.includes('#2563eb'))).toBe(true);
    spy.mockRestore();
  });

  it('error type applies red background (#dc2626)', () => {
    const spy = vi.spyOn(CSSStyleDeclaration.prototype, 'cssText', 'set');
    showToast('Error toast', 'error');
    const cssValues = spy.mock.calls.map(c => c[0] as string);
    expect(cssValues.some(c => c.includes('#dc2626'))).toBe(true);
    spy.mockRestore();
  });

  it('success type applies green background (#16a34a)', () => {
    const spy = vi.spyOn(CSSStyleDeclaration.prototype, 'cssText', 'set');
    showToast('Success toast', 'success');
    const cssValues = spy.mock.calls.map(c => c[0] as string);
    expect(cssValues.some(c => c.includes('#16a34a'))).toBe(true);
    spy.mockRestore();
  });

  it('warning type applies orange background (#d97706)', () => {
    const spy = vi.spyOn(CSSStyleDeclaration.prototype, 'cssText', 'set');
    showToast('Warning toast', 'warning');
    const cssValues = spy.mock.calls.map(c => c[0] as string);
    expect(cssValues.some(c => c.includes('#d97706'))).toBe(true);
    spy.mockRestore();
  });

  it('toast auto-removes after duration (4000ms + 300ms fade)', () => {
    showToast('Temporary toast');
    const container = document.getElementById('toast-container');
    expect(container!.children.length).toBe(1);

    // After 4000ms, opacity set to 0 (fade-out starts)
    vi.advanceTimersByTime(4000);
    const toast = container!.querySelector('[data-testid="toast-notification"]') as HTMLElement;
    expect(toast.style.opacity).toBe('0');

    // After another 300ms, element is removed from DOM
    vi.advanceTimersByTime(300);
    expect(container!.children.length).toBe(0);

    // Container also removed when empty
    expect(document.getElementById('toast-container')).toBeNull();
  });
});
