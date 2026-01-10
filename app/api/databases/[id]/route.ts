import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { deleteDatabase, getDatabaseById } from '@/lib/db';
import { removeContainer } from '@/lib/docker';
import { runPsql } from './db-utils';

export const dynamic = 'force-dynamic';

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (!IDENTIFIER_PATTERN.test(username)) {
      return NextResponse.json(
        { error: 'Invalid username format' },
        { status: 400 }
      );
    }

    const databaseId = parseInt(id, 10);
    if (isNaN(databaseId)) {
      return NextResponse.json(
        { error: 'Invalid database ID' },
        { status: 400 }
      );
    }

    // Get database record
    const database = getDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Update PostgreSQL user credentials in the container
    const containerId = database.container_id;

    const updateSql = `
      DO $$
      BEGIN
        EXECUTE format('ALTER USER %I WITH PASSWORD %L', :'username', :'password');
      EXCEPTION
        WHEN undefined_object THEN
          EXECUTE format('CREATE USER %I WITH PASSWORD %L', :'username', :'password');
      END
      $$;
      DO $$
      BEGIN
        EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'database', :'username');
      END
      $$;
    `;

    try {
      await runPsql({
        containerId,
        dbName: 'postgres',
        username: 'postgres',
        password: '',
        sql: updateSql,
        format: 'raw',
        variables: {
          username,
          password,
          database: database.name,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Database credentials updated successfully',
      });
    } catch (err: any) {
      console.error('Error updating database credentials:', err);
      return NextResponse.json(
        { error: 'Failed to update credentials: ' + err.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const databaseId = parseInt(id, 10);
    if (isNaN(databaseId)) {
      return NextResponse.json(
        { error: 'Invalid database ID' },
        { status: 400 }
      );
    }

    const database = getDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ database });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const databaseId = parseInt(id, 10);
    if (isNaN(databaseId)) {
      return NextResponse.json(
        { error: 'Invalid database ID' },
        { status: 400 }
      );
    }

    const database = getDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    if (database.container_id) {
      try {
        await removeContainer(database.container_id, true);
      } catch (err: any) {
        if (err?.statusCode !== 404 && !String(err?.message || '').includes('No such container')) {
          throw err;
        }
      }
    }

    deleteDatabase(databaseId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
