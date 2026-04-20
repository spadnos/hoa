import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';

export default async function AdminPage() {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) redirect('/');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link
          href="/admin/groups"
          className="block border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Groups</h2>
          <p className="text-sm text-gray-500">Manage group memberships and roles</p>
        </Link>
        <Link
          href="/admin/announcements"
          className="block border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Announcements</h2>
          <p className="text-sm text-gray-500">Create and manage community announcements</p>
        </Link>
        <Link
          href="/admin/approval-types"
          className="block border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Approval Types</h2>
          <p className="text-sm text-gray-500">Configure external agency approval types for this HOA</p>
        </Link>
      </div>
    </div>
  );
}
