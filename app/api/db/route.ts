
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

    const schemaAndData = tables.map((table: any) => {
      const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
      const data = db.prepare(`SELECT * FROM ${table.name}`).all();
      return { name: table.name, schema, data };
    });

    return NextResponse.json({ dbInfo: schemaAndData });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching DB info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
