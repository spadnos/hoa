import type { GroupMembership, LotAssociation } from '@/src/types';

export type Permission = 'admin' | 'acc_manage' | 'homeowner' | 'read';

export function derivePermissions(
  memberships: GroupMembership[],
  lotAssociations: LotAssociation[]
): Permission[] {
  const perms = new Set<Permission>(['read']);

  for (const m of memberships) {
    if (m.group_name === 'board') {
      perms.add('admin');
      perms.add('acc_manage');
      perms.add('homeowner');
    } else if (m.group_name === 'acc') {
      perms.add('acc_manage');
      perms.add('homeowner');
    }
  }

  if (lotAssociations.length > 0) {
    perms.add('homeowner');
  }

  return Array.from(perms);
}

export function hasPermission(
  session: { permissions: Permission[] } | null,
  permission: Permission
): boolean {
  return session?.permissions.includes(permission) ?? false;
}
