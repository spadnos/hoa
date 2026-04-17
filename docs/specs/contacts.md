# HOA Contact Management System Specification

## Overview

A comprehensive contact and user management system for Homeowners Associations (HOAs), designed to comply with California's Davis-Stirling Act while supporting both per-unit and weighted voting systems.

## Key Requirements

### Functional Requirements

1. **Contact Directory Management**
   - Maintain directory of all HOA contacts (owners, representatives, tenants, vendors, professionals)
   - Support multiple contact types and relationships
   - Track unit ownership and occupancy over time
   - Manage group memberships (board, committees)

2. **California Legal Compliance**
   - Davis-Stirling Act compliance (Civil Code 4041)
   - Annual contact information solicitation and tracking
   - Required delivery method preferences (mail/email)
   - Legal representative and emergency contact tracking
   - Occupancy status tracking (owner-occupied, rental, vacant, undeveloped)

3. **Flexible Voting Support**
   - Per-unit voting (one vote per unit)
   - Weighted voting (by square footage, assessment percentage, or custom weights)
   - Voting eligibility snapshots for elections
   - Co-ownership percentage tracking

4. **Privacy and Access Control**
   - Granular privacy preferences by data type
   - Role-based access with privacy overrides
   - Board member access for fiduciary duties
   - Audit logging for contact access
   - Member opt-out capabilities

5. **Group and Committee Management**
   - Board of directors
   - Standing and ad-hoc committees
   - Working groups and distribution lists
   - Role assignments with terms and expiration

## Database Schema (SQLite Implementation)

### Core Entities

```sql
-- Core person record
CREATE TABLE person (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  email_primary TEXT,
  email_secondary TEXT,
  phone_mobile TEXT,
  phone_home TEXT,
  phone_work TEXT,
  mailing_address TEXT, -- JSON string: {"street": "123 Main St", "city": "Anytown", "state": "CA", "zip": "12345"}
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Units in the community
CREATE TABLE unit (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  unit_number TEXT NOT NULL,
  building TEXT,
  street_address TEXT,
  square_footage INTEGER,
  bedrooms INTEGER,
  bathrooms REAL,
  parking_spaces TEXT, -- JSON array: ["A1", "A2"]
  -- For weighted voting systems
  voting_weight REAL DEFAULT 1.0,  -- fractional votes allowed
  assessment_pct REAL,             -- percentage of total assessments
  original_size INTEGER,           -- for calculating proportional voting
  parcel_id TEXT,                  -- assessor's parcel number
  is_active INTEGER DEFAULT 1
);

-- Ownership history (time-bounded for audit trail)
CREATE TABLE unit_ownership (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  unit_id TEXT REFERENCES unit(id),
  owner_person_id TEXT REFERENCES person(id),
  owner_entity_id TEXT REFERENCES entity(id),
  ownership_pct REAL DEFAULT 100.0,  -- for co-owners
  start_date TEXT NOT NULL, -- ISO date format
  end_date TEXT,            -- ISO date format, NULL = current
  is_primary_owner INTEGER DEFAULT 1,
  deed_recorded_date TEXT,
  acquisition_type TEXT  -- purchase, inheritance, transfer, etc.
);

-- Entity owners (LLCs, trusts, corporations)
CREATE TABLE entity (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  legal_name TEXT NOT NULL,
  entity_type TEXT,  -- LLC, trust, corporation, partnership
  dba_name TEXT,
  tax_id TEXT,
  state_of_formation TEXT,
  mailing_address TEXT, -- JSON string
  notes TEXT
);
```

### California Compliance

```sql
-- California Civil Code 4041 compliance: Annual member contact information
CREATE TABLE member_contact_info (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person_id TEXT REFERENCES person(id) NOT NULL,
  unit_id TEXT REFERENCES unit(id) NOT NULL,
  
  -- Required by CC 4041(a)(1) - preferred delivery method
  preferred_delivery TEXT CHECK (preferred_delivery IN ('mail', 'email', 'both')) NOT NULL,
  preferred_email TEXT,
  preferred_mail_address TEXT, -- JSON string
  
  -- Required by CC 4041(a)(2) - secondary delivery method  
  secondary_delivery TEXT CHECK (secondary_delivery IN ('mail', 'email', 'both')),
  secondary_email TEXT,
  secondary_mail_address TEXT, -- JSON string
  
  -- Required by CC 4041(a)(3) - legal representative
  legal_rep_name TEXT,
  legal_rep_address TEXT, -- JSON string
  legal_rep_email TEXT,
  legal_rep_relationship TEXT,  -- power_of_attorney, emergency_contact, etc.
  
  -- Required by CC 4041(a)(4) - occupancy status
  occupancy_status TEXT CHECK (occupancy_status IN (
    'owner_occupied', 'rented', 'vacant_developed', 'undeveloped'
  )) NOT NULL,
  
  -- Tracking and compliance
  solicitation_date TEXT NOT NULL,
  response_date TEXT,
  valid_through_date TEXT NOT NULL,
  email_validated INTEGER DEFAULT 0,
  email_bounce_count INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Relationships and Authorization

```sql
-- Current occupants (owners, tenants, family)
CREATE TABLE unit_occupancy (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  unit_id TEXT REFERENCES unit(id),
  person_id TEXT REFERENCES person(id),
  occupancy_type TEXT,  -- owner_occupant, tenant, family_member, caregiver, etc.
  start_date TEXT,
  end_date TEXT,
  lease_end_date TEXT,  -- for tenants
  notes TEXT
);

-- Authorization to act on behalf of a unit (representatives, agents)
CREATE TABLE unit_authorization (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  unit_id TEXT REFERENCES unit(id),
  person_id TEXT REFERENCES person(id),
  authorization_type TEXT,  -- owner, representative, tenant_limited, emergency_contact, property_manager
  granted_by_person_id TEXT REFERENCES person(id),
  granted_by_entity_id TEXT REFERENCES entity(id),
  
  -- Specific permissions
  can_vote INTEGER DEFAULT 0,
  can_access_documents INTEGER DEFAULT 0,
  can_submit_requests INTEGER DEFAULT 0,
  can_receive_notices INTEGER DEFAULT 0,
  can_attend_meetings INTEGER DEFAULT 0,
  
  start_date TEXT NOT NULL,
  end_date TEXT,
  notes TEXT,
  
  -- For legal compliance
  authorization_document_path TEXT,  -- scan of POA, etc.
  notarized INTEGER DEFAULT 0
);

-- External organizations (vendors, management companies, professionals)
CREATE TABLE organization (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  organization_type TEXT,  -- management_co, vendor, law_firm, cpa, insurance, utility, government, bank
  license_number TEXT,
  license_state TEXT,
  address TEXT, -- JSON string
  main_phone TEXT,
  main_email TEXT,
  website TEXT,
  contract_start TEXT,
  contract_end TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1
);

-- People affiliated with organizations
CREATE TABLE organization_affiliation (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person_id TEXT REFERENCES person(id),
  organization_id TEXT REFERENCES organization(id),
  title TEXT,
  role_type TEXT,  -- primary_contact, billing, field_staff, emergency_contact
  direct_phone TEXT,
  direct_email TEXT,
  start_date TEXT,
  end_date TEXT
);
```

### Groups and Governance

```sql
-- Groups: board, committees, etc.
CREATE TABLE group_definition (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  group_type TEXT,  -- board, standing_committee, ad_hoc_committee, working_group, distribution_list
  description TEXT,
  parent_group_id TEXT REFERENCES group_definition(id),
  max_members INTEGER,
  quorum_required INTEGER,
  meeting_frequency TEXT,  -- monthly, quarterly, as_needed
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Group membership with roles and terms
CREATE TABLE group_membership (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  group_id TEXT REFERENCES group_definition(id),
  person_id TEXT REFERENCES person(id),
  role TEXT,  -- chair, vice_chair, secretary, treasurer, member, liaison, ex_officio
  start_date TEXT NOT NULL,
  end_date TEXT,
  term_length TEXT,  -- "2 years", "1 year", etc.
  term_expires TEXT,
  elected_date TEXT,
  appointment_type TEXT,  -- elected, appointed, ex_officio
  notes TEXT
);
```

### Voting and Elections

```sql
-- Voting configuration per HOA
CREATE TABLE voting_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  hoa_id TEXT,  -- if you have multiple HOAs in one system
  voting_method TEXT CHECK (voting_method IN ('per_unit', 'weighted_by_sqft', 'weighted_by_assessment', 'weighted_custom')) NOT NULL,
  
  -- For weighted systems
  total_voting_weight REAL,
  weight_basis TEXT,  -- 'square_footage', 'assessment_percentage', 'custom'
  
  -- Election-specific settings
  requires_secret_ballot INTEGER DEFAULT 1,
  cumulative_voting INTEGER DEFAULT 0,
  quorum_percentage REAL DEFAULT 50.0,
  
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);

-- For tracking voting eligibility and weights at specific points in time
CREATE TABLE voting_snapshot (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  election_date TEXT NOT NULL,
  unit_id TEXT REFERENCES unit(id),
  eligible_person_id TEXT REFERENCES person(id),
  voting_weight REAL NOT NULL,
  authorization_type TEXT,  -- owner, representative, proxy
  authorized_by TEXT REFERENCES person(id),
  notes TEXT
);
```

### Privacy and Access Control

```sql
-- Privacy preferences at the person/unit level
CREATE TABLE privacy_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person_id TEXT REFERENCES person(id),
  unit_id TEXT REFERENCES unit(id),
  
  -- Granular privacy controls by data type
  share_email TEXT CHECK (share_email IN ('none', 'board_only', 'members', 'public')) DEFAULT 'board_only',
  share_phone TEXT CHECK (share_phone IN ('none', 'board_only', 'members', 'public')) DEFAULT 'board_only',
  share_mailing_address TEXT CHECK (share_mailing_address IN ('none', 'board_only', 'members', 'public')) DEFAULT 'members',
  share_occupancy_status TEXT CHECK (share_occupancy_status IN ('none', 'board_only', 'members', 'public')) DEFAULT 'members',
  share_legal_rep TEXT CHECK (share_legal_rep IN ('none', 'board_only', 'members', 'public')) DEFAULT 'board_only',
  
  -- Directory inclusion
  include_in_directory INTEGER DEFAULT 1,
  directory_name_only INTEGER DEFAULT 0,  -- show name but not contact details
  
  -- Emergency override (required by many CC&Rs)
  emergency_contact_ok INTEGER DEFAULT 1,   -- allow contact in emergencies even if opted out
  
  effective_date TEXT DEFAULT (date('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Role definitions
CREATE TABLE roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,  -- board_member, committee_member, member, vendor, public
  description TEXT,
  
  -- Built-in access levels for contact data
  can_view_all_contacts INTEGER DEFAULT 0,     -- overrides privacy preferences
  can_view_member_contacts INTEGER DEFAULT 0,  -- respects 'members' privacy setting
  can_export_contacts INTEGER DEFAULT 0,
  can_edit_own_info INTEGER DEFAULT 1,
  can_edit_others_info INTEGER DEFAULT 0,
  
  -- Administrative permissions
  can_manage_groups INTEGER DEFAULT 0,
  can_run_elections INTEGER DEFAULT 0,
  can_view_assessments INTEGER DEFAULT 0,
  
  is_active INTEGER DEFAULT 1
);

-- User role assignments
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person_id TEXT REFERENCES person(id),
  role_id TEXT REFERENCES roles(id),
  
  -- Optional scope limitations
  limited_to_group_id TEXT REFERENCES group_definition(id),  -- committee members only see their committee
  limited_to_unit_id TEXT REFERENCES unit(id),              -- property managers only see assigned units
  
  granted_by TEXT REFERENCES person(id),
  granted_date TEXT DEFAULT (date('now')),
  start_date TEXT DEFAULT (date('now')),
  end_date TEXT,
  
  notes TEXT,
  is_active INTEGER DEFAULT 1
);

-- Audit trail for contact access
CREATE TABLE contact_access_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  accessed_by TEXT REFERENCES person(id),
  accessed_person TEXT REFERENCES person(id),
  access_type TEXT,  -- view_profile, export_list, directory_lookup, emergency_contact
  data_fields TEXT,  -- JSON array: ["email", "phone_mobile", "mailing_address"]
  access_reason TEXT,  -- board_duties, committee_work, emergency, directory_request
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TEXT DEFAULT (datetime('now'))
);
```

### Initial Data Setup

```sql
-- Default roles
INSERT INTO roles (name, description, can_view_all_contacts, can_view_member_contacts, can_export_contacts, can_manage_groups) VALUES
('board_member', 'Elected board member with fiduciary duties', 1, 1, 1, 1),
('committee_chair', 'Committee chairperson', 0, 1, 1, 0),
('committee_member', 'Committee participant', 0, 1, 0, 0),
('member', 'Association member/owner', 0, 1, 0, 0),
('resident', 'Non-owner resident (tenant, family)', 0, 0, 0, 0),
('vendor', 'Service provider with limited access', 0, 0, 0, 0),
('property_manager', 'Professional management company staff', 1, 1, 1, 0);

-- Default voting configuration for per-unit voting
INSERT INTO voting_config (voting_method, quorum_percentage) VALUES
('per_unit', 50.0);

-- Board of Directors group
INSERT INTO group_definition (name, group_type, description, max_members, quorum_required) VALUES
('Board of Directors', 'board', 'Elected governing board of the association', 7, 4);
```

## Implementation Guidelines

### Technology Stack Recommendations

- **Database**: SQLite for prototyping, migrate to Supabase/PostgreSQL for production
- **Backend**: Node.js/TypeScript with Express or Fastify
- **Frontend**: React with TypeScript
- **ORM**: Prisma or Drizzle for type-safe database access
- **Authentication**: Start simple, integrate with Supabase Auth later

### Key Features to Implement

1. **Contact Management Interface**
   - Person/entity CRUD operations
   - Unit ownership tracking
   - Group membership management
   - Bulk import capabilities

2. **California Compliance Features**
   - Annual contact information solicitation workflow
   - Email validation and bounce tracking
   - Required delivery method selection
   - Audit trail maintenance

3. **Privacy Controls**
   - User-friendly privacy preference settings
   - Role-based access enforcement
   - Contact access logging
   - Directory generation with privacy respect

4. **Voting System**
   - Voting weight calculation
   - Eligibility verification
   - Snapshot generation for elections
   - Support for both voting methods

5. **Reporting and Export**
   - Member directories (with privacy filtering)
   - Committee rosters
   - Voting eligibility lists
   - Compliance reports

### Migration to Supabase

When ready to move to production:

1. **Schema Migration**
   - Convert TEXT PRIMARY KEY to UUID
   - Change INTEGER to BOOLEAN
   - Convert TEXT dates to TIMESTAMPTZ
   - Migrate JSON text fields to JSONB

2. **Add Supabase Features**
   - Row Level Security policies
   - Real-time subscriptions
   - Authentication integration
   - Auto-generated APIs

3. **Enhanced Security**
   - RLS policies for privacy enforcement
   - API rate limiting
   - Audit logging enhancement
   - CCPA compliance features

## Privacy and Compliance Notes

### California Davis-Stirling Act Requirements

- **Civil Code 4041**: Annual solicitation of member contact information including preferred delivery methods, secondary contacts, legal representatives, and occupancy status
- **Email Validation**: Must track email validity and resend to alternative addresses if emails bounce
- **Board Access**: Board members have fiduciary duties requiring access to member contact information
- **Audit Trail**: Maintain records of contact information requests and access

### Privacy Best Practices

- **Granular Controls**: Allow members to control sharing by data type (email, phone, address)
- **Opt-out Rights**: Members can exclude themselves from general directories while maintaining board access
- **Emergency Override**: Ensure emergency contacts work even when members opt out of general sharing
- **Access Logging**: Track who accesses contact information and why

This specification provides a complete foundation for implementing a California-compliant HOA contact management system with flexible voting support and comprehensive privacy controls.