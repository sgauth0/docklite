export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid bundling issues with native modules
    const { startBackupScheduler } = await import('./lib/backup-scheduler');
    startBackupScheduler();
  }
}
