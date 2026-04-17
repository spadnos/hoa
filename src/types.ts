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

export type MemberRole = 'legal_owner' | 'resident';

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
