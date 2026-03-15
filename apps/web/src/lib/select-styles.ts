export const SELECT_STYLES = {
  control: (b: any, s: any) => ({
    ...b,
    background: '#0f1117',
    borderColor: s.isFocused ? '#3b82f6' : '#1e2536',
    borderRadius: '0.5rem',
    minHeight: '3rem',
    boxShadow: 'none',
    '&:hover': { borderColor: '#3b82f6' },
  }),
  menu: (b: any) => ({
    ...b,
    background: '#161b27',
    border: '1px solid #1e2536',
    borderRadius: '0.5rem',
    zIndex: 50,
  }),
  option: (b: any, s: any) => ({
    ...b,
    background: s.isFocused ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: s.isFocused ? '#93c5fd' : '#94a3b8',
    fontSize: '0.875rem',
  }),
  singleValue: (b: any) => ({ ...b, color: '#e2e8f0', fontSize: '0.875rem' }),
  input: (b: any) => ({ ...b, color: '#e2e8f0', fontSize: '0.875rem' }),
  placeholder: (b: any) => ({ ...b, color: '#475569', fontSize: '0.875rem' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (b: any) => ({ ...b, color: '#475569', padding: '0 8px' }),
};
