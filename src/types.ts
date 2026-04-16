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

export interface Project {
  id: string;
  lot: number;
  owner: ContactInfo;       // was: string
  address: string;          // retained for display/summary
  designer?: ContactInfo;
  contractor?: ContactInfo;
  type: ProjectType;
  status: ProjectStatus;
  submitted: string;        // ISO date string, e.g. "2026-04-15"
  fees: Fee[];
  notes?: string;
}

export interface ProjectSummary {
  id: string;
  lot: number;
  owner: string;            // derived from owner.name
  type: ProjectType;
  status: ProjectStatus;
  directory: string;        // full path to project directory
}
