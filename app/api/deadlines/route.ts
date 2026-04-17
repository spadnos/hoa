import { NextResponse } from 'next/server';
import { getDeadlines } from '@/src/tools/get-deadlines';
import { getDb } from '@/src/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysAhead = searchParams.get('days_ahead');

  const db = getDb();
  const deadlines = await getDeadlines(
    { days_ahead: daysAhead ? parseInt(daysAhead, 10) : 90 },
    db
  );
  return NextResponse.json(deadlines);
}
