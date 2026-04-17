import type { HoaContact, HoaMembers } from '@/src/types';

function ContactItem({ contact }: { contact: HoaContact }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-900">{contact.name}</span>
          <span className="text-xs text-gray-500 ml-2">{contact.role}</span>
        </div>
      </div>
      <div className="flex gap-4 mt-0.5">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline">
            {contact.email}
          </a>
        )}
        {contact.phone && <span className="text-xs text-gray-500">{contact.phone}</span>}
      </div>
    </div>
  );
}

interface Props {
  contacts: HoaMembers;
  showGroup?: 'acc_member' | 'board_member' | 'both';
  title?: string;
}

export default function ContactsCard({ contacts, showGroup = 'both', title = 'Contacts' }: Props) {
  const acc = showGroup === 'acc_member' || showGroup === 'both' ? contacts.acc_members : [];
  const board = showGroup === 'board_member' || showGroup === 'both' ? contacts.board_members : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {acc.length > 0 && (
        <div className="mb-4">
          {showGroup === 'both' && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ACC Members</p>}
          {acc.map((c, i) => <ContactItem key={i} contact={c} />)}
        </div>
      )}
      {board.length > 0 && (
        <div>
          {showGroup === 'both' && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Board Members</p>}
          {board.map((c, i) => <ContactItem key={i} contact={c} />)}
        </div>
      )}
      {acc.length === 0 && board.length === 0 && (
        <p className="text-sm text-gray-400">No contacts found.</p>
      )}
    </div>
  );
}
