const MANAGEMENT_CONTACTS = [
  { label: 'Management Company', name: 'Kirkwood Property Services', email: 'kbeyer@kirkwoodcp.com', phone: '(530) 555-0100' },
  { label: 'Accounting', name: 'Kirkwood Property Services', email: 'accounting@kirkwoodcp.com', phone: null },
  { label: 'Maintenance', name: 'East Meadows Maintenance', email: 'maintenance@kirkwoodcp.com', phone: '(530) 555-0101' },
];

export default function ManagementContactsCard() {
  return (
    <div className="bg-gray-100 rounded-xl border-2 border-gray-300 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Management Contacts</h2>
        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Placeholder</span>
      </div>
      <ul className="space-y-3">
        {MANAGEMENT_CONTACTS.map((c) => (
          <li key={c.label} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{c.name}</p>
            <div className="flex gap-4 mt-0.5">
              {c.email && (
                <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline">
                  {c.email}
                </a>
              )}
              {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
