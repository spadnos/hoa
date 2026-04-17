import Link from 'next/link';
import NewPartyForm from '@/app/components/NewPartyForm';

export default function NewDirectoryEntryPage() {
  return (
    <div className="max-w-xl">
      <Link href="/directory" className="text-sm text-gray-500 hover:text-gray-900 mb-6 block">
        ← Directory
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Directory Entry</h1>
      <NewPartyForm />
    </div>
  );
}
