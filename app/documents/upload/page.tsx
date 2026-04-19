import { redirect } from 'next/navigation';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import UploadClient from './UploadClient';

export default async function UploadPage() {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) redirect('/documents');

  return <UploadClient />;
}
