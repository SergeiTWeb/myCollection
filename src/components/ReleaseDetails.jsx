export default function ReleaseDetails({ year, label, barcode, format, className = '' }) {
  const displayValue = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
    return value === null || value === undefined || String(value).trim() === '' ? '—' : value;
  };
  const details = [
    ['Year', displayValue(year)],
    ['Label', displayValue(label)],
    ['Barcode', displayValue(barcode)],
    ['Format', displayValue(format === 'Cassette' ? 'Tape' : format)]
  ];

  return (
    <div className={`result-meta ${className}`.trim()}>
      {details.map(([name, value]) => (
        <p key={name} className={name === 'Barcode' ? 'barcode' : undefined}>
          <strong>{name}:</strong> {value}
        </p>
      ))}
    </div>
  );
}
