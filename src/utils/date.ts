/**
 * Honeymoney Date Utilities
 * Non-negotiable: Date is required and defaults to today. THERE IS NO TIME FIELD.
 */

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const today = getTodayDateString();
  
  // Quick checks
  if (dateStr === today) return 'Today';
  
  const d = new Date(`${dateStr}T00:00:00`);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  if (dateStr === yStr) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getMonthYearString(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function isDateInCurrentMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const parts = dateStr.split('-');
  if (parts.length < 2) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return year === today.getFullYear() && month === (today.getMonth() + 1);
}

export function isDateInLastMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const parts = dateStr.split('-');
  if (parts.length < 2) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return year === lastMonth.getFullYear() && month === (lastMonth.getMonth() + 1);
}
