import fs from 'fs';
import path from 'path';

const FILE_STORE_PATH = path.resolve(process.cwd(), 'server_db_store.json');

export interface ServerStoreData {
  users?: any[];
  roles?: any[];
  links?: any[];
  preRegistrations?: any[];
  auditLogs?: any[];
  clubSettings?: any;
  announcements?: any[];
  sessions?: any[];
  courses?: any[];
  enrollments?: any[];
  transactions?: any[];
  attendanceRecords?: any[];
  debtors?: any[];
  creditors?: any[];
  insuranceRequests?: any[];
  supportTickets?: any[];
  notifications?: any[];
  products?: any[];
  shopInvoices?: any[];
  smsLogs?: any[];
}

export function readFileStore(): ServerStoreData {
  try {
    if (fs.existsSync(FILE_STORE_PATH)) {
      const content = fs.readFileSync(FILE_STORE_PATH, 'utf-8');
      if (content.trim()) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.error('[FileStore] Error reading server_db_store.json:', err);
  }

  return {
    users: [],
    roles: [],
    links: [],
    preRegistrations: [],
    auditLogs: [],
    clubSettings: {},
    announcements: [],
    sessions: [],
    enrollments: [],
    transactions: [],
    attendanceRecords: [],
    debtors: [],
    creditors: [],
    insuranceRequests: [],
    supportTickets: [],
    notifications: [],
    products: [],
    shopInvoices: [],
    smsLogs: [],
  };
}

export function deleteFromFileStore(collection: keyof ServerStoreData, id: string): void {
  try {
    const current = readFileStore();
    const arr = current[collection];
    if (Array.isArray(arr)) {
      (current as any)[collection] = arr.filter((item: any) => item && item.id !== id);
      fs.writeFileSync(FILE_STORE_PATH, JSON.stringify(current, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[FileStore] Error deleting from server_db_store.json:', err);
  }
}

export function writeFileStore(data: ServerStoreData): void {
  try {
    const current = readFileStore();
    const updated: ServerStoreData = { ...current };

    (Object.keys(data) as (keyof ServerStoreData)[]).forEach((key) => {
      const val = data[key];
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          if (val.length > 0) {
            (updated as any)[key] = val;
          }
        } else if (typeof val === 'object' && Object.keys(val).length > 0) {
          (updated as any)[key] = { ...((current as any)[key] || {}), ...val };
        }
      }
    });

    if (Array.isArray(data.sessions) && data.sessions.length > 0) {
      updated.sessions = data.sessions;
    } else if (Array.isArray(data.courses) && data.courses.length > 0) {
      updated.sessions = data.courses;
    }

    fs.writeFileSync(FILE_STORE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('[FileStore] Error writing server_db_store.json:', err);
  }
}
