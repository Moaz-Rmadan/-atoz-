export const formatSafeTime = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '--:--';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!d || isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--';
  }
};

export const formatSafeDate = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-EG');
  } catch {
    return '—';
  }
};
