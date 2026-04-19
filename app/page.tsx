import { getContacts } from '@/src/tools/get-contacts';
import { getDeadlines } from '@/src/tools/get-deadlines';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import AnnouncementsCard from './components/AnnouncementsCard';
import ContactsCard from './components/ContactsCard';
import CommitteesCard from './components/CommitteesCard';
import ManagementContactsCard from './components/ManagementContactsCard';
import DeadlineAlerts from './components/DeadlineAlert';

export default async function HomePage() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const [contacts, deadlines] = await Promise.all([
    getContacts(db, orgId),
    getDeadlines({ days_ahead: 90 }, db, orgId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnnouncementsCard />
        <ContactsCard contacts={contacts} showGroup="board_member" title="Association Board Members" />
        <CommitteesCard />
        <ManagementContactsCard />
        <div className="lg:col-span-2">
          <DeadlineAlerts deadlines={deadlines} />
        </div>
      </div>
    </div>
  );
}
