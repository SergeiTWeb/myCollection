export default function ReleaseDetails({ year, label, barcode, format, className = '' }) {
  const details = [
    ['Year', year || '—'],
    ['Label', label || '—'],
    ['Barcode', barcode || '—'],
    ['Format', format === 'Cassette' ? 'Tape' : (format || '—')]
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
