'use client';

import { useRouter } from 'next/navigation';

export default function ProjectTableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/projects/${id}`)}
      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
    >
      {children}
    </tr>
  );
}
