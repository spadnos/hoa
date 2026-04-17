import fs from 'fs';
import path from 'path';
import { createDb } from '../db';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'emhoa.db');
const SEED_FILE = path.join(process.cwd(), 'data', 'east-meadows-owners.json');
const ORG_ID = 'emhoa';

interface SeedParty {
  id: number;
  type: 'person' | 'organization';
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

interface SeedPartyOrg {
  party_id: number;
  org_type: string;
  website?: string | null;
}

interface SeedLot {
  id: number;
  lot_number: number;
  notes?: string | null;
}

interface SeedAddress {
  id: number;
  lot_id: number;
  address: string;
  unit: string | null;
}

interface SeedAssociation {
  id: number;
  lot_id: number;
  lot_address_id: number;
  party_id: number;
  role: string;
  is_primary_contact: boolean;
}

interface SeedData {
  organization_id: string;
  parties: SeedParty[];
  party_orgs: SeedPartyOrg[];
  lots: SeedLot[];
  lot_addresses: SeedAddress[];
  lot_associations: SeedAssociation[];
}

function run() {
  const db = createDb(DB_PATH);
  const seed: SeedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  // Maps from seed IDs to real DB IDs
  const partyIdMap = new Map<number, number>();
  const lotIdMap = new Map<number, number>();
  const addressIdMap = new Map<number, number>();

  db.transaction(() => {
    // Ensure organization exists
    const orgExists = db.prepare('SELECT id FROM organizations WHERE id = ?').get(ORG_ID);
    if (!orgExists) {
      db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(ORG_ID, 'East Meadows HOA');
      console.log('Created organization:', ORG_ID);
    }

    // Insert parties
    const insertParty = db.prepare(
      'INSERT INTO parties (organization_id, type, name, email, phone, notes) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertPartyOrg = db.prepare(
      'INSERT INTO party_orgs (party_id, org_type, website) VALUES (?, ?, ?)'
    );
    const orgTypeMap = new Map(seed.party_orgs.map((po) => [po.party_id, po]));

    for (const p of seed.parties) {
      const result = insertParty.run(ORG_ID, p.type, p.name, p.email ?? null, p.phone ?? null, p.notes ?? null);
      const realId = Number(result.lastInsertRowid);
      partyIdMap.set(p.id, realId);

      if (p.type === 'organization') {
        const po = orgTypeMap.get(p.id);
        insertPartyOrg.run(realId, po?.org_type ?? 'other', po?.website ?? null);
      }
    }
    console.log(`Inserted ${seed.parties.length} parties`);

    // Insert lots
    const insertLot = db.prepare(
      'INSERT INTO lots (organization_id, lot_number, notes) VALUES (?, ?, ?)'
    );
    for (const l of seed.lots) {
      const result = insertLot.run(ORG_ID, l.lot_number, l.notes ?? null);
      lotIdMap.set(l.id, Number(result.lastInsertRowid));
    }
    console.log(`Inserted ${seed.lots.length} lots`);

    // Insert lot_addresses
    const insertAddress = db.prepare(
      'INSERT INTO lot_addresses (lot_id, address, unit) VALUES (?, ?, ?)'
    );
    for (const a of seed.lot_addresses) {
      const realLotId = lotIdMap.get(a.lot_id);
      if (!realLotId) throw new Error(`No lot mapping for seed lot_id ${a.lot_id}`);
      const result = insertAddress.run(realLotId, a.address, a.unit);
      addressIdMap.set(a.id, Number(result.lastInsertRowid));
    }
    console.log(`Inserted ${seed.lot_addresses.length} lot_addresses`);

    // Insert lot_associations
    const insertAssoc = db.prepare(
      `INSERT INTO lot_associations (lot_id, lot_address_id, party_id, role, is_primary_contact)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const a of seed.lot_associations) {
      const realLotId = lotIdMap.get(a.lot_id);
      const realAddressId = addressIdMap.get(a.lot_address_id);
      const realPartyId = partyIdMap.get(a.party_id);
      if (!realLotId || !realAddressId || !realPartyId) {
        throw new Error(`Missing mapping for association id ${a.id}`);
      }
      insertAssoc.run(realLotId, realAddressId, realPartyId, a.role, a.is_primary_contact ? 1 : 0);
    }
    console.log(`Inserted ${seed.lot_associations.length} lot_associations`);
  })();

  console.log('Seed complete.');
}

run();
