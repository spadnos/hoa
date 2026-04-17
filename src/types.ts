export type ProjectType =
  | 'new_residence'
  | 'minor_remodel'
  | 'major_remodel'
  | 'landscaping';

export type ProjectStatus =
  | 'inquiry'
  | 'preliminary_review'
  | 'final_review'
  | 'approved'
  | 'under_construction'
  | 'complete'
  | 'on_hold';

export interface Fee {
  description: string;
  amount: number;
  due_at: string;
  paid: string | null;
}

export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  company?: string;         // designer/contractor only
  lot_address?: string;     // owner only
  mailing_address?: string; // owner only
}

export interface HoaContact {
  id: number;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface HoaMembers {
  acc_members: HoaContact[];
  board_members: HoaContact[];
}

export interface Project {
  id: string;
  lot: number;
  owner: ContactInfo;
  address: string;
  designer?: ContactInfo;
  contractor?: ContactInfo;
  type: ProjectType;
  status: ProjectStatus;
  submitted: string;        // ISO date string, e.g. "2026-04-15"
  fees: Fee[];
  notes?: string;
  preliminary_approved_at?: string;
  final_approved_at?: string;
  construction_started_at?: string;
  owner_notified_complete_at?: string;
}

export interface ProjectSummary {
  id: string;
  lot: number;
  owner: string;            // derived from owner.name
  type: ProjectType;
  status: ProjectStatus;
  directory?: string;       // deprecated: no longer populated with SQLite backend
}

export interface Condition {
  id: number;
  project_id: string;
  description: string;
  satisfied_at: string | null;
  created_at: string;
}

export interface Inspection {
  id: number;
  project_id: string;
  type: string;
  inspector: string;
  date: string;
  outcome: string;
  notes: string | null;
  created_at: string;
}

export interface ProjectDocument {
  id: number;
  project_id: string;
  title: string;
  file_path: string;
  description: string | null;
  uploaded_at: string;
}

export type LotAssociationRole = 'owner' | 'resident' | 'trustee' | 'corporate_owner';
export type OrgType = 'management' | 'utility' | 'vendor' | 'government' | 'other';

export interface Party {
  id: number;
  organization_id: string;
  type: 'person' | 'organization';
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface PartyOrg {
  party_id: number;
  org_type: OrgType;
  website: string | null;
}

export interface Lot {
  id: number;
  organization_id: string;
  lot_number: number;
  notes: string | null;
}

export interface LotAddress {
  id: number;
  lot_id: number;
  address: string;
  unit: string | null;
}

export interface LotAssociation {
  id: number;
  lot_id: number;
  lot_address_id: number | null;
  party_id: number;
  role: LotAssociationRole;
  is_primary_contact: boolean;
  mailing_address: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface GroupMembership {
  id: number;
  party_id: number;
  group_name: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface PartyAffiliation {
  id: number;
  person_party_id: number;
  org_party_id: number;
  title: string | null;
}

export interface DirectoryParty extends Party {
  org_type?: OrgType;
  website?: string | null;
  lot_associations: Array<LotAssociation & { lot_number: number; address: string | null; unit: string | null }>;
  current_memberships: GroupMembership[];
  affiliations: Array<PartyAffiliation & { org_name: string }>;
  affiliated_persons: Array<PartyAffiliation & { person: Party }>;
}

/** @deprecated Use Party-based types instead */
export type MemberRole = 'legal_owner' | 'resident';

/** @deprecated Use Party-based types instead */
export interface Member {
  id: number;
  lot: number;
  name: string;
  role: MemberRole;
  is_primary_contact: boolean;
  email: string | null;
  phone: string | null;
  mailing_address: string | null;
  notes: string | null;
  created_at: string;
}
