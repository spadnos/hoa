import { NextResponse } from 'next/server';
import { listProjects } from '@/src/tools/list-projects';
import { getDb } from '@/src/db';

export async function GET() {
  const db = getDb();
  const projects = await listProjects({}, db);
  return NextResponse.json(projects);
}
