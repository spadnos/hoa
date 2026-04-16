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

export interface Project {
  id: string;
  lot: number;
  owner: string;
  address: string;
  type: ProjectType;
  status: ProjectStatus;
  submitted: string;   // ISO date string, e.g. "2026-04-15"
  fees: Fee[];
  notes?: string;
}

export interface ProjectSummary {
  id: string;
  lot: number;
  owner: string;
  type: ProjectType;
  status: ProjectStatus;
  directory: string;   // full path to project directory
}
