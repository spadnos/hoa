import { NextResponse } from 'next/server';
import { getDeadlines } from '@/src/tools/get-deadlines';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysAhead = searchParams.get('days_ahead');

  const [db, session] = [getDb(), await getSession()];
  const deadlines = await getDeadlines(
    { days_ahead: daysAhead ? parseInt(daysAhead, 10) : 90 },
    db,
    session?.organizationId ?? ORG_ID
  );
  return NextResponse.json(deadlines);
}
