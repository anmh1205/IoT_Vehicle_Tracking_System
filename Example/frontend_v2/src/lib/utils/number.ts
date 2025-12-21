export function formatNumber(value: number, decimals = 0) {
  if (Number.isNaN(value) || value === undefined || value === null) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

