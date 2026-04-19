# Product Requirements Document: EMHOA

**Version:** 0.3 (Draft)  
**Date:** 2026-04-16  
**Author:**  
**Status:** In Progress

---

## 1. Executive Summary

Create a full-feature HOA management system for use by members, the board, committees, professional support staff, etc. This is the larger vision; there will be many phases to get there.

The system should include a resident database with contact information, property records tied to each unit or lot, ownership history, and a homeowner portal where residents can view their account, make payments, submit requests, and access documents. Move-in/move-out processing and tenant tracking for rental properties are common additions.

Communication features cover mass email and text messaging, newsletter distribution, announcement posting, and targeted messaging to specific groups like board members or delinquent accounts. A document library for CC&Rs, bylaws, meeting minutes, and financial statements is essential.

For compliance and governance: architectural review request workflows (ARC applications), violation tracking with photo documentation and automated notice generation, CC&R enforcement tools, and hearing management. Work order and maintenance request systems handle both homeowner-submitted issues and common area maintenance, often with vendor management and bid tracking.

Meeting management features include board meeting scheduling, agenda creation, minutes storage, and voting tools for elections and resolutions. Amenity reservation systems, gate access or key fob management, reporting and analytics dashboards, audit trails, and integrations with accounting software (e.g., QuickBooks) round out the picture.

**Distinguishing approach:** This system is designed to be AI-native — not a traditional system with AI bolted on. The intent is to explore what HOA management looks like when conversational AI is the primary interface, not a supplementary feature.

---

## 2. Problem Statement

Current HOA management systems exist but are old-school. The goal here is to build a modern, AI-native alternative — partly as an exploration, partly because an outsider's perspective may surface approaches that domain insiders wouldn't consider.

Key motivations:

- Build something AI-native from the ground up, not AI added to an existing system
- Intentionally approach the domain without deep prior knowledge — this may lead to mistakes, but also to fresh perspectives
- Commercial viability is a secondary consideration; learning and utility come first

### Current State

HOA management today appears largely ad-hoc. Document management, committee records, and correspondence live in individual email threads. Each user or committee maintains their own copy of records. There is no central system of record.

This means:

- Information is siloed — one person's inbox is another person's blind spot
- Institutional knowledge is fragile — it lives with individuals, not the organization
- Common questions require digging through email or chasing down the right person

### Desired State

- A central system of record for HOA data: units, owners, contacts, documents, projects
- Any authorized user can answer common questions without hunting through email
- Committees have a shared workspace rather than parallel email threads
- Communication flows through the system, not around it

---

## 3. Users

### Primary Users

| User                         | Role                                     | Key Needs                                                                               |
| ---------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Members / Homeowners         | Residents of the HOA                     | Access to their account, project status, documents, and community info; submit requests |
| Board Members                | Elected governing body                   | Governance tools, financial oversight, meeting management, decision records             |
| ACC Members (full committee) | Volunteer architectural review committee | Shared project queue, review history, fee tracking, plan documents, meeting preparation |
| Other Committee Members      | Volunteers on other HOA committees       | Shared records and communications within their committee                                |
| Professional Managers        | HOA management company staff             | Full access to data, operational tools, reporting                                       |

### Secondary Users

| User                  | Role                       | Access Level                                                         |
| --------------------- | -------------------------- | -------------------------------------------------------------------- |
| Contractors / Vendors | External service providers | Limited — submit bids, receive work orders                           |
| Tenants               | Renters in HOA units       | Limited — community info, amenity reservations, maintenance requests |

---

## 4. Goals and Non-Goals

### Goals

- **Phase 1:** Deliver the ACC project management system described in [POC.md](POC.md) — a working, AI-native tool for tracking architectural review projects, fees, contacts, and HOA documents
- **Longer term:** Build toward a full HOA management platform covering communications, document management, unit/owner records, and governance workflows
- Make information accessible: any authorized user should be able to answer common questions (who is on the board, how do I submit a maintenance request, what is the status of my project) without hunting through email
- Keep the AI interface central, not supplementary — users talk to the system, not click through forms

### Non-Goals

- Not building integrations with existing systems — the goal is a clean greenfield build; data import can be handled case-by-case as needed
- Not a full accounting system; a future integration with QuickBooks or similar is possible but not in scope now
- Not trying to replicate every feature of existing commercial HOA platforms from day one
- Not optimizing for commercial viability in the near term
- Legal/compliance requirements (Davis-Stirling Act, etc.) are not a constraint for the prototype; they would be addressed before any production deployment

---

## 5. Core Concepts and Data Model

### Users

Individuals who interact with the system. A user has a profile (name, contact info, login credentials) and belongs to one or more groups. Users may also be linked to a unit as an owner, co-owner, or tenant.

Key attributes: name, email, phone, mailing address, linked unit(s), group memberships, role/access level.

### Groups

Named collections of users that define roles and access. Groups are used to represent the board, individual committees, management staff, and other organizational units.

Examples: `Board of Directors`, `Architectural Control Committee`, `Management Company`

Key attributes: name, description, members, permissions.

### Units

Each lot or unit in the HOA. Units are the anchor for property records, ownership history, project history, and financial accounts.

Key attributes: lot number, address, current owner(s), occupancy status (owner-occupied vs. rental), ownership history, associated projects, outstanding balances.

### Documents

Files and records associated with the HOA or individual units/projects. Access is tiered based on sensitivity.

| Tier             | Examples                                   | Visible To            |
| ---------------- | ------------------------------------------ | --------------------- |
| Public           | Community info, amenity rules              | Anyone                |
| Members          | CC&Rs, bylaws, meeting minutes, financials | All members           |
| Board/Staff      | Enforcement records, delinquency details   | Board + management    |
| Project-specific | Plans, correspondence, approval letters    | Project parties + ACC |

Key attributes: title, file, tier, associated unit or project (optional), upload date, uploader.

### Projects (ACC / Architectural Review)

Homeowner requests for architectural approval. Described in detail in [POC.md](POC.md).

### Relationships

- A **Unit** has one or more **Users** (owners, tenants)
- A **User** belongs to one or more **Groups**
- A **Project** is linked to a **Unit** and has associated **Users** (owner, designer, contractor)
- A **Document** may be association-wide or linked to a **Unit** or **Project**

---

## 6. Feature Requirements

> Priority: P0 = must-have for launch, P1 = important, P2 = nice-to-have, P3 = future

### 6.1 Foundation: Data and CRUD

**FR-1 [P0]: User Management**  
Create, view, edit, and deactivate user accounts. Link users to units and groups.

**FR-2 [P0]: Group Management**  
Create and manage groups (board, committees, staff). Add and remove members. Groups drive permissions and communication targeting.

**FR-3 [P0]: Unit Records**  
Maintain a record for each lot/unit including address, current owner, occupancy status, and links to projects and documents. Track ownership changes over time.

**FR-4 [P0]: Document Library**  
Upload, organize, and retrieve documents. Enforce access tiers (public, members, board). Support association-wide and unit/project-specific documents.

### 6.2 Architectural Committee (ACC) Management

See [POC.md](POC.md) for the implementation spec. The ACC review process has four project categories, each with a distinct fee schedule and review workflow (source: Design Guidelines):

**Project Categories and Standard Fees:**

| Category                 | Review Fee | Compliance Deposit | Contractor Deposit | Re-Veg Deposit |
| ------------------------ | ---------- | ------------------ | ------------------ | -------------- |
| New Residence            | $2,000     | $3,500             | $5,000             | $2,500         |
| Major Remodel / Addition | $1,000     | $2,000             | $2,000             | — (included)   |
| Minor Exterior Remodel   | $250       | $500               | $500               | — (included)   |
| Landscaping / Other      | $200       | Case-by-case       | —                  | —              |

Additional fees: $200–$400 per extra review, meeting, or inspection beyond what's covered; ACC Consultant time billed at normal rate after included hours.

**Special lot rules:** Lots north of/including #212, 301, 409 require USFS color approval. Phase 3 lots (701–713) require TC-TAC approval before final review.

**FR-5 [P0]: Project Lifecycle Tracking**  
Track ACC projects from inquiry through completion. Full lifecycle: `inquiry → preliminary_review → final_review → approved → under_construction → complete` (plus `on_hold`).

**FR-6 [P0]: Fee Tracking**  
Record standard fees per project type; track payment dates for review fees, compliance deposits, contractor deposits, and re-veg deposits. Surface unpaid balances across all active projects.

**FR-7 [P1]: Deadline Tracking**  
Track all time-sensitive deadlines: plan submission cutoff (14 days before meeting), Final Plan submission window (90 days from Preliminary approval), construction start window (90 days from effective approval date), winter erosion control deadline (Oct 31), earthwork blackout (Nov 1 – Apr 1), compliance deposit refund windows (Final Inspection within 60 days of notification; re-veg within 5 years for new residences, 3 years for others).

**FR-8 [P1]: Condition Tracking**  
Store approval conditions as structured checklist items; track which are satisfied. Flag projects with outstanding conditions.

**FR-9 [P2]: Inspection Log**  
Per-project timestamped log of site inspections (contractor constraints meeting, compliance inspections, re-vegetation inspections) with inspector, date, outcome, and notes.

**FR-10 [P2]: External Agency Tracking**  
Track required third-party approvals: TC-TAC, USFS (for sensitive visual area lots), Alpine County Building Department permit status.

### 6.3 Communications

**FR-11 [P1]: Targeted Messaging**  
Send messages to specific groups (all members, board only, delinquent accounts, specific committee). Log sent communications.

**FR-12 [P2]: Announcements and Newsletters**  
Post announcements visible to members via the portal. Support newsletter distribution.

### 6.4 Member Portal

**FR-13 [P1]: Homeowner Account View**  
Members can view their unit info, project history, outstanding fees, and associated documents.

**FR-14 [P2]: Request Submission**  
Members can submit ACC applications, maintenance requests, and general inquiries through the portal.

**FR-15 [P2]: Amenity Reservations**  
Reserve shared amenities (pool, clubhouse) through the portal.

### 6.5 Governance

**FR-16 [P2]: Meeting Management**  
Schedule board meetings, create agendas, store minutes.

**FR-17 [P3]: Voting**  
Support e-voting for elections and resolutions.

---

## 7. User Flows

### Flow 1: New Residence — Full ACC Review Lifecycle

This is the most complex project type. The process has strict deadlines and involves external agencies.

**Pre-submission:**

1. Owner contacts ACC to get on the agenda and receive instructions
2. Owner hires a civil engineer or registered land surveyor to prepare topographic plans
3. Owner verifies HOA dues are current (ACC will not review plans if dues are delinquent)
4. For Phase 3 lots (701–713) or sensitive visual area lots (north of/including #212, 301, 409): owner initiates TC-TAC and/or USFS color review in parallel

**Preliminary Review:** 5. Owner submits 8 plan sets + $2,000 review fee at least **14 days before** the EMACC meeting 6. Plans are distributed to: EMACC Review Architect, each EMACC member, EMACC Consulting Engineer, Snow Removal Contractor 7. EMACC Review Architect reviews plans before the meeting 8. EMACC meets and reviews; may approve, request changes, or reject 9. EMACC notifies owner in writing of outcome 10. If rejected: owner may resubmit; 12 months of inactivity = application deemed withdrawn

**Final Review (must occur within 90 days of Preliminary approval):** 11. Owner addresses all issues from Preliminary Review 12. For sensitive lots: confirms TC-TAC/USFS approvals are in hand 13. Owner submits final plans (1/4" scale) + sample board with actual material samples + re-vegetation plan, at least **14 days before** meeting 14. Owner pays Compliance Deposit ($3,500 construction + $2,500 re-veg = $5,000 total) before final approval is granted 15. EMACC stamps plans; **approval is effective 31 days after stamp**

**Pre-Construction:** 16. Owner obtains Alpine County building permit (requires EMACC, KMPUD, and Mountain Utilities stamps) 17. Contractor schedules on-site meeting with EMACC Consulting Engineer at least **1 week before** construction starts 18. At on-site meeting: temporary erosion controls installed, construction zone fenced, Contractor Constraints document signed by EMACC Consultant + Contractor + Owner, Contractor Deposit ($5,000) paid 19. Construction may not begin until all of the above are complete and 31-day approval waiting period has passed

**Construction:** 20. No earthwork between **November 1 and April 1** 21. Erosion control measures must be in place by **October 31** each year 22. Any plan changes during construction must be submitted to and approved by EMACC before proceeding

**Completion:**

23. Owner notifies EMACC in writing that construction is complete
24. EMACC conducts Final Inspection within 60 days; verifies conformance with approved plans and site clean-up
25. $3,500 Compliance Deposit refunded upon successful inspection (must occur within 1 year of Alpine County final inspection)
26. Owner implements re-vegetation per approved plan
27. Owner notifies EMACC in writing when re-vegetation is complete
28. EMACC conducts up to 2 re-vegetation inspections within 60 days of notification
29. $2,500 re-veg deposit refunded upon success (must occur within 5 years of deposit receipt)

---

### Flow 2: Minor Exterior Remodel

Simpler than new construction — one round of review, no preliminary step required.

1. Owner contacts ACC to discuss what information is needed for the specific remodel type
2. Owner submits plans + $250 review fee at least 14 days before meeting
3. EMACC reviews; may request one revision before approving (additional $200/review beyond first)
4. Owner pays $500 Compliance Deposit before final approval
5. Pre-construction on-site meeting; Contractor Constraint document signed; $500 Contractor Deposit paid
6. Construction proceeds
7. Owner notifies EMACC upon completion; Final Inspection includes both compliance and re-vegetation check
8. $500 deposit refunded upon successful inspection (must occur within 3 years)

_Covers: new paint/stain color, new roof, new siding, deck expansion, new deck, walkways, stairs, window/door relocation, exterior lighting, retaining walls, minor driveway modifications._

---

### Flow 3: Tree Removal (Standalone)

Tree removal can be triggered as part of a construction project or as a standalone request.

1. Owner submits written application to EMACC with plot plan showing trees to be removed (species, DBH, location), reason for removal, and $10/tree fee
2. For trees within a building envelope as part of an approved design: EMACC approval only
3. For dead or arborist-identified hazard trees: EMACC approval only
4. For all other cases: both TC-TAC and EMACC approval required
5. Owner pays cash deposit ($100–$500) and provides proof of liability insurance
6. Permit valid for 90 days
7. Penalty for unauthorized removal: $30/inch DBH (replacement value) + $60/inch DBH to EMHOA

_No approval required for: removing dead branches within 30 ft of house below 5–6 ft height, or branches overhanging a roof._

---

### Flow 4: ACC Member Reviews the Project Queue

1. ACC member opens the chat interface
2. Asks: "What's coming up for the next meeting?" or "Show me all projects in preliminary review"
3. System returns projects with lot numbers, types, submission dates, deadlines, and outstanding items (missing fees, required external approvals)
4. Member asks for details on a specific project; reviews plan documents, conditions, fee status
5. Member adds notes or flags items for discussion at the meeting

---

### Flow 5: Member Looks Up Community Information

1. Member opens the portal or chat interface
2. Asks: "Who is on the board?", "What are the rules for solar panels?", or "Can I remove a dead tree without approval?"
3. System retrieves the relevant contact or reads the applicable section of the Design Guidelines
4. Member gets a direct answer without emailing anyone

---

## 8. Technical Constraints and Considerations

### Current Stack (Phase 1)

- **Runtime:** Node.js / TypeScript
- **Framework:** Next.js (App Router) — adopted early for its first-class Supabase Auth helpers and clean handling of AI streaming responses; replaces the originally planned Express + vanilla HTML approach
- **Database:** SQLite3 (better-sqlite3) — chosen over YAML file storage to minimize throwaway code and keep the schema close to what Supabase/PostgreSQL will require
- **AI:** Anthropic Claude API with tool use and SSE streaming
- **Frontend:** React + Tailwind CSS + shadcn/ui

SQLite3 is the right Phase 1 choice: it's a real relational database with SQL semantics, the schema will translate directly to PostgreSQL/Supabase with minimal rework, and it avoids investing in file-parsing infrastructure that gets discarded.

### Production Stack (Phase 2+)

- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, built-in auth) — direct migration path from SQLite3
- **Hosting:** Vercel (frontend + serverless API routes)
- **AI:** Anthropic Claude API with tool use (retained from Phase 1)
- **Frontend:** Next.js — already in use; Vercel-native, first-class Supabase Auth helpers via `@supabase/ssr`

Alternative stacks are open for consideration, but Supabase + Vercel is the preferred path.

### Multi-tenancy

Multi-tenancy is not required for the POC but **must be designed into the schema from the beginning**. Every table that is HOA-specific (units, projects, members, documents, etc.) should include a foreign key to an `organizations` table. This allows the POC to operate as single-tenant while the production system supports multiple HOAs without a schema migration.

### Constraints

- AI interface must remain central, not a bolt-on — architecture decisions should preserve the conversational-first model as the system grows
- No external integrations in scope for the prototype; clean greenfield build only
- POC runs locally; production deployment requires hosting (Vercel) and a real database (Supabase)
- Schema must be multi-tenant-aware from day one, even if only one tenant exists in the POC

### Open Technical Questions

- **Auth model:** Phase 1 uses a simple demo cookie session (hardcoded users) as a placeholder. For Phase 2, the plan is primary OAuth (Google, etc.) with magic link fallback for users without social accounts. Needs validation with the actual user base — some HOA members may resist linking social accounts.
- **AI interface at scale:** Each user needs their own agent context. How is conversation history stored — per-user in Supabase, or ephemeral per session? Phase 1 chat is stateless (no history persistence).

---

## 9. Success Metrics

| Metric                                | Current                  | Target                                        | How Measured  |
| ------------------------------------- | ------------------------ | --------------------------------------------- | ------------- |
| Time to answer "who is on the board?" | Minutes (email or phone) | Seconds                                       | Manual timing |
| ACC project data in one place         | 0% (email/paper)         | 100% of active projects                       | Audit         |
| Fee collection visibility             | None                     | All unpaid fees surfaced on demand            | Manual check  |
| Document findability                  | Ad-hoc                   | Any member can find a document without asking | User feedback |

---

## 10. Milestones and Phases

### Phase 1: ACC Project Management (POC) — Status: In Progress

Build the ACC project tracking system described in [POC.md](POC.md). Single-user, local. Establishes the core AI-native interaction model and the schema that will carry forward into production.

- SQLite3 database with a multi-tenant-aware schema (`organization_id` on all HOA-scoped tables)
- Project lifecycle tracking (inquiry → complete)
- Fee tracking and payment recording
- Contact management (owners, designers, contractors, ACC/board members)
- HOA document access via chat
- Conversational interface with Claude

### Phase 2: Foundation Data Layer — Target: TBD

Introduce the core data entities needed for a multi-user system. Still may be local or lightly hosted.

- User accounts and authentication
- Group management (board, committees)
- Unit records with ownership history
- Document library with access tiers

### Phase 3: Member Portal — Target: TBD

Give homeowners self-service access to their own information.

- Homeowner account view (unit, projects, fees, documents)
- ACC application submission
- Basic communication (announcements, notifications)

### Phase 4 and Beyond

- Maintenance request workflows
- Meeting management and minutes
- Amenity reservations
- Accounting integrations
- Mobile access

---

## 11. Open Questions

| #   | Question                                                       | Status   | Notes                                                                                   |
| --- | -------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| 1   | What systems does the HOA currently use?                       | Open     | Would help identify data to import; not blocking for greenfield build                   |
| 2   | Who are the intended early users beyond the ACC administrator? | Resolved | Full ACC committee, board members, and project parties (owners, designers, contractors) |
| 3   | Hosting constraint?                                            | Resolved | POC runs locally; production target is Supabase + Vercel                                |
| 4   | Replace vs. integrate with accounting system?                  | Resolved | Starting from scratch; no integrations in scope for prototype                           |
| 5   | Legal/compliance requirements (Davis-Stirling)?                | Resolved | Not a constraint for the prototype; would apply before any production deployment        |
| 6   | POC data layer?                                                | Resolved | SQLite3 — avoids YAML throwaway code; schema translates directly to PostgreSQL/Supabase |
| 7   | Single HOA or multi-tenant?                                    | Resolved | Multi-tenant from day one — `organization_id` on all HOA-scoped tables; POC runs single-tenant |
| 8   | Frontend framework?                                            | Resolved | Next.js — adopted in Phase 1; Vercel-native, first-class Supabase Auth helpers, App Router handles AI streaming well |
| 9   | Auth model for non-technical users?                            | Partially resolved | Primary: OAuth providers (Google, etc.); fallback: magic links for users without social accounts. Needs validation with actual user base before committing. |

---

## 12. Appendix

### Related Documents

- [POC Requirements](POC.md) — scope and implementation details for the initial proof-of-concept
- [Enhancements Backlog](enhancements.md)
- [Contacts Spec](specs/contacts.md)
- [Foundation Requirements](Requirements.md)

### Glossary

| Term               | Definition                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| ACC                | Architectural Control Committee — reviews and approves homeowner construction/renovation projects |
| ARC                | Architectural Review Committee — alternate name for ACC used in some HOAs                         |
| HOA                | Homeowners Association                                                                            |
| CC&Rs              | Covenants, Conditions, and Restrictions — the governing document defining HOA rules               |
| Davis-Stirling Act | California law governing HOA operations and member rights                                         |
| Unit               | A lot or home within the HOA; the anchor for property and financial records                       |
