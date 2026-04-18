import { NextResponse } from 'next/server';
import { listProjects } from '@/src/tools/list-projects';
import { createProject } from '@/src/tools/create-project';
import { getDb } from '@/src/db';

export async function GET() {
  const db = getDb();
  const projects = await listProjects({}, db);
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json();
  const result = await createProject(body, db);
  if (typeof result === 'string') {
    return NextResponse.json({ error: result }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}
