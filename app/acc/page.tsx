import Link from 'next/link';
import { FileText, BookOpen, ClipboardList } from 'lucide-react';
import { getContacts } from '@/src/tools/get-contacts';
import { getDb } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import ContactsCard from '../components/ContactsCard';

const DOCUMENTS = [
  {
    icon: BookOpen,
    title: 'Design Guidelines',
    description: 'Architectural standards and aesthetic requirements for all improvements',
  },
  {
    icon: ClipboardList,
    title: 'ACC Application Form',
    description: 'Required form for submitting any project for ACC review',
  },
  {
    icon: FileText,
    title: 'CC&Rs',
    description: 'Covenants, Conditions & Restrictions governing the community',
  },
];

const FAQS = [
  {
    q: 'If you want to remodel...',
    a: 'Any remodel affecting the exterior of your home requires ACC approval before work begins. Minor remodels (paint, roofing, windows matching existing style) follow a streamlined review, while major remodels (additions, structural changes, new exterior materials) require full review with plans. Submit an application with drawings and material samples. The ACC typically reviews minor projects within 30 days and major projects within 45 days.',
  },
  {
    q: 'If you want to build a new home...',
    a: 'New residence construction requires a two-phase approval. Phase 1 is a preliminary design review of your site plan, elevations, and materials — submit early to get feedback before finalizing plans. Phase 2 is a final plan review once construction documents are complete. All designs must comply with the East Meadows Design Guidelines. Construction may not begin until written approval is received.',
  },
  {
    q: 'If you want to remove a tree...',
    a: 'Removal of any tree with a trunk diameter greater than 6 inches at chest height requires ACC approval. Submit a request describing the tree\'s location, size, and reason for removal (disease, safety hazard, etc.). The ACC may require a certified arborist\'s report. Replacement planting is encouraged and may be required for healthy trees removed for aesthetic reasons.',
  },
  {
    q: 'If you want to change your landscaping...',
    a: 'Significant landscaping changes — including new hardscape (patios, retaining walls, walkways), water features, or major grading — require ACC approval. Routine maintenance, planting of flowers and shrubs, and lawn replacement do not require approval. When in doubt, reach out to the ACC Coordinator before beginning work.',
  },
  {
    q: 'How long does ACC review take?',
    a: 'Review timelines depend on project complexity. Minor projects (paint, roofing, landscaping) are typically reviewed within 30 days. Major projects (additions, new construction, significant remodels) may take up to 45 days. The clock starts when a complete application — including all required drawings and documentation — is received. Incomplete submissions will be returned and the timeline restarted.',
  },
  {
    q: 'What fees are associated with ACC review?',
    a: 'ACC review fees vary by project type and scope. Minor project reviews are typically free. Major remodels and new construction carry a review fee to cover administrative costs. Fees are assessed at the time of application and are non-refundable. Construction inspection fees may also apply. Contact the ACC Coordinator for the current fee schedule.',
  },
];

export default async function AccPublicPage() {
  const db = getDb();
  const [contacts, session] = await Promise.all([getContacts(db), getSession()]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Architectural Control Committee</h1>
        {hasPermission(session, 'acc_manage') && (
          <Link
            href="/acc/manage"
            className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ACC Management →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ContactsCard contacts={contacts} showGroup="acc_member" title="Committee Members" />

        <div className="bg-gray-100 rounded-xl border-2 border-gray-300 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Documents</h2>
          <div className="space-y-1">
            {DOCUMENTS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="py-2 border-b border-gray-200 last:border-0 flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Common Questions</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FAQS.map(({ q, a }) => (
          <div key={q} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{q}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
