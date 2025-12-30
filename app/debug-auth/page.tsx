import { getCurrentUser } from '@/lib/auth';

export default async function DebugAuthPage() {
  try {
    const user = await getCurrentUser();
    return (
      <div style={{ padding: '50px', fontFamily: 'monospace', background: '#000', color: '#0ff' }}>
        <h1>🔍 AUTH DEBUG</h1>
        <p>User: {user ? JSON.stringify(user) : 'null'}</p>
        <p>Status: {user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}</p>
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '50px', fontFamily: 'monospace', background: '#000', color: '#f00' }}>
        <h1>🚨 AUTH ERROR</h1>
        <p>Error: {error.message}</p>
        <p>Stack: {error.stack?.substring(0, 200)}...</p>
      </div>
    );
  }
}