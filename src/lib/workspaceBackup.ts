const workspaceKeys = [
  'ion-launch:launch-packets',
  'ion-launch:last-launch-packet',
  'ion-launch:trade-drafts',
  'ion-launch:watchlist',
] as const;

export interface WorkspaceBackup {
  app: 'ion-launch';
  version: 1;
  exportedAt: string;
  records: Partial<Record<(typeof workspaceKeys)[number], string>>;
}

export function createWorkspaceBackup(): WorkspaceBackup {
  const records: WorkspaceBackup['records'] = {};
  if (typeof window === 'undefined') {
    return { app: 'ion-launch', version: 1, exportedAt: new Date().toISOString(), records };
  }

  workspaceKeys.forEach((key) => {
    const value = window.localStorage.getItem(key);
    if (value) records[key] = value;
  });

  return {
    app: 'ion-launch',
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
  };
}

export function restoreWorkspaceBackup(value: unknown) {
  if (typeof window === 'undefined' || !isWorkspaceBackup(value)) return 0;
  let restored = 0;
  workspaceKeys.forEach((key) => {
    const record = value.records[key];
    if (record) {
      window.localStorage.setItem(key, record);
      restored += 1;
    }
  });
  return restored;
}

function isWorkspaceBackup(value: unknown): value is WorkspaceBackup {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'app' in value &&
    value.app === 'ion-launch' &&
    'records' in value &&
    value.records &&
    typeof value.records === 'object',
  );
}
