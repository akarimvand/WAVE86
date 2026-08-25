import {
  User,
  Role,
  ParentAthleteLink,
  AuditLog,
  PreRegistrationRequest,
  INITIAL_ROLES,
  SYSTEM_PERMISSIONS,
  UserRoleKey,
  ClubSettings,
  TrainingSession,
  SessionEnrollment,
  FinancialTransaction,
  AttendanceRecord,
  DebtorRecord,
  CreditorRecord,
  InsuranceRequest,
  SupportTicket,
  TicketMessage,
  TicketStatus,
  ClubAnnouncement,
  AppNotification,
  Product,
  ShopInvoice,
  ShopInvoiceItem,
  SmsLogRecord,
} from '../types';
import { getCurrentJalaliDate, formatJalaliDate, addMonthsToJalali, isUserUnder18 } from '../utils/jalaliDate';
import { DEFAULT_CLUB_SETTINGS, applyThemeToDocument } from '../utils/theme';

const SEED_PRODUCTS: Product[] = [];


const SEED_PREREGISTER: PreRegistrationRequest[] = [];
const SEED_USERS: User[] = [];
const SEED_LINKS: ParentAthleteLink[] = [];
const SEED_SESSIONS: TrainingSession[] = [];
const SEED_ENROLLMENTS: SessionEnrollment[] = [];
const SEED_TRANSACTIONS: FinancialTransaction[] = [];
const SEED_DEBTORS: DebtorRecord[] = [];
const SEED_CREDITORS: CreditorRecord[] = [];
const SEED_INSURANCE_REQUESTS: InsuranceRequest[] = [];
const SEED_TICKETS: SupportTicket[] = [];
const SEED_ANNOUNCEMENTS: ClubAnnouncement[] = [];
const SEED_NOTIFICATIONS: AppNotification[] = [];
const SEED_ATTENDANCE: AttendanceRecord[] = [];

class StorageEngine {
  private users: User[] = [];
  private roles: Role[] = [];
  private links: ParentAthleteLink[] = [];
  private auditLogs: AuditLog[] = [];
  private preRegistrations: PreRegistrationRequest[] = [];
  private clubSettings: ClubSettings = DEFAULT_CLUB_SETTINGS;
  private sessions: TrainingSession[] = [];
  private enrollments: SessionEnrollment[] = [];
  private transactions: FinancialTransaction[] = [];
  private attendanceRecords: AttendanceRecord[] = [];
  private debtors: DebtorRecord[] = [];
  private creditors: CreditorRecord[] = [];
  private insuranceRequests: InsuranceRequest[] = [];
  private supportTickets: SupportTicket[] = [];
  private announcements: ClubAnnouncement[] = [];
  private notifications: AppNotification[] = [];
  private products: Product[] = SEED_PRODUCTS;
  private shopInvoices: ShopInvoice[] = [];
  private smsLogs: SmsLogRecord[] = [];
  private dbConnected: boolean = false;
  private syncTimeout: any = null;
  private hasLoadedFromBackend: boolean = false;

  public isDbConnected(): boolean {
    return this.dbConnected;
  }

  public setDbConnected(connected: boolean) {
    this.dbConnected = connected;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dbStoreUpdated'));
    }
  }

  public clearInMemoryData() {
    this.users = [];
    this.roles = INITIAL_ROLES;
    this.links = [];
    this.auditLogs = [];
    this.preRegistrations = [];
    this.clubSettings = DEFAULT_CLUB_SETTINGS;
    this.sessions = [];
    this.enrollments = [];
    this.transactions = [];
    this.attendanceRecords = [];
    this.debtors = [];
    this.creditors = [];
    this.insuranceRequests = [];
    this.supportTickets = [];
    this.announcements = [];
    this.notifications = [];
    this.products = [];
    this.shopInvoices = [];
    this.smsLogs = [];
  }

  constructor() {
    this.init();
    this.setupRealtimeSyncListeners();
  }

  private setupRealtimeSyncListeners() {
    if (typeof window === 'undefined') return;

    // Periodically fetch data from server every 5 seconds if tab is visible
    setInterval(() => {
      if (!document.hidden) {
        this.loadFromBackendMySql();
      }
    }, 5000);

    // Refresh immediately when user switches back to tab or focuses window
    window.addEventListener('focus', () => {
      this.loadFromBackendMySql();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.loadFromBackendMySql();
      }
    });
  }

  private init() {
    this.clearInMemoryData();

    // Clean up ALL localStorage completely so no data or tokens remain in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('[dbStore] Cleaned up localStorage:', e);
      }
    }
  }

  private sanitizeAndOptimizeStorage() {
    // 0. Ensure clubSettings never has recursive settings_json property
    if (this.clubSettings && (this.clubSettings as any).settings_json !== undefined) {
      delete (this.clubSettings as any).settings_json;
    }

    // 1. Cap unlimited log arrays to prevent database bloat
    if (this.auditLogs.length > 250) this.auditLogs = this.auditLogs.slice(0, 250);
    if (this.notifications.length > 150) this.notifications = this.notifications.slice(0, 150);
    if (this.smsLogs.length > 150) this.smsLogs = this.smsLogs.slice(0, 150);

    // 2. Auto-convert any lingering base64 image strings to server static URLs
    const processImageField = (obj: any, fieldName: string, folderType: string, customName: string) => {
      if (obj && typeof obj[fieldName] === 'string' && obj[fieldName].startsWith('data:image/')) {
        const base64Data = obj[fieldName];
        fetch('/api/upload/general', {
          method: 'POST',
          headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            fileBase64: base64Data,
            folderType,
            fileName: 'image.jpg',
            customName,
          }),
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.url) {
              obj[fieldName] = json.url;
            }
          })
          .catch(() => {});
      }
    };

    this.users.forEach((u) => processImageField(u, 'avatarUrl', 'profile_image', u.nationalId || u.id));
    this.preRegistrations.forEach((pr) => processImageField(pr, 'avatarUrl', 'profile_image', pr.nationalId || pr.id));
    this.products.forEach((p) => processImageField(p, 'imageUrl', 'product_image', p.id));
    this.transactions.forEach((t) => processImageField(t, 'receiptUrl', 'receipt', t.id));
    this.insuranceRequests.forEach((ins) => {
      processImageField(ins, 'insuranceCardUrl', 'document', ins.id);
      processImageField(ins, 'receiptUrl', 'receipt', ins.id);
    });
    this.announcements.forEach((a) => processImageField(a, 'imageUrl', 'club', a.id));
    if (this.clubSettings && this.clubSettings.logoUrl) {
      processImageField(this.clubSettings, 'logoUrl', 'club', 'logo');
    }
  }

  private getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('club_app_token') : null;
    const headers: Record<string, string> = { ...extra };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private saveAll() {
    this.sanitizeAndOptimizeStorage();

    // Direct database sync - no localStorage persistence for database tables
    this.syncWithBackendMySql();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dbStoreUpdated'));
    }
  }

  public async syncWithBackendMySql(): Promise<void> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    return new Promise<void>((resolve) => {
      this.syncTimeout = setTimeout(async () => {
        try {
          const token = sessionStorage.getItem('club_app_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const res = await fetch('/api/mysql/sync', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              roles: this.roles,
              users: this.users,
              links: this.links,
              preRegistrations: this.preRegistrations,
              auditLogs: this.auditLogs,
              clubSettings: this.clubSettings,
              announcements: this.announcements,
              sessions: this.sessions,
              enrollments: this.enrollments,
              transactions: this.transactions,
              attendanceRecords: this.attendanceRecords,
              debtors: this.debtors,
              creditors: this.creditors,
              insuranceRequests: this.insuranceRequests,
              supportTickets: this.supportTickets,
              notifications: this.notifications,
              products: this.products,
              shopInvoices: this.shopInvoices,
              smsLogs: this.smsLogs,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            this.setDbConnected(json.dbConnected === true);
            if (json.success === true && json.dbConnected === true) {
              // Server committed the batch — clear locally-pending mutations
              this.clearPendingMutations();
            }
          } else if (res.status === 401 || res.status === 403) {
            // Auth problem, NOT a database problem. The MySQL connection is
            // healthy — the user's JWT simply expired (or the server restarted
            // with a new ephemeral secret). Marking the DB "disconnected" here
            // turned the header indicator yellow on every delete/edit and
            // misled users into thinking data was not being saved.
            console.warn('[dbStore] Sync skipped: session expired — please log in again.');
            try {
              window.dispatchEvent(new CustomEvent('dbStoreAuthExpired'));
            } catch {}
          } else {
            this.setDbConnected(false);
          }
        } catch {
          this.setDbConnected(false);
        } finally {
          resolve();
        }
      }, 100);
    });
  }

  private isLoadingBackendData = false;

  /**
   * Pending local mutations that have not yet been confirmed by the server.
   * Prevents the background refresh (5s poll / focus / full-data reload) from
   * overwriting optimistic UI changes before the backend has persisted them.
   * Key: `${entity}|${id}` → { kind: 'upsert' | 'delete', item }
   */
  private pendingLocalMutations: Map<string, { kind: 'upsert' | 'delete'; item: any }> = new Map();

  private markPendingUpsert(entity: string, item: any) {
    if (!item || !item.id) return;
    this.pendingLocalMutations.set(`${entity}|${item.id}`, { kind: 'upsert', item });
  }

  private markPendingDelete(entity: string, id: string) {
    if (!id) return;
    this.pendingLocalMutations.set(`${entity}|${id}`, { kind: 'delete', item: null });
  }

  private mergePendingLocal(entity: string, serverItems: any[]): any[] {
    const merged = [...serverItems];
    this.pendingLocalMutations.forEach((m, key) => {
      const sep = key.indexOf('|');
      if (sep === -1) return;
      const ent = key.substring(0, sep);
      const id = key.substring(sep + 1);
      if (ent !== entity || !id) return;
      if (m.kind === 'delete') {
        const idx = merged.findIndex((i) => i && i.id === id);
        if (idx >= 0) merged.splice(idx, 1);
      } else {
        const idx = merged.findIndex((i) => i && i.id === id);
        if (idx >= 0) merged[idx] = m.item;
        else merged.unshift(m.item);
      }
    });
    return merged;
  }

  private clearPendingMutations() {
    this.pendingLocalMutations.clear();
  }

  /**
   * Guard against double-click / duplicate submit of financial actions.
   * Keyed by user; blocks rapid re-submission within a short window so a
   * fast double-click cannot create two identical payments.
   */
  private lastFinancialActionAt: Map<string, number> = new Map();

  private canSubmitFinancialAction(userKey: string): boolean {
    if (!userKey) return true;
    const now = Date.now();
    const last = this.lastFinancialActionAt.get(userKey) || 0;
    if (now - last < 1500) {
      console.warn('[dbStore] Blocked duplicate financial action for', userKey);
      return false;
    }
    this.lastFinancialActionAt.set(userKey, now);
    return true;
  }

  public async loadFromBackendMySql(): Promise<boolean> {
    if (this.isLoadingBackendData) {
      return this.dbConnected;
    }
    this.isLoadingBackendData = true;

    try {
      // Auto-retry (Phase 4): the very first request after a server cold-start
      // can race with schema self-healing / pool warm-up and fail. Retrying
      // silently prevents a false "server disconnected" state on first load.
      const MAX_ATTEMPTS = 5;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const ok = await this.attemptLoadFromBackendOnce();
        if (ok) return true;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      return false;
    } finally {
      this.isLoadingBackendData = false;
    }
  }

  // ------------------------------------------------------------------
  // OFFLINE MUTATION QUEUE (Phase 4)
  // When the server is unreachable, mutations are enqueued and automatically
  // replayed in order as soon as connectivity returns.
  // ------------------------------------------------------------------
  private offlineQueue: Array<{ method: 'POST' | 'PUT' | 'DELETE'; path: string; body?: any }> = [];
  private isFlushingQueue = false;

  /** Fire-and-forget mutation with automatic offline fallback. */
  private sendMutation(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: any, extraHeaders?: Record<string, string>): void {
    fetch(path, {
      method,
      headers: this.getAuthHeaders({
        ...(extraHeaders || {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      }),
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(async (res) => {
      if (res.status >= 500 || res.status === 401 || res.status === 403) {
        // 5xx = server trouble; 401/403 = auth problem (expired token / logged-out
        // tab). Both are RETRYABLE: keep the mutation queued so it replays after
        // connectivity or a fresh login. Previously 401/403 were silently
        // swallowed here — the UI showed success while the row survived in MySQL
        // and "resurrected" after the next page refresh (bug report: enrollment
        // delete doesn't stick).
        this.offlineQueue.push({ method, path, body });
        if (res.status === 401 || res.status === 403) {
          console.warn(`[dbStore] ${res.status} Unauthorized/Forbidden — mutation queued until re-login (${this.offlineQueue.length} pending):`, method, path);
          try {
            window.dispatchEvent(new CustomEvent('dbStoreMutationQueued', {
              detail: { status: res.status, method, path },
            }));
          } catch {}
        } else {
          console.warn(`[dbStore] Server ${res.status} — mutation queued (${this.offlineQueue.length} pending)`);
        }
      }
    }).catch(() => {
      this.offlineQueue.push({ method, path, body });
      console.warn(`[dbStore] Network down — mutation queued (${this.offlineQueue.length} pending)`);
    });
  }

  private async flushOfflineQueue(): Promise<void> {
    if (this.isFlushingQueue || this.offlineQueue.length === 0) return;
    this.isFlushingQueue = true;
    try {
      let guard = 500;
      while (this.offlineQueue.length > 0 && guard-- > 0) {
        const item = this.offlineQueue[0];
        let res: Response | null = null;
        try {
          res = await fetch(item.path, {
            method: item.method,
            headers: this.getAuthHeaders(item.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            body: item.body === undefined ? undefined : JSON.stringify(item.body),
          });
        } catch { break; } // still offline
        if (!res || res.status >= 500 || res.status === 401 || res.status === 403) break; // retry later (needs fresh login)
        this.offlineQueue.shift(); // delivered (2xx and other 4xx are both final)
      }
      if (this.offlineQueue.length === 0) {
        console.log('[dbStore] Offline queue fully flushed.');
      } else {
        console.warn(`[dbStore] Offline queue: ${this.offlineQueue.length} still pending.`);
      }
    } finally {
      this.isFlushingQueue = false;
    }
  }

  private async attemptLoadFromBackendOnce(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try { controller.abort(); } catch {}
      }, 15000);

      const token = sessionStorage.getItem('club_app_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let res = await fetch('/api/mysql/full-data', {
        signal: controller.signal,
        headers,
      }).finally(() => clearTimeout(timeoutId));

      if (res.status === 401) {
        sessionStorage.removeItem('club_app_token');
        res = await fetch('/api/mysql/full-data');
      }

      if (!res.ok) {
        // DB/network error ≠ empty database: keep current data, mark offline (Phase 4)
        this.setDbConnected(false);
        return false;
      }
      const json = await res.json();
      if (!json || !json.data) {
        this.setDbConnected(false);
        return false;
      }

      const d = json.data;
      const isDbConnected = json.dbConnected === true;
      this.setDbConnected(isDbConnected);

      if (!isDbConnected) {
        return false;
      }

      if (Array.isArray(d.roles) && d.roles.length > 0) {
        this.roles = d.roles.map((r: any) => ({
          ...r,
          key: r.key || r.key_name || (r.id ? r.id.replace('role-', '') : 'athlete'),
        }));
      }

      if (Array.isArray(d.users)) {
        this.users = this.mergePendingLocal(
          'users',
          d.users.map((u: any) => {
            let r = u.roles;
            if (typeof r === 'string') {
              try {
                r = JSON.parse(r);
                if (typeof r === 'string') r = JSON.parse(r);
              } catch {
                r = ['athlete'];
              }
            }
            return {
              ...u,
              roles: Array.isArray(r) ? r.filter(Boolean) : ['athlete'],
            };
          })
        );
      }

      if (Array.isArray(d.links)) this.links = this.mergePendingLocal('links', d.links);
      if (Array.isArray(d.preRegistrations)) this.preRegistrations = this.mergePendingLocal('preRegistrations', d.preRegistrations);
      if (Array.isArray(d.auditLogs)) this.auditLogs = d.auditLogs;
      if (d.clubSettings && Object.keys(d.clubSettings).length > 0) {
        this.clubSettings = { ...this.clubSettings, ...d.clubSettings };
        if (this.clubSettings.themePalette) {
          applyThemeToDocument(this.clubSettings.themePalette);
        }
      }
      if (Array.isArray(d.announcements)) this.announcements = d.announcements;
      if (Array.isArray(d.sessions)) this.sessions = this.mergePendingLocal('sessions', d.sessions);
      if (Array.isArray(d.enrollments)) this.enrollments = this.mergePendingLocal('enrollments', d.enrollments);
      if (Array.isArray(d.transactions)) this.transactions = this.mergePendingLocal('transactions', d.transactions);
      if (Array.isArray(d.attendanceRecords)) this.attendanceRecords = this.mergePendingLocal('attendanceRecords', d.attendanceRecords);
      if (Array.isArray(d.debtors)) this.debtors = this.mergePendingLocal('debtors', d.debtors);
      if (Array.isArray(d.creditors)) this.creditors = this.mergePendingLocal('creditors', d.creditors);
      if (Array.isArray(d.insuranceRequests)) this.insuranceRequests = this.mergePendingLocal('insuranceRequests', d.insuranceRequests);
      if (Array.isArray(d.supportTickets)) this.supportTickets = this.mergePendingLocal('supportTickets', d.supportTickets);
      if (Array.isArray(d.notifications)) this.notifications = this.mergePendingLocal('notifications', d.notifications);
      if (Array.isArray(d.products)) {
        this.products = this.mergePendingLocal('products', d.products);
      }

      // Fallback: ONLY fetch /api/products if products array is still empty after full-data
      if (!this.products || this.products.length === 0) {
        try {
          const prodApiRes = await fetch('/api/products');
          if (prodApiRes.ok) {
            const prodJson = await prodApiRes.json();
            if (prodJson.success && Array.isArray(prodJson.products) && prodJson.products.length > 0) {
              this.products = prodJson.products;
            }
          }
        } catch (pe) {
          // Silent fallback
        }
      }

      if (Array.isArray(d.shopInvoices)) {
        this.shopInvoices = this.mergePendingLocal(
          'shopInvoices',
          d.shopInvoices.map((inv: any) => {
            let parsedItems = inv.items;
            if (typeof parsedItems === 'string') {
              try {
                parsedItems = JSON.parse(parsedItems);
                if (typeof parsedItems === 'string') {
                  parsedItems = JSON.parse(parsedItems);
                }
              } catch {
                parsedItems = [];
              }
            }
            return {
              ...inv,
              items: Array.isArray(parsedItems) ? parsedItems : [],
            };
          })
        );
      }

      if (Array.isArray(d.smsLogs)) {
        this.smsLogs = d.smsLogs.map((sl: any) => ({
          ...sl,
          recipients: typeof sl.recipients === 'string' ? JSON.parse(sl.recipients) : (sl.recipients || []),
          recipientNames: typeof sl.recipientNames === 'string' ? JSON.parse(sl.recipientNames) : (sl.recipientNames || []),
          messageIds: typeof sl.messageIds === 'string' ? JSON.parse(sl.messageIds) : (sl.messageIds || []),
        }));
      }

      this.hasLoadedFromBackend = true;
      // Connectivity restored → replay everything queued while offline.
      void this.flushOfflineQueue();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dbStoreUpdated'));
      }
      return true;
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('[dbStore] Failed to load backend data:', err);
      }
      // Keep current in-memory data on error; only mark offline (Phase 4)
      this.setDbConnected(false);
      return false;
    }
  }

  // DATABASE BACKUP & RESTORE
  public exportFullBackupJSON() {
    return {
      version: '1.0.0',
      appName: 'باشگاه سنگ‌نوردی موج',
      exportedAt: new Date().toISOString(),
      exportedJalali: `${formatJalaliDate(getCurrentJalaliDate())} - ${new Date().toLocaleTimeString('fa-IR')}`,
      collectionsCount: 16,
      data: {
        users: this.users,
        roles: this.roles,
        links: this.links,
        auditLogs: this.auditLogs,
        preRegistrations: this.preRegistrations,
        clubSettings: this.clubSettings,
        announcements: this.announcements,
        sessions: this.sessions,
        enrollments: this.enrollments,
        transactions: this.transactions,
        attendanceRecords: this.attendanceRecords,
        debtors: this.debtors,
        creditors: this.creditors,
        insuranceRequests: this.insuranceRequests,
        supportTickets: this.supportTickets,
        notifications: this.notifications,
      },
    };
  }

  public async restoreFullBackupJSON(backupData: any, actorName: string = 'مدیر سیستم'): Promise<boolean> {
    try {
      const payload = backupData.data || backupData;
      if (Array.isArray(payload.users)) this.users = payload.users;
      if (Array.isArray(payload.roles)) this.roles = payload.roles;
      if (Array.isArray(payload.links)) this.links = payload.links;
      if (Array.isArray(payload.auditLogs)) this.auditLogs = payload.auditLogs;
      if (Array.isArray(payload.preRegistrations)) this.preRegistrations = payload.preRegistrations;
      if (payload.clubSettings) {
        this.clubSettings = payload.clubSettings;
        applyThemeToDocument(this.clubSettings.themePalette);
      }
      if (Array.isArray(payload.announcements)) this.announcements = payload.announcements;
      if (Array.isArray(payload.sessions)) this.sessions = payload.sessions;
      if (Array.isArray(payload.enrollments)) this.enrollments = payload.enrollments;
      if (Array.isArray(payload.transactions)) this.transactions = payload.transactions;
      if (Array.isArray(payload.attendanceRecords)) this.attendanceRecords = payload.attendanceRecords;
      if (Array.isArray(payload.debtors)) this.debtors = payload.debtors;
      if (Array.isArray(payload.creditors)) this.creditors = payload.creditors;
      if (Array.isArray(payload.insuranceRequests)) this.insuranceRequests = payload.insuranceRequests;
      if (Array.isArray(payload.supportTickets)) this.supportTickets = payload.supportTickets;
      if (Array.isArray(payload.notifications)) this.notifications = payload.notifications;

      this.addAuditLog('admin', actorName, 'بازیابی کامل دیتابیس', 'DatabaseBackup', 'all', 'بازیابی موفق تمام کالکشن‌ها و جدول‌های دیتابیس از فایل پشتیبان');
      await this.syncWithBackendMySql();
      return true;
    } catch (err) {
      console.error('[dbStore] restoreFullBackupJSON error:', err);
      return false;
    }
  }

  public exportFullBackupSQL(): string {
    const escapeVal = (val: any) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val.toString();
      if (typeof val === 'boolean') return val ? '1' : '0';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    };

    let sql = `-- ========================================================\n`;
    sql += `-- MOUJ CLIMBING CLUB DATABASE MYSQL DUMP (.SQL)\n`;
    sql += `-- Exported At: ${new Date().toISOString()}\n`;
    sql += `-- Jalali: ${formatJalaliDate(getCurrentJalaliDate())}\n`;
    sql += `-- ========================================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const tables = [
      { name: 'users', records: this.users },
      { name: 'club_settings', records: [this.clubSettings] },
      { name: 'courses', records: this.sessions },
      { name: 'enrollments', records: this.enrollments },
      { name: 'pre_registrations', records: this.preRegistrations },
      { name: 'financial_transactions', records: this.transactions },
      { name: 'attendance_records', records: this.attendanceRecords },
      { name: 'debtors', records: this.debtors },
      { name: 'creditors', records: this.creditors },
      { name: 'insurance_requests', records: this.insuranceRequests },
      { name: 'support_tickets', records: this.supportTickets },
      { name: 'announcements', records: this.announcements },
      { name: 'notifications', records: this.notifications },
      { name: 'audit_logs', records: this.auditLogs },
    ];

    for (const table of tables) {
      if (!table.records || table.records.length === 0) continue;
      sql += `-- Table: ${table.name}\n`;
      const sample = table.records[0];
      const cols = Object.keys(sample);
      const colsList = cols.map((c) => `\`${c}\``).join(', ');

      for (const record of table.records) {
        const vals = cols.map((c) => escapeVal((record as any)[c])).join(', ');
        sql += `INSERT INTO \`${table.name}\` (${colsList}) VALUES (${vals}) ON DUPLICATE KEY UPDATE \`${cols[0]}\`=\`${cols[0]}\`;\n`;
      }
      sql += `\n`;
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    return sql;
  }


  // CLUB SETTINGS
  public getClubSettings(): ClubSettings {
    return this.clubSettings;
  }

  public updateClubSettings(newSettings: Partial<ClubSettings>, actorName: string): ClubSettings {
    this.clubSettings = {
      ...this.clubSettings,
      ...newSettings,
      updatedAt: formatJalaliDate(getCurrentJalaliDate()),
    };
    if (newSettings.themePalette) {
      applyThemeToDocument(newSettings.themePalette);
    }
    this.saveAll();

    fetch('/api/mysql/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubSettings: this.clubSettings,
      }),
    }).catch((err) => console.warn('[dbStore] Direct settings sync error:', err));

    this.addAuditLog('admin', actorName, 'بروزرسانی برند و تنظیمات باشگاه', 'ClubSettings', 'main', `تغییر نام/لوگو/پالت رنگ به ${this.clubSettings.themePalette}`);
    return this.clubSettings;
  }

  // AUDIT LOGGING
  public addAuditLog(userId: string, userName: string, action: string, targetEntity: string, targetId?: string, details: string = '') {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      userName,
      action,
      targetEntity,
      targetId,
      details,
      timestamp: `${formatJalaliDate(getCurrentJalaliDate())} - ${new Date().toLocaleTimeString('fa-IR')}`,
    };
    this.auditLogs.unshift(newLog);
    this.saveAll();
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  // ROLES
  public getRoles(): Role[] {
    return this.roles.map((r: any) => ({
      ...r,
      key: r.key || r.key_name || (r.id ? r.id.replace('role-', '') : 'athlete'),
    }));
  }

  public updateRolePermissions(roleId: string, newPermissions: string[], actorName: string) {
    const index = this.roles.findIndex((r) => r.id === roleId);
    if (index !== -1) {
      this.roles[index].permissions = newPermissions;
      this.saveAll();
      this.addAuditLog('admin', actorName, 'ویرایش دسترسی‌های نقش', 'Role', roleId, `به روز رسانی دسترسی‌های ${this.roles[index].title}`);
    }
  }

  // USERS
  public getUsers(): User[] {
    return this.users;
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public updateUser(userId: string, updatedFields: Partial<User>, actorName: string = 'مدیر ارشد'): User | undefined {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      Object.assign(user, updatedFields, {
        updatedAt: formatJalaliDate(getCurrentJalaliDate()),
        updatedBy: actorName,
      });
      this.saveAll();
      this.addAuditLog('admin', actorName, 'ویرایش پرونده کاربر', 'User', userId, `بروزرسانی اطلاعات ${user.fullName}`);
      this.markPendingUpsert('users', user);
      
      // Direct REST API sync for instant single-record persistence (with Optimistic Locking)
      fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(user),
      }).then(async (res) => {
        if (res.ok) {
          const body = await res.json().catch(() => null);
          if (body?.user?.version) {
            user.version = body.user.version;
          }
        } else if (res.status === 409) {
          // Conflict: another client changed this record. Refresh authoritative data.
          this.loadFromBackendMySql();
        }
      }).catch((e) => console.warn('Direct user update API error:', e));

      return user;
    }
    return undefined;
  }

  public updateUserRoles(userId: string, newRoles: UserRoleKey[], actorName: string = 'مدیر ارشد'): User | undefined {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      const sanitizedRoles = Array.from(new Set(newRoles.filter(Boolean)));
      user.roles = sanitizedRoles.length > 0 ? sanitizedRoles : ['athlete'];
      if (!user.roles.includes(user.activeRole)) {
        user.activeRole = user.roles[0] || 'athlete';
      }
      user.updatedAt = new Date().toISOString();
      user.updatedBy = actorName;
      this.saveAll();
      this.addAuditLog('admin', actorName, 'تغییر نقش‌های کاربر', 'User', userId, `نقش‌های جدید: ${user.roles.join(', ')} برای ${user.fullName}`);

      // Direct REST API sync for instant single-record persistence
      fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(user),
      }).catch((e) => console.warn('Direct user roles update API error:', e));

      return user;
    }
    return undefined;
  }

  public async updateUserRolesAsync(userId: string, newRoles: UserRoleKey[], actorName: string = 'مدیر ارشد'): Promise<User | undefined> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      const sanitizedRoles = Array.from(new Set(newRoles.filter(Boolean)));
      user.roles = sanitizedRoles.length > 0 ? sanitizedRoles : ['athlete'];
      if (!user.roles.includes(user.activeRole)) {
        user.activeRole = user.roles[0] || 'athlete';
      }
      user.updatedAt = new Date().toISOString();
      user.updatedBy = actorName;
      this.saveAll();
      this.addAuditLog('admin', actorName, 'تغییر نقش‌های کاربر', 'User', userId, `نقش‌های جدید: ${user.roles.join(', ')} برای ${user.fullName}`);

      try {
        await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(user),
        });
      } catch (e) {
        console.warn('Direct user roles update API error:', e);
      }

      return user;
    }
    return undefined;
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, actorName: string): User {
    const newUser: User = {
      ...userData,
      password: userData.password || userData.nationalId,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: formatJalaliDate(getCurrentJalaliDate()),
      updatedAt: new Date().toISOString(),
      updatedBy: actorName,
    };
    this.users.push(newUser);
    this.saveAll();
    this.addAuditLog('admin', actorName, 'ثبت کاربر جدید', 'User', newUser.id, `ایجاد کاربر ${newUser.fullName} با نقش ${newUser.roles.join(',')}`);

    // Direct REST API sync for new user
    fetch('/api/users', {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(newUser),
    }).catch((e) => console.warn('Direct create user API error:', e));

    return newUser;
  }

  public resetUserPassword(userId: string, newPassword?: string, actorName: string = 'مدیر ارشد'): { success: boolean; user?: User; passwordUsed: string } {
    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, passwordUsed: '' };
    }
    const finalPass = (newPassword && newPassword.trim() !== '') ? newPassword.trim() : user.nationalId;
    user.password = finalPass;
    user.updatedAt = new Date().toISOString();
    user.updatedBy = actorName;
    this.saveAll();
    this.addAuditLog(
      'admin',
      actorName,
      'ریست رمز عبور کاربر',
      'User',
      userId,
      `ریست رمز عبور کاربر ${user.fullName} (${user.username}) به ${finalPass}`
    );

    // Direct REST API sync for instant password hashing and persistence on server
    fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(user),
    }).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body.user && body.user.password) {
          user.password = body.user.password;
        }
      }
    }).catch((e) => console.warn('Direct user password reset API error:', e));

    return { success: true, user, passwordUsed: finalPass };
  }

  // PARENT-ATHLETE LINKS
  public getParentAthleteLinks(): ParentAthleteLink[] {
    return this.links;
  }

  public getLinks(): ParentAthleteLink[] {
    return this.links;
  }

  public getChildrenForParent(parentId: string): User[] {
    const childIds = this.links.filter((l) => l.parentId === parentId).map((l) => l.athleteId);
    return this.users.filter((u) => childIds.includes(u.id));
  }

  public getLinkedAthletesForParent(parentId: string): (User & { relation?: string })[] {
    const linksForParent = this.links.filter((l) => l.parentId === parentId);
    const result: (User & { relation?: string })[] = [];
    for (const l of linksForParent) {
      const u = this.getUserById(l.athleteId);
      if (u) {
        const relationLabel = l.relationType === 'father' ? 'پدر' : l.relationType === 'mother' ? 'مادر' : 'سرپرست';
        result.push({ ...u, relation: relationLabel });
      }
    }
    return result;
  }

  public updateAvatarByNationalId(nationalId: string, avatarUrl: string): number {
    const cleanId = nationalId.trim().replace(/\D/g, '');
    if (!cleanId) return 0;
    let updatedCount = 0;

    // Update in users table
    this.users.forEach((u) => {
      if (u.nationalId === cleanId || u.username === cleanId) {
        u.avatarUrl = avatarUrl;
        updatedCount++;
      }
    });

    // Update in preRegistrations table
    this.preRegistrations.forEach((p) => {
      if (p.nationalId === cleanId) {
        p.avatarUrl = avatarUrl;
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      this.saveAll();
    }
    return updatedCount;
  }

  public getUserEnrollments(userId: string): SessionEnrollment[] {
    this.checkAndExpireEnrollments();
    const user = this.getUserById(userId);
    return this.enrollments.filter((e) => {
      if (e.userId === userId) return true;
      if (user?.nationalId && user.nationalId !== '0000000000' && e.athleteNationalId === user.nationalId) return true;
      if (user?.phone && e.athletePhone && e.athletePhone === user.phone) return true;
      return false;
    });
  }

  public getParentsForAthlete(athleteId: string): User[] {
    const parentIds = this.links.filter((l) => l.athleteId === athleteId).map((l) => l.parentId);
    return this.users.filter((u) => parentIds.includes(u.id));
  }

  public linkParentAndAthlete(parentId: string, athleteId: string, relationType: 'father' | 'mother' | 'guardian', actorName: string) {
    const exists = this.links.some((l) => l.parentId === parentId && l.athleteId === athleteId);
    if (!exists) {
      const newLink: ParentAthleteLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        parentId,
        athleteId,
        relationType,
        createdAt: formatJalaliDate(getCurrentJalaliDate()),
      };
      this.links.push(newLink);
      this.saveAll();
      const parentObj = this.getUserById(parentId);
      const childObj = this.getUserById(athleteId);
      this.addAuditLog('admin', actorName, 'ایجاد پیوند والد و فرزند', 'ParentLink', newLink.id, `اتصال ${parentObj?.fullName} به فرزند ${childObj?.fullName}`);
    }
  }

  public unlinkParentAndAthlete(parentId: string, athleteId: string, actorName: string) {
    const link = this.links.find((l) => l.parentId === parentId && l.athleteId === athleteId);
    this.links = this.links.filter((l) => !(l.parentId === parentId && l.athleteId === athleteId));
    this.saveAll();
    if (link) {
      this.markPendingDelete('links', link.id);
      fetch(`/api/club/links/${link.id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }).catch((e) => console.warn('unlink API error:', e));
    }
    this.addAuditLog('admin', actorName, 'حذف پیوند والد و فرزند', 'ParentLink', `${parentId}-${athleteId}`, 'قطع ارتباط والد و فرزند');
  }

  // PRE-REGISTRATION METHODS
  public getPreRegistrations(): PreRegistrationRequest[] {
    return this.preRegistrations;
  }

  public getPendingPreRegistrationsCount(): number {
    return this.preRegistrations.filter((p) => p.status === 'pending').length;
  }

  public submitPreRegistration(data: Omit<PreRegistrationRequest, 'id' | 'status' | 'createdAt'>): PreRegistrationRequest {
    const newReq: PreRegistrationRequest = {
      ...data,
      id: `prereg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: 'pending',
      createdAt: formatJalaliDate(getCurrentJalaliDate()),
    };
    this.preRegistrations.unshift(newReq);
    this.saveAll();
    this.addAuditLog('guest', data.fullName, 'ثبت پیش‌ثبت‌نام عمومی', 'PreRegistration', newReq.id, `درخواست جدید توسط ${data.fullName} با کد ملی ${data.nationalId}`);
    
    // Add real-time inbox notification for administrative team
    this.addNotification({
      title: 'درخواست پیش‌ثبت‌نام جدید',
      message: `متقاضی ${newReq.fullName} با شماره همراه ${newReq.phone} یک درخواست پیش‌ثبت‌نام جدید ارسال کرده است.`,
      category: 'general',
      targetAudience: 'admin',
      actionLink: 'prereg-admin',
    });

    return newReq;
  }

  public updatePreRegistration(id: string, updatedData: Partial<PreRegistrationRequest>, actorName: string) {
    const index = this.preRegistrations.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.preRegistrations[index] = { ...this.preRegistrations[index], ...updatedData };
      this.saveAll();
      this.addAuditLog('admin', actorName, 'ویرایش اطلاعات پیش‌ثبت‌نام', 'PreRegistration', id, 'ویرایش پرونده پیش از تأیید');
    }
  }

  public approvePreRegistration(id: string, assignedRoles: UserRoleKey[], actorName: string): { user: User; tempPassword: string; parentCreated?: boolean } {
    const req = this.preRegistrations.find((p) => p.id === id);
    if (!req) throw new Error('درخواست یافت نشد');

    // 1. Check if user already exists
    let existingUser = this.users.find((u) => u.nationalId === req.nationalId);
    let userId = existingUser?.id;

    const tempPassword = req.nationalId; // Temporary password = National ID

    if (!existingUser) {
      // Create new user (Username = National ID)
      const newUser = this.createUser(
        {
          username: req.nationalId,
          firstName: req.firstName,
          lastName: req.lastName,
          fullName: req.fullName || `${req.firstName || ''} ${req.lastName || ''}`.trim(),
          fatherName: req.fatherName,
          shenasnamehNo: req.shenasnamehNo,
          nationalId: req.nationalId,
          birthDate: req.birthDate,
          gender: req.gender,
          phone: req.phone,
          emergencyContactName: req.emergencyContactName,
          emergencyContactRelation: req.emergencyContactRelation,
          emergencyContactPhone: req.emergencyContactPhone,
          bloodType: req.bloodType,
          shoeSize: req.shoeSize,
          clothingSize: req.clothingSize,
          address: req.address,
          medicalConditions: req.medicalConditions,
          referrerName: req.referrerName,
          referrerPhone: req.referrerPhone,
          educationOrJob: req.educationOrJob,
          climbingExperienceLevel: req.climbingExperienceLevel,
          insuranceNumber: req.insuranceNumber,
          avatarUrl: req.avatarUrl,
          roles: assignedRoles.length > 0 ? assignedRoles : ['athlete'],
          activeRole: assignedRoles[0] || 'athlete',
          isActive: true,
        },
        actorName
      );
      userId = newUser.id;
      existingUser = newUser;
    } else {
      // Update existing roles
      this.updateUserRoles(existingUser.id, assignedRoles, actorName);
    }

    // 2. Handle Parent creation/linking if under 18 and parent info provided
    let parentCreated = false;
    if (req.isUnder18 && req.parentNationalId && req.parentFullName) {
      let parentUser = this.users.find((u) => u.nationalId === req.parentNationalId);
      if (!parentUser) {
        parentUser = this.createUser(
          {
            username: req.parentNationalId,
            fullName: req.parentFullName,
            nationalId: req.parentNationalId,
            phone: req.parentPhone || req.phone,
            roles: ['parent'],
            activeRole: 'parent',
            isActive: true,
          },
          actorName
        );
        parentCreated = true;
      }
      this.linkParentAndAthlete(parentUser.id, userId!, 'father', actorName);
    }

    // 3. Mark pre-registration as approved
    req.status = 'approved';
    req.assignedRoles = assignedRoles;
    req.createdUserId = userId;
    req.reviewedAt = formatJalaliDate(getCurrentJalaliDate());
    req.reviewedBy = actorName;
    this.saveAll();

    this.addAuditLog('admin', actorName, 'تأیید پیش‌ثبت‌نام', 'PreRegistration', id, `تأیید عضویت ${req.fullName} و ساخت اکانت با نام کاربری ${req.nationalId}`);

    return { user: existingUser, tempPassword, parentCreated };
  }

  public rejectPreRegistration(id: string, reason: string, actorName: string) {
    const req = this.preRegistrations.find((p) => p.id === id);
    if (!req) return;

    req.status = 'rejected';
    req.rejectionReason = reason;
    req.reviewedAt = formatJalaliDate(getCurrentJalaliDate());
    req.reviewedBy = actorName;
    this.saveAll();

    this.addAuditLog('admin', actorName, 'رد پیش‌ثبت‌نام', 'PreRegistration', id, `رد درخواست ${req.fullName} به دلیل: ${reason}`);
  }

  public resetAllPreRegistrationsToPending(actorName: string = 'مدیر ارشد'): number {
    let count = 0;
    this.preRegistrations.forEach((req) => {
      req.status = 'pending';
      req.rejectionReason = undefined;
      count++;
    });
    this.saveAll();
    this.addAuditLog('admin', actorName, 'تغییر وضعیت تمام پیش‌ثبت‌نام‌ها به در انتظار بررسی', 'PreRegistration', 'all', `بازنشانی وضعیت ${count} درخواست به pending جهت بررسی و تأیید مجدد`);
    return count;
  }

  // PHASE 2: SESSIONS & TRAINING COURSES
  public getSessions(): TrainingSession[] {
    return this.sessions;
  }

  public addSession(data: Omit<TrainingSession, 'id' | 'createdAt'>, actorName: string): TrainingSession {
    const newSession: TrainingSession = {
      ...data,
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: formatJalaliDate(getCurrentJalaliDate()),
    };
    this.sessions.unshift(newSession);
    this.saveAll();
    this.addAuditLog('admin', actorName, 'ایجاد سانس جدید', 'TrainingSession', newSession.id, `ایجاد سانس ${newSession.title} با ظرفیت ${newSession.capacity} نفر`);
    return newSession;
  }

  public updateSession(id: string, updates: Partial<TrainingSession>, actorName: string): TrainingSession | undefined {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.sessions[idx] = { ...this.sessions[idx], ...updates };
      this.saveAll();
      this.addAuditLog('admin', actorName, 'ویرایش سانس', 'TrainingSession', id, `تغییر اطلاعات سانس ${this.sessions[idx].title}`);
      return this.sessions[idx];
    }
    return undefined;
  }

  public deleteSession(id: string, actorName: string) {
    const sess = this.sessions.find((s) => s.id === id);
    this.sessions = this.sessions.filter((s) => s.id !== id);
    // Cascading deletion according to database relational standards
    this.enrollments = this.enrollments.filter((e) => e.sessionId !== id);
    this.attendanceRecords = this.attendanceRecords.filter((a) => a.sessionId !== id);
    this.saveAll();
    this.addAuditLog('admin', actorName, 'حذف سانس و پاکسازی سوابق', 'TrainingSession', id, `حذف سانس ${sess?.title || id} همراه با پاکسازی سوابق ثبت‌نام و حضورغیاب (Cascading Delete)`);
    
    // Direct REST API deletion from MySQL
    fetch(`/api/courses/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    }).catch((e) => console.warn('Direct session delete API error:', e));
  }

  // PHASE 2: ENROLLMENTS
  public getUsedSessionsForEnrollment(e: SessionEnrollment): number {
    return this.attendanceRecords.filter((a) => 
      a.userId === e.userId && 
      a.sessionId === e.sessionId && 
      (a.status === 'present' || a.status === 'club_closed') &&
      a.date >= e.enrolledAt &&
      (e.expireDate ? a.date <= e.expireDate : true)
    ).length;
  }

  public checkAndExpireEnrollments(): boolean {
    const todayJalali = formatJalaliDate(getCurrentJalaliDate());
    let changed = false;
    this.enrollments.forEach((e) => {
      // Set default subscription total sessions if undefined
      if (e.totalSessionsAllowed === undefined) {
        e.totalSessionsAllowed = 12;
      }

      // Calculate dynamic used sessions count
      const used = this.getUsedSessionsForEnrollment(e);
      if (e.usedSessionsCount !== used) {
        e.usedSessionsCount = used;
        changed = true;
      }

      const totalAllowed = e.totalSessionsAllowed;

      if (e.status === 'active') {
        let shouldExpire = false;
        let reason = '';
        
        if (e.expireDate && todayJalali > e.expireDate) {
          shouldExpire = true;
          reason = `پایان مهلت اعتبار زمانی (${e.expireDate})`;
        } else if (used >= totalAllowed) {
          shouldExpire = true;
          reason = `مصرف تمام جلسات مجاز اشتراک (${used} از ${totalAllowed} جلسه)`;
        }

        if (shouldExpire) {
          e.status = 'expired';
          changed = true;
          
          this.addAuditLog('system', 'سیستم خودکار', 'انقضای خودکار دوره', 'Enrollment', e.id, `انقضای خودکار ثبت‌نام ${e.athleteName} به علت ${reason}`);
          
          const session = this.sessions.find(s => s.id === e.sessionId);
          const sessionTitle = session?.title || 'دوره ورزشی';

          // 1. Send private notification ONLY to the specific athlete
          const targetAthleteId = e.userId;
          if (targetAthleteId) {
            const alreadyNotifiedAthlete = this.notifications.some(
              n => n.userId === targetAthleteId && n.category === 'course' && n.title.includes('پایان اعتبار') && n.message.includes(sessionTitle)
            );
            if (!alreadyNotifiedAthlete) {
              this.addNotification({
                userId: targetAthleteId,
                targetAudience: 'individual',
                title: 'پایان مهلت اعتبار اشتراک دوره',
                message: `ورزشکار گرامی، مهلت اعتبار اشتراک شما در سانس "${sessionTitle}" به علت ${reason} به پایان رسید. لطفاً جهت تمدید اشتراک اقدام نمایید.`,
                category: 'course',
                actionLink: 'user-portal',
              });
            }
          }

          // 2. Send management alert ONLY to admins & staff (NEVER 'all')
          const alreadyNotifiedStaff = this.notifications.some(
            n => n.targetAudience === 'admin' && n.category === 'course' && n.title.includes('انقضای اشتراک') && n.message.includes(e.athleteName) && n.message.includes(reason)
          );
          if (!alreadyNotifiedStaff) {
            this.addNotification({
              title: 'انقضای اشتراک ورزشکار',
              message: `اشتراک ورزشکار ${e.athleteName} در سانس "${sessionTitle}" به علت ${reason} منقضی شد.`,
              category: 'course',
              targetAudience: 'admin',
              actionLink: 'phase2-sessions',
            });
          }
        }
      }
    });

    if (changed) {
      this.saveAll();
    }
    return changed;
  }

  public getEnrollments(): SessionEnrollment[] {
    this.checkAndExpireEnrollments();
    return this.enrollments;
  }

  public getEnrollmentsForSession(sessionId: string, targetDate?: string): SessionEnrollment[] {
    this.checkAndExpireEnrollments();
    let list = this.enrollments.filter((e) => e.sessionId === sessionId);
    if (targetDate) {
      list = list.filter((e) => {
        const start = e.startDate || e.enrolledAt;
        const end = e.endDate || e.expireDate;
        const isEnrolledOnDate = start <= targetDate && (!end || targetDate <= end);
        const hasAttendance = this.attendanceRecords.some(
          (a) => a.sessionId === sessionId && a.userId === e.userId && a.date === targetDate
        );
        return isEnrolledOnDate || hasAttendance;
      });
    } else {
      list = list.filter((e) => e.status === 'active');
    }
    return list;
  }

  public enrollAthlete(
    sessionId: string,
    userId: string,
    actorName: string,
    paymentMethod: 'pos' | 'card_to_card' | 'cash' | 'online' = 'pos',
    paymentDetails?: {
      trackingNumber?: string;
      receiptUrl?: string;
      receiptFileName?: string;
      isAlreadyPaid?: boolean;
      startDate?: string;
      endDate?: string;
      totalSessionsAllowed?: number;
    }
  ): SessionEnrollment | { error: string } {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return { error: 'سانس مورد نظر یافت نشد.' };

    const user = this.getUserById(userId);
    if (!user) return { error: 'کاربر مورد نظر یافت نشد.' };

    // Check capacity
    const activeEnrollmentsCount = this.enrollments.filter((e) => e.sessionId === sessionId && e.status === 'active').length;
    if (activeEnrollmentsCount >= session.capacity) {
      return { error: 'ظرفیت این سانس تکمیل شده است.' };
    }

    // Check duplicate active enrollment
    const existingActive = this.enrollments.find((e) => e.sessionId === sessionId && e.userId === userId && e.status === 'active');
    if (existingActive) {
      return { error: 'این ورزشکار در حال حاضر در این سانس ثبت‌نام فعال دارد.' };
    }

    const todayJalali = formatJalaliDate(getCurrentJalaliDate());
    const isConfirmedPaid = paymentDetails?.isAlreadyPaid ?? false;
    const initialPaymentStatus = isConfirmedPaid ? 'paid' : 'pending';

    const customStart = (paymentDetails?.startDate && paymentDetails.startDate.trim() !== '') ? paymentDetails.startDate.trim() : todayJalali;
    const calculatedExpire = addMonthsToJalali(customStart, 1);
    const customEnd = (paymentDetails?.endDate && paymentDetails.endDate.trim() !== '')
      ? paymentDetails.endDate.trim()
      : ((session.endDate && session.endDate < calculatedExpire) ? session.endDate : calculatedExpire);

    const finalSessionsLimit = (paymentDetails?.totalSessionsAllowed && paymentDetails.totalSessionsAllowed > 0)
      ? paymentDetails.totalSessionsAllowed
      : (session.sessionsLimit || 12);

    const priceAtEnrollment = session.monthlyFee; // Lock fee at moment of enrollment

    const newEnrollment: SessionEnrollment = {
      id: `enr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sessionId,
      userId,
      athleteName: user.fullName,
      athletePhone: user.phone,
      athleteNationalId: user.nationalId,
      status: 'active',
      paymentStatus: initialPaymentStatus,
      trackingNumber: paymentDetails?.trackingNumber,
      receiptUrl: paymentDetails?.receiptUrl,
      receiptFileName: paymentDetails?.receiptFileName,
      paymentMethod,
      enrolledAt: customStart,
      expireDate: customEnd,
      startDate: customStart,
      endDate: customEnd,
      totalSessionsAllowed: finalSessionsLimit,
      usedSessionsCount: 0,
      priceAtEnrollment,
    };

    this.enrollments.unshift(newEnrollment);

    // If payment details or already paid, create transaction
    let newTrx: FinancialTransaction | null = null;
    if (isConfirmedPaid || paymentDetails?.receiptUrl || paymentDetails?.trackingNumber) {
      newTrx = {
        id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        userId: user.id,
        userName: user.fullName,
        userNationalId: user.nationalId,
        amount: priceAtEnrollment,
        type: 'tuition',
        method: paymentMethod,
        trackingNumber: paymentDetails?.trackingNumber,
        receiptUrl: paymentDetails?.receiptUrl,
        receiptFileName: paymentDetails?.receiptFileName,
        description: `شهریه ثبت‌نام دوره ${session.title}`,
        status: isConfirmedPaid ? 'completed' : 'pending',
        createdAt: customStart,
        createdBy: actorName,
      };
      this.transactions.unshift(newTrx);
    }

    // If unpaid/pending, add a debtor record with locked price so it shows up in debt tracking
    if (!isConfirmedPaid) {
      this.debtors.unshift({
        id: `debt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        userId: user.id,
        fullName: user.fullName,
        nationalId: user.nationalId,
        phone: user.phone,
        category: 'tuition',
        categoryTitle: `شهریه ${session.title}`,
        amount: priceAtEnrollment,
        dueDate: customStart,
        status: (paymentDetails?.receiptUrl || paymentDetails?.trackingNumber) ? 'pending_approval' : 'due_soon',
        notes: newTrx ? `کد تراکنش مالی: ${newTrx.id}` : `ثبت‌نام در سانس ${session.title}`,
      });
    }

    this.saveAll();
    this.markPendingUpsert('enrollments', newEnrollment);
    if (newTrx) this.markPendingUpsert('transactions', newTrx);

    // Direct REST persistence with offline-queue fallback.
    // Server re-validates capacity & duplicates atomically (FOR UPDATE).
    this.sendMutation('POST', '/api/courses/enrollments', {
      id: newEnrollment.id,
      sessionId,
      userId,
      paymentMethod,
    });

    this.addAuditLog('secretary', actorName, 'ثبت‌نام ورزشکار در سانس', 'Enrollment', newEnrollment.id, `ثبت‌نام ${user.fullName} در ${session.title} (تاریخ شروع: ${customStart}، تاریخ پایان: ${customEnd})`);

    // Add real-time inbox notification for administrative team
    this.addNotification({
      title: 'ثبت‌نام جدید در سانس',
      message: `ورزشکار ${user.fullName} در سانس "${session.title}" با بازه زمانی ${customStart} تا ${customEnd} ثبت‌نام شد.`,
      category: 'course',
      targetAudience: 'admin',
      actionLink: 'phase2-sessions',
    });

    // Add personal notification to the enrolled athlete
    this.addNotification({
      userId: user.id,
      targetAudience: 'individual',
      title: 'ثبت‌نام موفق در سانس ورزشی',
      message: `ثبت‌نام شما در سانس "${session.title}" از تاریخ ${customStart} تا ${customEnd} با موفقیت انجام شد.`,
      category: 'course',
      actionLink: 'user-portal',
    });

    return newEnrollment;
  }

  public updateEnrollment(
    enrollmentId: string,
    updates: {
      startDate?: string;
      endDate?: string;
      enrolledAt?: string;
      expireDate?: string;
      totalSessionsAllowed?: number;
      status?: 'active' | 'expired' | 'canceled';
      paymentStatus?: 'paid' | 'pending' | 'partially_paid';
    },
    actorName: string = 'مدیر سیستم'
  ): SessionEnrollment | undefined {
    const enr = this.enrollments.find((e) => e.id === enrollmentId);
    if (!enr) return undefined;

    const oldStart = enr.startDate || enr.enrolledAt;
    const oldEnd = enr.endDate || enr.expireDate;

    if (updates.startDate) {
      enr.startDate = updates.startDate.trim();
      enr.enrolledAt = updates.startDate.trim();
    } else if (updates.enrolledAt) {
      enr.startDate = updates.enrolledAt.trim();
      enr.enrolledAt = updates.enrolledAt.trim();
    }

    if (updates.endDate) {
      enr.endDate = updates.endDate.trim();
      enr.expireDate = updates.endDate.trim();
    } else if (updates.expireDate) {
      enr.endDate = updates.expireDate.trim();
      enr.expireDate = updates.expireDate.trim();
    }

    if (updates.totalSessionsAllowed !== undefined && updates.totalSessionsAllowed > 0) {
      enr.totalSessionsAllowed = updates.totalSessionsAllowed;
    }

    if (updates.status) {
      enr.status = updates.status;
    } else {
      // Auto-reactivate if end date is extended beyond today and sessions remain
      const todayJalali = formatJalaliDate(getCurrentJalaliDate());
      if ((enr.endDate || enr.expireDate) >= todayJalali && enr.status === 'expired') {
        const used = this.getUsedSessionsForEnrollment(enr);
        if (used < (enr.totalSessionsAllowed || 12)) {
          enr.status = 'active';
        }
      }
    }

    if (updates.paymentStatus) {
      enr.paymentStatus = updates.paymentStatus;
    }

    // Recalculate used sessions count
    enr.usedSessionsCount = this.getUsedSessionsForEnrollment(enr);

    this.saveAll();
    this.addAuditLog(
      'admin',
      actorName,
      'ویرایش تاریخ و دوره ثبت‌نام ورزشکار',
      'Enrollment',
      enrollmentId,
      `ویرایش دوره ${enr.athleteName}: شروع (${oldStart} -> ${enr.startDate || enr.enrolledAt})، پایان (${oldEnd} -> ${enr.endDate || enr.expireDate})، سقف جلسات: ${enr.totalSessionsAllowed}`
    );

    return enr;
  }

  public cancelEnrollment(enrollmentId: string, actorName: string) {
    const enr = this.enrollments.find((e) => e.id === enrollmentId);
    if (enr) {
      enr.status = 'canceled';
      
      // Cascade clear matching unpaid/pending debtor records and transactions for this enrollment
      const session = this.sessions.find((s) => s.id === enr.sessionId);
      if (session) {
        this.debtors = this.debtors.filter(
          (d) => !(d.userId === enr.userId && d.category === 'tuition' && (d.categoryTitle || '').includes(session.title || ''))
        );
        this.transactions = this.transactions.filter(
          (t) => !(t.userId === enr.userId && t.type === 'tuition' && (t.description || '').includes(session.title || ''))
        );
      }

      this.saveAll();
      this.markPendingUpsert('enrollments', enr);

      // Direct REST soft-cancel with offline fallback
      this.sendMutation('DELETE', `/api/courses/enrollments/${enrollmentId}`);

      this.addAuditLog('secretary', actorName, 'لغو ثبت‌نام سانس', 'Enrollment', enrollmentId, `لغو ثبت‌نام ${enr.athleteName} و پاکسازی خودکار بدهی‌ها و تراکنش‌های مالی معلق مربوطه`);
    }
  }

  public async deleteEnrollment(
    enrollmentId: string,
    actorName: string
  ): Promise<{ ok: boolean; queued?: boolean; error?: string }> {
    const enr = this.enrollments.find((e) => e.id === enrollmentId);
    if (!enr) return { ok: false, error: 'این ثبت‌نام یافت نشد (احتمالاً قبلاً حذف شده است).' };

    // Collect related attendance ids BEFORE removal (for anti-resurrect merge)
    const removedAttendanceIds = this.attendanceRecords
      .filter((a) => a.userId === enr.userId && a.sessionId === enr.sessionId)
      .map((a) => a.id);

    // Cascade clear matching unpaid/pending debtor records and transactions
    const session = this.sessions.find((s) => s.id === enr.sessionId);
    const removedTxIds = new Set<string>();
    if (session) {
      this.debtors.forEach((d) => {
        if (d.userId === enr.userId && d.category === 'tuition' && (d.categoryTitle || '').includes(session.title || '')) {
          removedTxIds.add(d.id);
        }
      });
      this.transactions.forEach((t) => {
        if (t.userId === enr.userId && t.type === 'tuition' && (t.description || '').includes(session.title || '')) {
          removedTxIds.add(t.id);
        }
      });
    }

    // ── API-FIRST: the server is the single source of truth. Local state is
    // only mutated AFTER the backend confirms the hard delete. On definitive
    // rejection (400/404/409…) NOTHING changes locally and the caller shows
    // the error. On retryable failures (offline / 5xx / 401 / 403) the delete
    // is queued for automatic replay and applied optimistically.
    const deletePath = `/api/courses/enrollments/${enrollmentId}?mode=hard`;
    let res: Response | null = null;
    try {
      res = await fetch(deletePath, { method: 'DELETE', headers: this.getAuthHeaders() });
    } catch {
      res = null; // network down
    }

    if (!res || res.status >= 500 || res.status === 401 || res.status === 403) {
      this.offlineQueue.push({ method: 'DELETE', path: deletePath });
      console.warn(`[dbStore] Delete deferred (${res ? res.status : 'network'}) — queued (${this.offlineQueue.length} pending)`);
      if (res && (res.status === 401 || res.status === 403)) {
        try {
          window.dispatchEvent(new CustomEvent('dbStoreMutationQueued', {
            detail: { status: res.status, method: 'DELETE', path: deletePath },
          }));
        } catch {}
      }
      this.applyLocalEnrollmentDelete(enrollmentId, enr, removedAttendanceIds, removedTxIds, actorName);
      return { ok: true, queued: true };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, error: body?.error || `حذف در سرور ناموفق بود (کد ${res.status}).` };
    }

    this.applyLocalEnrollmentDelete(enrollmentId, enr, removedAttendanceIds, removedTxIds, actorName);
    return { ok: true };
  }

  /** Applies the already-server-confirmed deletion to local state (cascade). */
  private applyLocalEnrollmentDelete(
    enrollmentId: string,
    enr: SessionEnrollment,
    removedAttendanceIds: string[],
    removedTxIds: Set<string>,
    actorName: string
  ): void {
    const session = this.sessions.find((s) => s.id === enr.sessionId);
    if (session) {
      this.debtors = this.debtors.filter(
        (d) => !(d.userId === enr.userId && d.category === 'tuition' && (d.categoryTitle || '').includes(session.title || ''))
      );
      this.transactions = this.transactions.filter((t) => !removedTxIds.has(t.id));
    }

    // Remove the enrollment record completely
    this.enrollments = this.enrollments.filter((e) => e.id !== enrollmentId);

    this.saveAll();

    // Anti-resurrect guards: the 5s poll must not bring these rows back
    // before the server confirms deletion.
    this.markPendingDelete('enrollments', enrollmentId);
    removedAttendanceIds.forEach((id) => this.markPendingDelete('attendanceRecords', id));
    removedTxIds.forEach((id) => this.markPendingDelete('transactions', id));

    this.addAuditLog('admin', actorName, 'حذف کامل ثبت‌نام', 'Enrollment', enrollmentId, `حذف ثبت‌نام ${enr.athleteName} همراه سوابق حضور و اقساط مرتبط`);
  }

  // PHASE 2: FINANCIAL TRANSACTIONS
  public getTransactions(): FinancialTransaction[] {
    // Sanitize shop invoice transaction descriptions to concise format
    this.transactions.forEach((tx) => {
      if (!tx.description) return;
      const invNumMatch = tx.description.match(/INV-(\d+)/i) || tx.description.match(/(?:فاکتور\s*)(?:شماره\s*)?(\d+)/i);
      if (invNumMatch) {
        const invNum = invNumMatch[1];
        if (tx.description.includes('تسویه')) {
          tx.description = `بابت تسویه فاکتور ${invNum}`;
        } else if (tx.description.includes('فاکتور')) {
          tx.description = `بابت فاکتور ${invNum}`;
        }
      }
    });
    // Soft-voided (cancelled) transactions are excluded from the default
    // ledger — they remain archived in DB and via getVoidedTransactions().
    // Sort descending by creation timestamp extracted from ID
    return [...this.transactions]
      .filter((t) => (t as any).status !== 'cancelled')
      .sort((a, b) => {
        const tsA = parseInt((a.id.match(/\d{13}/) || ['0'])[0], 10);
        const tsB = parseInt((b.id.match(/\d{13}/) || ['0'])[0], 10);
        return tsB - tsA;
      });
  }

  /** Archive view: only the soft-voided financial records. */
  public getVoidedTransactions(): FinancialTransaction[] {
    return this.transactions.filter((t) => (t as any).status === 'cancelled');
  }

  public addTransaction(data: Omit<FinancialTransaction, 'id' | 'createdAt'> & { createdAt?: string }, actorName: string): FinancialTransaction {
    const userKey = data.userId || data.userName || actorName || 'unknown';
    if (!this.canSubmitFinancialAction(userKey)) {
      const existing = this.transactions.find((t) => t.userId === userKey);
      if (existing) return existing;
      throw new Error('عملیات مالی تکراری ثبت نشد؛ کمی صبر کنید و دوباره تلاش کنید.');
    }

    const newTrx: FinancialTransaction = {
      ...data,
      id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: data.createdAt || formatJalaliDate(getCurrentJalaliDate()),
      createdBy: actorName,
    };
    this.transactions.unshift(newTrx);
    this.markPendingUpsert('transactions', newTrx);

    // Sync enrollment status if this transaction is completed tuition payment
    if (newTrx.type === 'tuition' && newTrx.status === 'completed') {
      const enr = this.enrollments.find((e) => e.userId === newTrx.userId && e.status === 'active' && e.paymentStatus !== 'paid');
      if (enr) {
        enr.paymentStatus = 'paid';
        if (newTrx.trackingNumber) enr.trackingNumber = newTrx.trackingNumber;
        if (newTrx.receiptUrl) enr.receiptUrl = newTrx.receiptUrl;
      }
      this.debtors = this.debtors.filter((d) => d.userId !== newTrx.userId || !(d.categoryTitle || '').includes('شهریه'));
    }

    this.saveAll();
    this.markPendingUpsert('transactions', newTrx);

    // Direct REST persistence with Idempotency-Key + offline fallback.
    // The key = transaction id, so a retry can never create a duplicate row.
    this.sendMutation('POST', '/api/finance/transactions',
      { ...newTrx, idempotencyKey: newTrx.id });

    this.addAuditLog('accountant', actorName, 'ثبت تراکنش مالی', 'FinancialTransaction', newTrx.id, `ثبت مبلغ ${(newTrx.amount ?? 0).toLocaleString('fa-IR')} تومان برای ${newTrx.userName}`);
    return newTrx;
  }

  public updateTransactionStatus(id: string, status: 'completed' | 'pending' | 'rejected', actorName: string) {
    const trx = this.transactions.find((t) => t.id === id);
    // A voided transaction is frozen — its status can no longer change.
    if (trx && (trx as any).status !== 'cancelled') {
      trx.status = status;

      if (trx.type === 'tuition') {
        // Find matching enrollment
        const enr = this.enrollments.find((e) => e.userId === trx.userId && e.status === 'active');
        if (enr) {
          enr.paymentStatus = status === 'completed' ? 'paid' : 'pending';
          if (trx.trackingNumber) enr.trackingNumber = trx.trackingNumber;
          if (trx.receiptUrl) enr.receiptUrl = trx.receiptUrl;
        }

        // Clear matching debtor record when completed
        if (status === 'completed') {
          this.debtors = this.debtors.filter((d) => d.userId !== trx.userId || !d.notes?.includes(id));
        }
      }

      this.saveAll();
      this.addAuditLog('accountant', actorName, 'تغییر وضعیت تراکنش', 'FinancialTransaction', id, `تغییر وضعیت تراکنش ${trx.userName} به ${status === 'completed' ? 'تأییدشده' : status === 'pending' ? 'در انتظار' : 'ردشده'}`);

      // Send personal notification to user if approved or rejected
      if (trx.userId && (status === 'completed' || status === 'rejected')) {
        const isApproved = status === 'completed';
        this.addNotification({
          userId: trx.userId,
          targetAudience: 'individual',
          title: isApproved ? 'تأیید پرداخت و واریزی' : 'عدم تأیید تراکنش مالی',
          message: isApproved
            ? `پرداخت شما به مبلغ ${(trx.amount || 0).toLocaleString('fa-IR')} تومان بابت "${trx.description || 'شهریه'}" تأیید و تسویه شد.`
            : `تراکنش واریزی شما به مبلغ ${(trx.amount || 0).toLocaleString('fa-IR')} تومان مورد تأیید حسابداری قرار نگرفت.`,
          category: 'financial',
          actionLink: 'user-portal',
        });
      }
    }
  }

  public attachReceiptToTransaction(
    trxId: string,
    receiptUrl: string,
    receiptFileName?: string,
    trackingNumber?: string,
    actorName: string = 'ورزشکار / کاربر'
  ): FinancialTransaction | undefined {
    const trx = this.transactions.find((t) => t.id === trxId);
    if (trx) {
      trx.receiptUrl = receiptUrl;
      if (receiptFileName) trx.receiptFileName = receiptFileName;
      if (trackingNumber) trx.trackingNumber = trackingNumber;
      trx.status = 'pending'; // Set to pending for admin review

      // Also update matching active enrollment if tuition
      if (trx.type === 'tuition') {
        const enr = this.enrollments.find((e) => e.userId === trx.userId && e.status === 'active');
        if (enr) {
          enr.receiptUrl = receiptUrl;
          if (receiptFileName) enr.receiptFileName = receiptFileName;
          if (trackingNumber) enr.trackingNumber = trackingNumber;
          enr.paymentStatus = 'pending';
        }
      }

      this.saveAll();
      this.addAuditLog('athlete', actorName, 'پیوست فیش و سند پرداخت', 'FinancialTransaction', trxId, `پیوست فیش واریزی توسط ${trx.userName}`);

      // Add real-time inbox notification for administrative and accounting team
      this.addNotification({
        title: 'فیش واریزی جدید جهت تایید',
        message: `ورزشکار ${trx.userName} یک فیش واریزی جدید به مبلغ ${(trx.amount || 0).toLocaleString('fa-IR')} تومان بابت "${trx.description}" آپلود کرده است که منتظر تأیید حسابداری است.`,
        category: 'financial',
        targetAudience: 'admin',
        actionLink: 'phase2-finance',
      });

      return trx;
    }
    return undefined;
  }

  public updateTransaction(id: string, updates: Partial<FinancialTransaction>, actorName: string): FinancialTransaction | undefined {
    const idx = this.transactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const oldTrx = this.transactions[idx];
      this.transactions[idx] = { ...this.transactions[idx], ...updates };
      const newTrx = this.transactions[idx];

      if (newTrx.type === 'tuition') {
        const enr = this.enrollments.find((e) => e.userId === newTrx.userId && e.status === 'active');
        if (enr) {
          if (newTrx.status === 'completed') {
            enr.paymentStatus = 'paid';
          } else {
            enr.paymentStatus = 'pending';
          }
          if (newTrx.trackingNumber) enr.trackingNumber = newTrx.trackingNumber;
          if (newTrx.receiptUrl) enr.receiptUrl = newTrx.receiptUrl;
        }

        if (newTrx.status === 'completed') {
          this.debtors = this.debtors.filter((d) => d.userId !== newTrx.userId || !d.notes?.includes(id));
        }
      }

      this.saveAll();
      this.addAuditLog('accountant', actorName, 'ویرایش تراکنش مالی', 'FinancialTransaction', id, `اصلاح تراکنش ${newTrx.userName} مبلغ ${(newTrx.amount ?? 0).toLocaleString('fa-IR')} تومان`);
      return newTrx;
    }
    return undefined;
  }

  public deleteTransaction(id: string, actorName: string) {
    const trx = this.transactions.find((t) => t.id === id);
    // Financial soft-void: mark as cancelled instead of removing the record,
    // matching the server's soft-void behavior (audit trail preserved).
    if (trx) {
      (trx as any).status = 'cancelled';
      (trx as any).voidedAt = new Date().toISOString();
      (trx as any).voidedBy = actorName;
      (trx as any).voidReason = `باطل‌سازی توسط ${actorName}`;
    }
    this.saveAll();
    if (trx) this.markPendingUpsert('transactions', trx);
    else this.markPendingDelete('transactions', id);
    this.addAuditLog('accountant', actorName, 'ابطال تراکنش مالی', 'FinancialTransaction', id, `ابطال تراکنش ${trx?.userName || id} به مبلغ ${(trx?.amount ?? 0).toLocaleString('fa-IR')} تومان`);
    
    // Direct REST API soft-void from MySQL
    fetch(`/api/finance/transactions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ voidReason: trx ? (trx as any).voidReason : '' }),
    }).catch((e) => console.warn('Direct transaction void API error:', e));
  }

  // PHASE 2: ATTENDANCE
  public getAttendanceRecords(sessionId?: string, date?: string): AttendanceRecord[] {
    return this.attendanceRecords.filter((a) => {
      if (sessionId && a.sessionId !== sessionId) return false;
      if (date && a.date !== date) return false;
      return true;
    });
  }

  public recordAttendance(
    sessionId: string,
    date: string,
    records: { userId: string; userName: string; status: 'present' | 'absent' | 'excused' | 'club_closed'; reason?: string; checkInTime?: string; checkOutTime?: string }[],
    actorName: string
  ) {
    const nowJalali = formatJalaliDate(getCurrentJalaliDate());

    records.forEach((rec) => {
      const existingIdx = this.attendanceRecords.findIndex(
        (a) => a.sessionId === sessionId && a.date === date && a.userId === rec.userId
      );

      if (existingIdx !== -1) {
        this.attendanceRecords[existingIdx].status = rec.status;
        this.attendanceRecords[existingIdx].reason = rec.reason;
        this.attendanceRecords[existingIdx].checkInTime = rec.checkInTime;
        this.attendanceRecords[existingIdx].checkOutTime = rec.checkOutTime;
        this.attendanceRecords[existingIdx].recordedBy = actorName;
        this.attendanceRecords[existingIdx].recordedAt = nowJalali;
      } else {
        this.attendanceRecords.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sessionId,
          date,
          userId: rec.userId,
          userName: rec.userName,
          status: rec.status,
          reason: rec.reason,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          recordedBy: actorName,
          recordedAt: nowJalali,
        });
      }
    });

    this.checkAndExpireEnrollments();
    this.saveAll();
    records.forEach((rec) => {
      const saved = this.attendanceRecords.find(
        (a) => a.sessionId === sessionId && a.date === date && a.userId === rec.userId
      );
      if (saved) this.markPendingUpsert('attendanceRecords', saved);
    });

    // Direct REST batch persistence (atomic upsert) with offline fallback.
    this.sendMutation('POST', '/api/courses/attendance/batch', {
      sessionId,
      date,
      records: records.map((rec) => {
        // Send the existing local record id so server-side upsert UPDATES
        // instead of inserting a duplicate row on repeated saves/retries.
        const existing = this.attendanceRecords.find(
          (a) => a.sessionId === sessionId && a.date === date && a.userId === rec.userId
        );
        return {
          id: existing?.id,
          userId: rec.userId,
          userName: rec.userName,
          status: rec.status,
          reason: rec.reason,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          recordedAt: nowJalali,
        };
      }),
    });

    this.addAuditLog('coach', actorName, 'ثبت حضور و غیاب', 'Attendance', sessionId, `ثبت حضور غیاب تاریخ ${date} برای ${records.length} ورزشکار`);
    return this.getAttendanceRecords(sessionId, date);
  }

  public updateSingleAttendanceRecord(
    recordId: string, 
    newStatus: 'present' | 'absent' | 'excused' | 'club_closed', 
    actorName: string, 
    reason?: string,
    checkInTime?: string,
    checkOutTime?: string
  ) {
    const rec = this.attendanceRecords.find((a) => a.id === recordId);
    if (rec) {
      rec.status = newStatus;
      rec.reason = reason;
      rec.checkInTime = checkInTime;
      rec.checkOutTime = checkOutTime;
      rec.recordedBy = actorName;
      rec.recordedAt = formatJalaliDate(getCurrentJalaliDate());
      this.checkAndExpireEnrollments();
      this.saveAll();
      this.addAuditLog('coach', actorName, 'ویرایش حضور و غیاب گذشته', 'Attendance', recordId, `تغییر وضعیت حضور ${rec.userName} در تاریخ ${rec.date} به ${newStatus}`);
    }
  }

  public deleteAttendanceRecord(recordId: string, actorName: string) {
    const rec = this.attendanceRecords.find((a) => a.id === recordId);
    if (rec) {
      this.attendanceRecords = this.attendanceRecords.filter((a) => a.id !== recordId);
      this.checkAndExpireEnrollments();
      this.saveAll();
      this.markPendingDelete('attendanceRecords', recordId);
      this.addAuditLog('coach', actorName, 'حذف رکورد حضور و غیاب', 'Attendance', recordId, `حذف رکورد تاریخ ${rec.date} برای ${rec.userName}`);

      // Also trigger direct server deletion
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('club_app_token') : null;
      fetch(`/api/courses/attendance/${recordId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => {});
    }
  }

  public getUserAttendanceHistory(userId: string): AttendanceRecord[] {
    return this.attendanceRecords.filter((a) => a.userId === userId);
  }

  public getUserTransactions(userId: string): FinancialTransaction[] {
    const user = this.getUserById(userId);
    const filtered = this.transactions.filter((t) => {
      if (t.userId === userId) return true;
      if (user?.nationalId && user.nationalId !== '0000000000' && t.userNationalId === user.nationalId) return true;
      if (user?.phone && (t as any).userPhone && (t as any).userPhone === user.phone) return true;
      return false;
    });
    // Sort descending by creation timestamp extracted from ID or date
    return filtered.sort((a, b) => {
      const tsA = parseInt((a.id.match(/\d{13}/) || ['0'])[0], 10);
      const tsB = parseInt((b.id.match(/\d{13}/) || ['0'])[0], 10);
      if (tsA !== tsB && tsA > 0 && tsB > 0) {
        return tsB - tsA;
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  // DEBTORS & CREDITORS
  public getDebtors(): DebtorRecord[] {
    let modified = false;
    this.debtors = (this.debtors || []).map((d, idx) => {
      if (!d || typeof d !== 'object') return null;
      let targetId = d.id;
      if (!targetId || targetId.trim() === '' || targetId === 'undefined') {
        targetId = `debt-gen-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;
        modified = true;
      }
      const fullName = d.fullName && d.fullName.trim() !== '' ? d.fullName : 'ورزشکار بدون نام';
      if (fullName !== d.fullName || targetId !== d.id) {
        modified = true;
      }
      d.id = targetId;
      d.fullName = fullName;
      d.categoryTitle = d.categoryTitle || 'بدهی ثبت شده';
      d.amount = d.amount ?? 0;
      d.dueDate = d.dueDate || formatJalaliDate(getCurrentJalaliDate());
      d.status = d.status || 'overdue';
      return d;
    }).filter(Boolean) as DebtorRecord[];

    if (modified) {
      this.saveAll();
    }
    return [...this.debtors];
  }

  public addDebtor(debtor: Omit<DebtorRecord, 'id'>, actorName: string = 'حسابدار سیستم'): DebtorRecord {
    const existingUser = this.users.find(
      (u) =>
        (debtor.userId && u.id === debtor.userId) ||
        (debtor.nationalId && debtor.nationalId !== '0000000000' && u.nationalId === debtor.nationalId) ||
        u.fullName.trim() === debtor.fullName.trim()
    );

    let assignedUserId = debtor.userId;
    if (existingUser) {
      assignedUserId = existingUser.id;
    } else {
      assignedUserId = `user-deb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newUser: User = {
        id: assignedUserId,
        username: `athlete_${debtor.nationalId && debtor.nationalId !== '0000000000' ? debtor.nationalId : Date.now()}`,
        fullName: debtor.fullName,
        nationalId: debtor.nationalId || '0000000000',
        phone: debtor.phone || '09120000000',
        password: debtor.nationalId || '123',
        roles: ['athlete'],
        activeRole: 'athlete',
        isActive: true,
        createdAt: formatJalaliDate(getCurrentJalaliDate()),
        updatedAt: formatJalaliDate(getCurrentJalaliDate()),
      };
      this.users.push(newUser);
    }

    const newDebtor: DebtorRecord = {
      ...debtor,
      userId: assignedUserId,
      id: `deb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    this.debtors.unshift(newDebtor);
    this.saveAll();
    this.addAuditLog('accountant', actorName, 'افزودن بدهکار جدید', 'DebtorRecord', newDebtor.id, `افزودن بدهکار ${newDebtor.fullName} بابت ${newDebtor.categoryTitle} به مبلغ ${(newDebtor.amount ?? 0).toLocaleString('fa-IR')} تومان`);
    return newDebtor;
  }

  public settleDebtor(id: string, actorName: string = 'حسابدار سیستم'): void {
    const deb = this.debtors.find((d) => d.id === id);
    if (deb) {
      // Also record a completed transaction
      this.addTransaction(
        {
          userId: deb.userId || deb.id,
          userName: deb.fullName,
          userNationalId: deb.nationalId,
          amount: deb.amount,
          type: deb.category === 'tuition' ? 'tuition' : deb.category === 'insurance' ? 'insurance' : deb.category === 'equipment' ? 'equipment' : 'other',
          method: 'pos',
          description: `تسویه بدهی - ${deb.categoryTitle}`,
          status: 'completed',
          createdBy: actorName,
        },
        actorName
      );

      this.debtors = this.debtors.filter((d) => d.id !== id);
      this.saveAll();
      this.addAuditLog('accountant', actorName, 'تسویه کامل بدهی', 'DebtorRecord', id, `تسویه مطالبات ${deb.fullName} بابت ${deb.categoryTitle}`);
    }
  }

  public updateDebtor(id: string, updates: Partial<DebtorRecord>, actorName: string = 'حسابدار سیستم'): DebtorRecord | undefined {
    const deb = this.debtors.find((d) => d.id === id);
    if (deb) {
      const oldAmount = deb.amount;
      Object.assign(deb, updates);
      this.saveAll();
      this.addAuditLog('accountant', actorName, 'ویرایش رکورد بدهکار', 'DebtorRecord', id, `ویرایش اطلاعات بدهکار ${deb.fullName} (مبلغ قبلی: ${oldAmount.toLocaleString('fa-IR')}، مبلغ جدید: ${deb.amount.toLocaleString('fa-IR')} تومان)`);
      return deb;
    }
    return undefined;
  }

  public deleteDebtor(id: string, actorName: string = 'حسابدار سیستم'): void {
    if (!id || id.trim() === '' || id === 'undefined' || id === 'null') return;
    const targetId = id.trim();

    this.debtors = (this.debtors || []).filter(
      (d) => d && d.id !== targetId && (d.id || '').trim() !== targetId
    );

    this.saveAll();
    this.addAuditLog('accountant', actorName, 'حذف رکورد بدهکار', 'DebtorRecord', targetId, `حذف رکورد بدهکار ID: ${targetId}`);

    // Direct REST API deletion from MySQL
    fetch(`/api/finance/debtors/${targetId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    }).catch((e) => console.warn('Direct debtor delete API error:', e));
  }

  public getCreditors(): CreditorRecord[] {
    return [...this.creditors];
  }

  public addCreditor(creditor: Omit<CreditorRecord, 'id'>, actorName: string = 'حسابدار سیستم'): CreditorRecord {
    const newCreditor: CreditorRecord = {
      ...creditor,
      id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    this.creditors.unshift(newCreditor);
    this.saveAll();
    this.addAuditLog('accountant', actorName, 'افزودن طلبکار جدید', 'CreditorRecord', newCreditor.id, `افزودن طلبکار ${newCreditor.creditorName} بابت ${newCreditor.categoryTitle} به مبلغ ${(newCreditor.amount ?? 0).toLocaleString('fa-IR')} تومان`);
    return newCreditor;
  }

  public payCreditor(id: string, amountPaid?: number, actorName: string = 'حسابدار سیستم'): void {
    const cred = this.creditors.find((c) => c.id === id);
    if (cred) {
      const payAmount = amountPaid || cred.amount;
      if (payAmount >= cred.amount) {
        cred.status = 'settled';
        this.creditors = this.creditors.filter((c) => c.id !== id);
      } else {
        cred.amount -= payAmount;
        cred.status = 'partially_paid';
      }
      this.saveAll();
      this.addAuditLog('accountant', actorName, 'پرداخت وجه به طلبکار', 'CreditorRecord', id, `پرداخت مبلغ ${payAmount.toLocaleString('fa-IR')} تومان به ${cred.creditorName}`);
    }
  }

  public deleteCreditor(id: string, actorName: string = 'حسابدار سیستم'): void {
    this.creditors = this.creditors.filter((c) => c.id !== id);
    this.saveAll();
    this.addAuditLog('accountant', actorName, 'حذف رکورد طلبکار', 'CreditorRecord', id, `حذف رکورد طلبکار ID: ${id}`);

    // Direct REST API deletion from MySQL
    fetch(`/api/finance/creditors/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    }).catch((e) => console.warn('Direct creditor delete API error:', e));
  }

  // ==========================================
  // INSURANCE REQUESTS MANAGEMENT
  // ==========================================
  public getInsuranceRequests(): InsuranceRequest[] {
    return [...this.insuranceRequests];
  }

  public getInsuranceRequestsByUser(userId: string): InsuranceRequest[] {
    return this.insuranceRequests.filter((r) => r.userId === userId);
  }

  public submitInsuranceRequest(
    req: Omit<InsuranceRequest, 'id' | 'status' | 'createdAt'>,
    actorName: string
  ): InsuranceRequest {
    const newReq: InsuranceRequest = {
      ...req,
      id: `ins-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'pending',
      createdAt: formatJalaliDate(getCurrentJalaliDate()),
    };
    this.insuranceRequests.unshift(newReq);
    this.saveAll();
    // Protect against the 5s poll / refresh overwriting this optimistic
    // insert before POST /api/mysql/sync has committed on the server.
    this.markPendingUpsert('insuranceRequests', newReq);
    this.addAuditLog('athlete', actorName, 'ثبت و آپلود بیمه‌نامه ورزشی', 'InsuranceRequest', newReq.id, `ارسال کارت بیمه شماره ${newReq.insuranceNumber} برای بررسی`);
    
    // Add real-time inbox notification for administrative team
    this.addNotification({
      title: 'بیمه‌نامه ورزشی جدید جهت بررسی',
      message: `ورزشکار ${newReq.userName} یک کارت بیمه ورزشی جدید با شماره ${newReq.insuranceNumber} آپلود کرده است که نیاز به تایید مدیریت دارد.`,
      category: 'insurance',
      targetAudience: 'admin',
      actionLink: 'sports-insurance',
    });

    return newReq;
  }

  public approveInsuranceRequest(id: string, reviewerName: string): void {
    const req = this.insuranceRequests.find((r) => r.id === id);
    if (req) {
      req.status = 'approved';
      req.reviewedAt = formatJalaliDate(getCurrentJalaliDate());
      req.reviewedBy = reviewerName;

      // Update user record with active insurance info
      const user = this.users.find((u) => u.id === req.userId);
      if (user) {
        user.insuranceNumber = req.insuranceNumber;
        user.insuranceExpiryDate = req.expiryDate;
        user.isInsuranceValid = true;
      }

      this.saveAll();
      this.markPendingUpsert('insuranceRequests', req);
      this.addAuditLog('secretary', reviewerName, 'تأیید بیمه‌نامه ورزشی', 'InsuranceRequest', id, `تأیید بیمه‌نامه ${req.insuranceNumber} متعلق به ${req.userName}`);

      // Send personal notification to athlete
      if (req.userId) {
        this.addNotification({
          userId: req.userId,
          targetAudience: 'individual',
          title: 'تأیید بیمه‌نامه ورزشی',
          message: `کارت بیمه ورزشی شما با شماره ${req.insuranceNumber} تأیید شد و تا تاریخ ${req.expiryDate} دارای اعتبار است.`,
          category: 'insurance',
          actionLink: 'sports-insurance',
        });
      }
    }
  }

  public rejectInsuranceRequest(id: string, reason: string, reviewerName: string): void {
    const req = this.insuranceRequests.find((r) => r.id === id);
    if (req) {
      req.status = 'rejected';
      req.rejectionReason = reason;
      req.reviewedAt = formatJalaliDate(getCurrentJalaliDate());
      req.reviewedBy = reviewerName;
      this.saveAll();
      this.markPendingUpsert('insuranceRequests', req);
      this.addAuditLog('secretary', reviewerName, 'رد بیمه‌نامه ورزشی', 'InsuranceRequest', id, `رد بیمه‌نامه ${req.userName} علت: ${reason}`);

      // Send personal notification to athlete
      if (req.userId) {
        this.addNotification({
          userId: req.userId,
          targetAudience: 'individual',
          title: 'عدم تأیید مدارک بیمه‌نامه ورزشی',
          message: `مدارک بیمه‌نامه ورزشی شما با شماره ${req.insuranceNumber} به علت "${reason}" تأیید نشد. لطفاً نسبت به بارگذاری مجدد سند معتبر اقدام نمایید.`,
          category: 'insurance',
          actionLink: 'sports-insurance',
        });
      }
    }
  }

  public updateInsuranceRequest(
    id: string,
    updates: Partial<InsuranceRequest>,
    actorName: string
  ): InsuranceRequest | undefined {
    const index = this.insuranceRequests.findIndex((r) => r.id === id);
    if (index !== -1) {
      const updated = { ...this.insuranceRequests[index], ...updates };
      this.insuranceRequests[index] = updated;

      // If insurance status is approved or dates updated, sync with user
      if (updated.status === 'approved' && updated.userId) {
        const user = this.users.find((u) => u.id === updated.userId);
        if (user) {
          user.insuranceNumber = updated.insuranceNumber;
          user.insuranceExpiryDate = updated.expiryDate;
          user.isInsuranceValid = true;
        }
      }
      this.saveAll();
      this.markPendingUpsert('insuranceRequests', updated);
      this.addAuditLog('secretary', actorName, 'ویرایش بیمه‌نامه ورزشی', 'InsuranceRequest', id, `اصلاح اطلاعات بیمه‌نامه ${updated.insuranceNumber}`);
      return updated;
    }
    return undefined;
  }

  public deleteInsuranceRequest(id: string, actorName: string): boolean {
    const req = this.insuranceRequests.find((r) => r.id === id);
    if (req) {
      this.insuranceRequests = this.insuranceRequests.filter((r) => r.id !== id);
      this.saveAll();
      this.markPendingDelete('insuranceRequests', id);
      fetch(`/api/club/insurance/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }).catch((e) => console.warn('insurance delete API error:', e));
      this.addAuditLog('secretary', actorName, 'حذف بیمه‌نامه ورزشی', 'InsuranceRequest', id, `حذف پرونده بیمه شماره ${req.insuranceNumber}`);
      return true;
    }
    return false;
  }

  // ==========================================
  // SUPPORT TICKETING SYSTEM
  // ==========================================
  public getSupportTickets(): SupportTicket[] {
    return [...this.supportTickets];
  }

  public getSupportTicketsByUser(userId: string): SupportTicket[] {
    return this.supportTickets.filter((t) => t.userId === userId);
  }

  public getSupportTicketById(id: string): SupportTicket | undefined {
    return this.supportTickets.find((t) => t.id === id);
  }

  public createSupportTicket(
    data: Omit<SupportTicket, 'id' | 'ticketNumber' | 'status' | 'lastResponseAt' | 'createdAt' | 'messages'>,
    initialMessageText: string,
    attachmentName?: string,
    actorName?: string
  ): SupportTicket {
    const nowStamp = `${formatJalaliDate(getCurrentJalaliDate())} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
    const ticketId = `tk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const ticketNo = `TK-1403-${Math.floor(100 + Math.random() * 900)}`;

    const firstMsg: TicketMessage = {
      id: `msg-${Date.now()}-1`,
      ticketId: ticketId,
      senderId: data.userId,
      senderName: data.userName,
      senderRole: data.userRole,
      message: initialMessageText,
      attachmentName: attachmentName,
      createdAt: nowStamp,
    };

    const newTicket: SupportTicket = {
      ...data,
      id: ticketId,
      ticketNumber: ticketNo,
      status: 'open',
      createdAt: nowStamp,
      lastResponseAt: nowStamp,
      hasUnreadAdminMessage: true,
      hasUnreadUserMessage: false,
      messages: [firstMsg],
    };

    this.supportTickets.unshift(newTicket);

    // Auto-create notification for admins
    this.addNotification({
      title: `تیکت پشتیبانی جدید (${ticketNo})`,
      message: `${data.userName} تیکت جدیدی با موضوع "${data.subject}" ثبت کرد.`,
      category: 'general',
      actionLink: 'support-tickets',
      targetAudience: 'admin',
    });

    this.saveAll();
    this.addAuditLog(data.userRole, actorName || data.userName, 'ایجاد تیکت پشتیبانی جدید', 'SupportTicket', ticketId, `ارسال تیکت ${ticketNo}: ${data.subject}`);
    return newTicket;
  }

  public addTicketMessage(
    ticketId: string,
    messageText: string,
    senderId: string,
    senderName: string,
    senderRole: UserRoleKey,
    attachmentName?: string
  ): SupportTicket | undefined {
    const ticket = this.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return undefined;

    const nowStamp = `${formatJalaliDate(getCurrentJalaliDate())} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
    const newMsg: TicketMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      ticketId,
      senderId,
      senderName,
      senderRole,
      message: messageText,
      attachmentName,
      createdAt: nowStamp,
    };

    ticket.messages.push(newMsg);
    ticket.lastResponseAt = nowStamp;

    const isAdminSide = ['admin', 'secretary', 'accountant'].includes(senderRole);
    if (isAdminSide) {
      ticket.status = 'in_progress';
      ticket.hasUnreadUserMessage = true;
      ticket.hasUnreadAdminMessage = false;

      // Send notification to ticket owner
      this.addNotification({
        userId: ticket.userId,
        title: `پاسخ جدید به تیکت (${ticket.ticketNumber})`,
        message: `پاسخ جدید توسط ${senderName}: "${messageText.slice(0, 60)}${messageText.length > 60 ? '...' : ''}"`,
        category: 'general',
        actionLink: 'support-tickets',
        targetAudience: 'individual',
      });
    } else {
      ticket.status = 'waiting_user';
      ticket.hasUnreadAdminMessage = true;
      ticket.hasUnreadUserMessage = false;

      // Send notification to admins
      this.addNotification({
        title: `پیام جدید در تیکت ${ticket.ticketNumber}`,
        message: `پاسخ جدید از ${senderName}: "${messageText.slice(0, 60)}${messageText.length > 60 ? '...' : ''}"`,
        category: 'general',
        actionLink: 'support-tickets',
        targetAudience: 'admin',
      });
    }

    this.saveAll();
    this.addAuditLog(senderRole, senderName, 'پاسخ به تیکت پشتیبانی', 'SupportTicket', ticketId, `ارسال پاسخ به تیکت ${ticket.ticketNumber}`);
    return ticket;
  }

  public markTicketAsRead(ticketId: string, side: 'user' | 'admin'): void {
    const ticket = this.supportTickets.find((t) => t.id === ticketId);
    if (ticket) {
      if (side === 'user') {
        ticket.hasUnreadUserMessage = false;
      } else {
        ticket.hasUnreadAdminMessage = false;
      }
      this.saveAll();
    }
  }

  public updateTicketStatus(ticketId: string, newStatus: TicketStatus, actorName: string): void {
    const ticket = this.supportTickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = newStatus;
      this.saveAll();
      this.addAuditLog('admin', actorName, 'تغییر وضعیت تیکت پشتیبانی', 'SupportTicket', ticketId, `تغییر وضعیت تیکت ${ticket.ticketNumber} به ${newStatus}`);
    }
  }

  // ==========================================
  // ANNOUNCEMENTS & SLIDER BANNERS
  // ==========================================
  public getAnnouncements(): ClubAnnouncement[] {
    return this.announcements.filter((a) => a.isActive);
  }

  public getAnnouncementsForUser(userRole?: string): ClubAnnouncement[] {
    return this.announcements.filter((a) => {
      if (!a.isActive) return false;
      const aud = a.targetAudience as string;
      if (!aud || aud === 'all') return true;
      if (userRole === 'athlete' && (aud === 'athletes' || aud === 'athlete')) return true;
      if (userRole === 'coach' && (aud === 'coaches' || aud === 'coach')) return true;
      if (userRole && aud === userRole) return true;
      return false;
    });
  }

  public getAllAnnouncements(): ClubAnnouncement[] {
    return [...this.announcements];
  }

  public addAnnouncement(data: Omit<ClubAnnouncement, 'id' | 'createdAt'>): ClubAnnouncement {
    const newAnn: ClubAnnouncement = {
      ...data,
      id: `ann-${Date.now()}`,
      createdAt: formatJalaliDate(getCurrentJalaliDate()),
    };
    this.announcements.unshift(newAnn);
    this.saveAll();
    return newAnn;
  }

  public updateAnnouncement(id: string, data: Partial<ClubAnnouncement>, actorName: string): ClubAnnouncement | undefined {
    const ann = this.announcements.find((a) => a.id === id);
    if (!ann) return undefined;
    Object.assign(ann, data);
    this.saveAll();
    this.addAuditLog('admin', actorName, 'ویرایش اسلایدر/اعلان', 'ClubAnnouncement', id, `به‌روزرسانی اسلایدر ${ann.title}`);
    return ann;
  }

  public deleteAnnouncement(id: string, actorName: string): void {
    const idx = this.announcements.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const removed = this.announcements.splice(idx, 1)[0];
      this.saveAll();
      this.markPendingDelete('announcements', id);
      fetch(`/api/club/announcements/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }).catch((e) => console.warn('announcement delete API error:', e));
      this.addAuditLog('admin', actorName, 'حذف اسلایدر/اعلان', 'ClubAnnouncement', id, `حذف اسلایدر ${removed.title}`);
    }
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  private getLocalReadNotifIds(userId: string): string[] {
    try {
      const val = sessionStorage.getItem(`moj_user_read_notifs_${userId}`);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  private saveLocalReadNotifIds(userId: string, ids: string[]): void {
    try {
      sessionStorage.setItem(`moj_user_read_notifs_${userId}`, JSON.stringify(ids));
    } catch {}
  }

  private getLocalDeletedNotifIds(userId: string): string[] {
    try {
      const val = sessionStorage.getItem(`moj_user_deleted_notifs_${userId}`);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  private saveLocalDeletedNotifIds(userId: string, ids: string[]): void {
    try {
      sessionStorage.setItem(`moj_user_deleted_notifs_${userId}`, JSON.stringify(ids));
    } catch {}
  }

  public getNotificationsForUser(userId: string, userRole?: string): AppNotification[] {
    const deletedIds = new Set(this.getLocalDeletedNotifIds(userId));
    const readIds = new Set(this.getLocalReadNotifIds(userId));
    const isAdminOrStaff = userRole && ['super_admin', 'admin', 'secretary', 'accountant'].includes(userRole);

    const filtered = this.notifications.filter((n) => {
      // Filter out deleted ones
      if (deletedIds.has(n.id)) return false;

      // 1. Direct individual user notification
      if (n.userId) {
        return n.userId === userId;
      }

      // 2. Individual targetAudience without matching userId must NEVER be shown to other users
      if (n.targetAudience === 'individual') {
        return false;
      }

      const aud = (n.targetAudience as string) || '';

      // 3. Admin & Staff targeted notifications
      if (aud === 'admin' || aud === 'staff') {
        return Boolean(isAdminOrStaff);
      }

      // 4. Specific role matching
      if (userRole) {
        if (aud === userRole) return true;
        if (userRole === 'athlete' && (aud === 'athletes' || aud === 'athlete')) return true;
        if (userRole === 'coach' && (aud === 'coaches' || aud === 'coach')) return true;
        if (userRole === 'parent' && (aud === 'parents' || aud === 'parent')) return true;
        if (isAdminOrStaff && (aud === 'admin' || aud === 'secretary' || aud === 'accountant')) return true;
      }

      // 5. Broadcast to all members
      if (aud === 'all') {
        // Protect athletes from receiving legacy or misclassified internal admin alerts
        const isInternalAdminNotice =
          n.title?.includes('انقضای خودکار') ||
          n.title?.includes('انقضای اشتراک ورزشکار') ||
          n.title?.includes('فیش واریزی') ||
          n.title?.includes('پیش‌ثبت‌نام جدید') ||
          n.title?.includes('بیمه‌نامه ورزشی جدید') ||
          (n.message?.includes('اشتراک ورزشکار') && n.message?.includes('منقضی شد'));

        if (isInternalAdminNotice) {
          return Boolean(isAdminOrStaff);
        }
        return true;
      }

      // Default to admin-only for safety
      return Boolean(isAdminOrStaff);
    });

    // De-duplicate notifications by ID to prevent any duplicate React key errors
    const seen = new Set<string>();
    return filtered.map((n) => {
      const isRead = n.userId === userId ? n.isRead : (n.isRead || readIds.has(n.id));
      return { ...n, isRead };
    }).filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }

  public markNotificationAsRead(id: string, userId?: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      if (userId && notif.userId !== userId) {
        const readIds = this.getLocalReadNotifIds(userId);
        if (!readIds.includes(id)) {
          readIds.push(id);
          this.saveLocalReadNotifIds(userId, readIds);
        }
      } else {
        notif.isRead = true;
      }
      this.saveAll();
    }
  }

  public markAllNotificationsAsRead(userId?: string, userRole?: string): void {
    if (!userId) return;
    const userNotifs = this.getNotificationsForUser(userId, userRole);
    const readIds = this.getLocalReadNotifIds(userId);

    for (const n of userNotifs) {
      if (n.userId === userId) {
        const actualNotif = this.notifications.find(item => item.id === n.id);
        if (actualNotif) {
          actualNotif.isRead = true;
        }
      } else {
        if (!readIds.includes(n.id)) {
          readIds.push(n.id);
        }
      }
    }
    this.saveLocalReadNotifIds(userId, readIds);
    this.saveAll();
  }

  public deleteReadNotifications(userId: string, userRole?: string): void {
    const userNotifs = this.getNotificationsForUser(userId, userRole);
    const readNotifs = userNotifs.filter(n => n.isRead);
    if (readNotifs.length === 0) return;

    const deletedIds = this.getLocalDeletedNotifIds(userId);
    const dbOwnedIds: string[] = [];

    for (const n of readNotifs) {
      if (n.userId === userId) {
        this.notifications = this.notifications.filter(item => item.id !== n.id);
        dbOwnedIds.push(n.id); // owned row → physically removable on server
        this.markPendingDelete('notifications', n.id);
      } else {
        if (!deletedIds.includes(n.id)) {
          deletedIds.push(n.id);
        }
      }
    }
    this.saveLocalDeletedNotifIds(userId, deletedIds);
    this.saveAll();

    if (dbOwnedIds.length > 0) {
      fetch('/api/club/notifications/delete-read', {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId, ids: dbOwnedIds }),
      }).catch((e) => console.warn('delete-read notifications API error:', e));
    }
  }

  public addNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): AppNotification {
    const notif: AppNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      isRead: false,
      createdAt: `${formatJalaliDate(getCurrentJalaliDate())} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`,
    };
    this.notifications.unshift(notif);
    this.saveAll();
    return notif;
  }

  public sendTargetedNotification(data: {
    title: string;
    message: string;
    category: 'general' | 'financial' | 'course' | 'insurance' | 'urgent';
    targetType: 'all' | 'role' | 'individual' | 'custom';
    targetRole?: string;
    targetUserIds?: string[];
  }, actorName: string): number {
    let count = 0;
    const nowStr = `${formatJalaliDate(getCurrentJalaliDate())} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

    if (data.targetType === 'all') {
      const notif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        targetAudience: 'all',
        title: data.title,
        message: data.message,
        category: data.category,
        isRead: false,
        createdAt: nowStr,
      };
      this.notifications.unshift(notif);
      count = this.users.length;
    } else if (data.targetType === 'role' && data.targetRole) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        targetAudience: data.targetRole as any,
        title: data.title,
        message: data.message,
        category: data.category,
        isRead: false,
        createdAt: nowStr,
      };
      this.notifications.unshift(notif);
      count = this.users.filter((u) => u.roles.includes(data.targetRole as any)).length;
    } else if (data.targetType === 'individual' && data.targetUserIds && data.targetUserIds.length > 0) {
      for (const uid of data.targetUserIds) {
        const notif: AppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          userId: uid,
          title: data.title,
          message: data.message,
          category: data.category,
          isRead: false,
          createdAt: nowStr,
        };
        this.notifications.unshift(notif);
        count++;
      }
    } else if (data.targetType === 'custom' && data.targetUserIds && data.targetUserIds.length > 0) {
      for (const uid of data.targetUserIds) {
        const notif: AppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          userId: uid,
          title: data.title,
          message: data.message,
          category: data.category,
          isRead: false,
          createdAt: nowStr,
        };
        this.notifications.unshift(notif);
        count++;
      }
    }

    this.saveAll();
    this.addAuditLog('admin', actorName, 'ارسال اعلان گروهی/تکی', 'AppNotification', 'broadcast', `ارسال اعلان ${data.title} (${data.targetType}) به ${count} نفر`);
    return count;
  }

  // ==========================================
  // USER PROFILE UPDATE
  // ==========================================
  public updateUserProfile(userId: string, data: Partial<User>, actorName?: string): User | undefined {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return undefined;

    const fieldsToUpdate = {
      firstName: data.firstName ?? user.firstName,
      lastName: data.lastName ?? user.lastName,
      fullName: data.fullName ?? user.fullName,
      fatherName: data.fatherName !== undefined ? data.fatherName : user.fatherName,
      shenasnamehNo: data.shenasnamehNo ?? user.shenasnamehNo,
      nationalId: data.nationalId ?? user.nationalId,
      phone: data.phone ?? user.phone,
      emergencyContactName: data.emergencyContactName ?? user.emergencyContactName,
      emergencyContactRelation: data.emergencyContactRelation ?? user.emergencyContactRelation,
      emergencyContactPhone: data.emergencyContactPhone ?? user.emergencyContactPhone,
      bloodType: data.bloodType ?? user.bloodType,
      shoeSize: data.shoeSize ?? user.shoeSize,
      clothingSize: data.clothingSize ?? user.clothingSize,
      address: data.address ?? user.address,
      medicalConditions: data.medicalConditions ?? user.medicalConditions,
      referrerName: data.referrerName ?? user.referrerName,
      referrerPhone: data.referrerPhone ?? user.referrerPhone,
      insuranceNumber: data.insuranceNumber ?? user.insuranceNumber,
      insuranceExpiryDate: data.insuranceExpiryDate ?? user.insuranceExpiryDate,
      isInsuranceValid: data.isInsuranceValid ?? user.isInsuranceValid,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : user.avatarUrl,
      updatedAt: formatJalaliDate(getCurrentJalaliDate()),
      updatedBy: actorName || user.fullName,
    };

    Object.assign(user, fieldsToUpdate);

    this.saveAll();
    this.markPendingUpsert('users', user);
    this.addAuditLog('athlete', actorName || user.fullName, 'ویرایش اطلاعات پروفایل', 'User', user.id, `ویرایش اطلاعات کاربر ${user.fullName}`);
    
    // Direct REST API sync (with Optimistic Locking)
    fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(user),
    }).then(async (res) => {
      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.user?.version) {
          user.version = body.user.version;
        }
      } else if (res.status === 409) {
        this.loadFromBackendMySql();
      }
    }).catch((e) => console.warn('Direct user update API error:', e));

    return user;
  }

  // ==========================================
  // SHOP & INVENTORY MANAGEMENT METHODS
  // ==========================================
  public getProducts(): Product[] {
    return this.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public addProduct(prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const newProd: Product = {
      ...prod,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: formatJalaliDate(getCurrentJalaliDate()),
      updatedAt: formatJalaliDate(getCurrentJalaliDate()),
    };
    this.products.unshift(newProd);
    this.saveAll();
    this.markPendingUpsert('products', newProd);

    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd),
    }).catch((err) => console.warn('Direct API add product error:', err));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dbStoreUpdated'));
    }
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.products[idx] = {
      ...this.products[idx],
      ...updates,
      updatedAt: formatJalaliDate(getCurrentJalaliDate()),
    };
    this.saveAll();
    this.markPendingUpsert('products', this.products[idx]);

    fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(this.products[idx]),
    }).catch((err) => console.warn('Direct API update product error:', err));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dbStoreUpdated'));
    }
    return this.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    if (this.products.length !== initialLen) {
      this.saveAll();
      this.markPendingDelete('products', id);

      fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }).catch((err) => console.warn('Direct API delete product error:', err));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dbStoreUpdated'));
      }
      return true;
    }
    return false;
  }

  public async seedDemoProducts(): Promise<Product[]> {
    try {
      const res = await fetch('/api/products/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        this.products = data.products;
        this.saveAll();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dbStoreUpdated'));
        }
        return this.products;
      }
    } catch (e) {
      console.warn('Failed to seed demo products:', e);
    }
    return this.products;
  }

  public getShopInvoices(): ShopInvoice[] {
    return this.shopInvoices.map((inv) => {
      let items = inv.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
          if (typeof items === 'string') items = JSON.parse(items);
        } catch {
          items = [];
        }
      }
      return {
        ...inv,
        items: Array.isArray(items) ? items : [],
      };
    });
  }

  public getShopInvoicesByAthlete(athleteId: string): ShopInvoice[] {
    return this.getShopInvoices().filter((inv) => inv.athleteId === athleteId);
  }

  public setUserCreditPermission(userId: string, allow: boolean): boolean {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.allowCreditPurchase = allow;
      this.saveAll();
      return true;
    }
    return false;
  }

  public async createShopInvoice(data: {
    athleteId: string;
    athleteName?: string;
    creatorId: string;
    creatorName: string;
    date?: string;
    items: { productId: string; quantity: number }[];
    paymentMethod: 'cash' | 'credit';
    notes?: string;
  }): Promise<{ success: boolean; invoice?: ShopInvoice; error?: string }> {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'سبد خرید خالی است.' };
    }
    // Double-click guard: block duplicate rapid submissions for the same athlete.
    if (!this.canSubmitFinancialAction(`invoice:${data.athleteId}`)) {
      return { success: false, error: 'درخواست تکراری ثبت نشد؛ کمی صبر کنید و دوباره تلاش کنید.' };
    }

    const athlete = this.users.find((u) => u.id === data.athleteId);
    if (!athlete) {
      return { success: false, error: 'ورزشکار یافت نشد.' };
    }

    // Check credit purchase permission for athlete if under 18 or restricted
    if (data.paymentMethod === 'credit') {
      const isUnder18 = isUserUnder18(athlete.birthDate);
      if (isUnder18 && athlete.allowCreditPurchase !== true) {
        return {
          success: false,
          error: 'این ورزشکار زیر ۱۸ سال است و مجوز خرید نسیه توسط والدین او فعال نشده است.',
        };
      }
      
      const isLinkedToParent = this.links.some((l) => l.athleteId === athlete.id);
      if ((isLinkedToParent || athlete.allowCreditPurchase === false) && !athlete.allowCreditPurchase) {
        return {
          success: false,
          error: 'امکان خرید نسیه برای این ورزشکار فعال نیست. والد یا مدیر باید مجوز خرید اعتباری را فعال کنند.',
        };
      }
    }

    // ---- Server-first persistence (Phase 2/4): the DB is the single source of truth.
    // Prices and stock are validated & applied atomically on the SERVER.
    // Local UI state is only updated AFTER the server transaction commits.
    const invDate = data.date && typeof data.date === 'string' && data.date.trim() !== '' ? data.date : formatJalaliDate(getCurrentJalaliDate());
    const newInvoiceId = `shop-inv-${Date.now()}`;
    const invNumber = `INV-${1000 + this.shopInvoices.length + 1}`;

    let serverInvoice: any = null;
    try {
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          id: newInvoiceId,
          invoiceNumber: invNumber,
          athleteId: data.athleteId,
          athleteName: data.athleteName || athlete.fullName,
          creatorId: data.creatorId,
          creatorName: data.creatorName,
          date: invDate,
          items: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod: data.paymentMethod,
          notes: data.notes,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        return {
          success: false,
          error: json?.error || `ثبت فاکتور در سرور ناموفق بود (کد ${res.status}). هیچ تغییری اعمال نشد.`,
        };
      }
      serverInvoice = json.invoice;
    } catch (e: any) {
      return {
        success: false,
        error: 'امکان ارتباط با سرور وجود ندارد؛ فاکتور ثبت نشد. لطفاً اتصال شبکه را بررسی کنید.',
      };
    }

    // ---- Server COMMITTED. Mirror the authoritative result into local UI state.
    const invoiceItems: ShopInvoiceItem[] = (serverInvoice.items || []).map((it: any, i: number) => ({
      id: it.id || `${newInvoiceId}-item-${i}`,
      productId: it.productId,
      productName: it.productName,
      category: it.category || '',
      unitPrice: Number(it.unitPrice) || 0,
      quantity: Number(it.quantity) || 1,
      totalPrice: Number(it.totalPrice) || 0,
    }));
    const totalAmount = Number(serverInvoice.totalAmount) || 0;

    // Reflect the committed stock decrement locally
    for (const item of data.items) {
      const prod = this.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock -= item.quantity;
        prod.updatedAt = formatJalaliDate(getCurrentJalaliDate());
        this.markPendingUpsert('products', prod);
      }
    }

    const newInvoice: ShopInvoice = {
      id: serverInvoice.id || newInvoiceId,
      invoiceNumber: serverInvoice.invoiceNumber || invNumber,
      athleteId: data.athleteId,
      athleteName: data.athleteName || athlete.fullName,
      creatorId: data.creatorId,
      creatorName: data.creatorName,
      date: invDate,
      items: invoiceItems,
      totalAmount,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === 'cash' ? 'paid' : 'unpaid',
      notes: data.notes,
      createdAt: invDate,
    };

    this.shopInvoices.unshift(newInvoice);
    this.markPendingUpsert('shopInvoices', newInvoice);

    const itemsSummary = invoiceItems.map((i) => `${i.productName} (${i.quantity} عدد)`).join('، ');
    const invNumOnly = (serverInvoice.invoiceNumber || invNumber).replace(/^INV-/i, '');

    // 1. Charge record on user's account ledger
    const chargeTx: FinancialTransaction = {
      id: `${serverInvoice.id}-charge`,
      userId: athlete.id,
      userName: athlete.fullName,
      userNationalId: athlete.nationalId || '',
      type: 'charge',
      amount: totalAmount,
      method: data.paymentMethod === 'cash' ? 'pos' : 'cash',
      description: `بابت فاکتور ${invNumOnly}`,
      status: 'completed',
      createdAt: invDate,
      createdBy: data.creatorName || 'مسئول فروشگاه',
    };
    this.transactions.unshift(chargeTx);
    this.markPendingUpsert('transactions', chargeTx);

    // 2. If cash/instant payment, also add settlement record; otherwise a debtor record
    if (data.paymentMethod === 'cash') {
      const payTx: FinancialTransaction = {
        id: `${serverInvoice.id}-pay`,
        userId: athlete.id,
        userName: athlete.fullName,
        userNationalId: athlete.nationalId || '',
        type: 'equipment',
        amount: totalAmount,
        method: 'pos',
        description: `بابت تسویه فاکتور ${invNumOnly}`,
        status: 'completed',
        createdAt: invDate,
        createdBy: data.creatorName || 'مسئول فروشگاه',
      };
      this.transactions.unshift(payTx);
      this.markPendingUpsert('transactions', payTx);
    } else {
      const debtorRecord: DebtorRecord = {
        id: `debt-${serverInvoice.id}`,
        userId: athlete.id,
        fullName: athlete.fullName,
        nationalId: athlete.nationalId || '',
        phone: athlete.phone || '',
        category: 'equipment',
        categoryTitle: `فاکتور فروشگاه ${invNumOnly}`,
        amount: totalAmount,
        dueDate: invDate,
        status: 'overdue',
        notes: `بابت فاکتور ${invNumOnly}`,
      };
      this.debtors.unshift(debtorRecord);
      this.markPendingUpsert('debtors', debtorRecord);
    }

    // Add Notification to athlete
    this.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      userId: athlete.id,
      title: 'فاکتور جدید فروشگاه صادر شد',
      message: `فاکتور شماره ${serverInvoice.invoiceNumber || invNumber} به مبلغ ${totalAmount.toLocaleString('fa-IR')} تومان ثبت گردید (${data.paymentMethod === 'cash' ? 'تسویه شده' : 'نسیه / تسویه نشده'}).`,
      category: 'financial',
      isRead: false,
      createdAt: invDate,
    });

    this.saveAll();
    return { success: true, invoice: newInvoice };
  }

  public payShopInvoice(
    invoiceId: string,
    notes?: string,
    payMethod: 'pos' | 'card_to_card' | 'cash' | 'online' | 'wallet' = 'pos'
  ): boolean {
    const inv = this.shopInvoices.find((i) => i.id === invoiceId);
    if (!inv || inv.paymentStatus === 'paid') return false;

    inv.paymentStatus = 'paid';
    inv.paymentMethod = payMethod;
    const nowJalaliStr = formatJalaliDate(getCurrentJalaliDate());
    inv.notes = notes ? `${inv.notes || ''} - تسویه در ${nowJalaliStr}: ${notes}` : inv.notes;

    const athlete = this.users.find((u) => u.id === inv.athleteId);
    const invNumOnly = inv.invoiceNumber.replace(/^INV-/i, '');

    const payTx: FinancialTransaction = {
      id: `tx-shop-pay-${Date.now()}`,
      userId: inv.athleteId,
      userName: inv.athleteName,
      userNationalId: athlete?.nationalId || '',
      type: 'equipment',
      amount: inv.totalAmount,
      method: payMethod,
      description: payMethod === 'wallet' ? `بابت تسویه فاکتور ${invNumOnly} از محل کیف پول` : `بابت تسویه فاکتور ${invNumOnly}`,
      status: 'completed',
      createdAt: nowJalaliStr,
      createdBy: payMethod === 'wallet' ? 'کیف پول کاربر' : 'مسئول فروشگاه',
    };
    this.transactions.unshift(payTx);

    this.debtors = this.debtors.filter(
      (d) => !(
        d.userId === inv.athleteId && (
          (d.categoryTitle || '').includes(inv.invoiceNumber) ||
          (d.categoryTitle || '').includes(invNumOnly) ||
          (d.notes || '').includes(inv.invoiceNumber) ||
          (d.notes || '').includes(invNumOnly)
        )
      )
    );

    this.saveAll();
    return true;
  }

  public getShopInvoiceByNumber(invNumber: string): ShopInvoice | undefined {
    if (!invNumber) return undefined;
    const cleanNum = invNumber.trim().toUpperCase();
    return this.shopInvoices.find((inv) => inv.invoiceNumber.toUpperCase() === cleanNum || inv.invoiceNumber.replace(/^INV-/i, '') === cleanNum);
  }

  public findShopInvoiceFromDescription(desc: string): ShopInvoice | undefined {
    if (!desc) return undefined;
    const matchInv = desc.match(/INV-\d+/i);
    if (matchInv) {
      return this.getShopInvoiceByNumber(matchInv[0]);
    }
    const matchNum = desc.match(/فاکتور\s*(\d+)/i);
    if (matchNum) {
      return this.getShopInvoiceByNumber(`INV-${matchNum[1]}`);
    }
    return undefined;
  }

  // ==========================================
  // CONFLICT DETECTION & ATTENDANCE QUERIES
  // ==========================================
  public checkSessionScheduleConflict(userId: string, newSessionId: string): {
    hasConflict: boolean;
    conflictingSessionTitle?: string;
    conflictingDays?: string[];
    conflictingTime?: string;
  } {
    const newSession = this.sessions.find((s) => s.id === newSessionId);
    if (!newSession) return { hasConflict: false };

    const activeEnrollments = this.enrollments.filter(
      (e) => e.userId === userId && e.status === 'active' && e.sessionId !== newSessionId
    );

    const parseTimeToMinutes = (timeStr: string) => {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const newStart = parseTimeToMinutes(newSession.startTime);
    const newEnd = parseTimeToMinutes(newSession.endTime);

    for (const enr of activeEnrollments) {
      const existingSession = this.sessions.find((s) => s.id === enr.sessionId);
      if (!existingSession || !existingSession.isActive) continue;

      const overlappingDays = newSession.daysOfWeek.filter((day) =>
        existingSession.daysOfWeek.includes(day)
      );

      if (overlappingDays.length > 0) {
        const existStart = parseTimeToMinutes(existingSession.startTime);
        const existEnd = parseTimeToMinutes(existingSession.endTime);

        if (Math.max(newStart, existStart) < Math.min(newEnd, existEnd)) {
          return {
            hasConflict: true,
            conflictingSessionTitle: existingSession.title,
            conflictingDays: overlappingDays,
            conflictingTime: `${existingSession.startTime} تا ${existingSession.endTime}`,
          };
        }
      }
    }

    return { hasConflict: false };
  }

  public getAttendanceRecordsForUser(userId: string): AttendanceRecord[] {
    return this.attendanceRecords.filter((a) => a.userId === userId);
  }

  // ==========================================
  // SMS MANAGEMENT & SMS.IR INTEGRATION
  // ==========================================
  public getSmsLogs(): SmsLogRecord[] {
    return this.smsLogs;
  }

  public addSmsLog(log: Omit<SmsLogRecord, 'id' | 'sentAt'>): SmsLogRecord {
    const newLog: SmsLogRecord = {
      ...log,
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sentAt: `${formatJalaliDate(getCurrentJalaliDate())} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
    };
    this.smsLogs.unshift(newLog);
    this.saveAll();

    fetch('/api/mysql/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smsLogs: this.smsLogs,
      }),
    }).catch((err) => console.warn('[dbStore] Direct smsLog sync error:', err));

    return newLog;
  }

  public deleteSmsLog(id: string): void {
    this.smsLogs = this.smsLogs.filter((l) => l.id !== id);
    this.saveAll();
    this.markPendingDelete('smsLogs', id);
    fetch(`/api/club/smslogs/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    }).catch((e) => console.warn('smslog delete API error:', e));
  }

  public clearSmsLogs(): void {
    const ids = this.smsLogs.map((l) => l.id);
    this.smsLogs = [];
    this.saveAll();
    ids.forEach((id) => this.markPendingDelete('smsLogs', id));
    fetch('/api/club/smslogs/all', {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    }).catch((e) => console.warn('smslog clear API error:', e));
  }

  public async checkSmsCredit(apiKey?: string): Promise<{ success: boolean; credit?: number; message?: string; error?: string }> {
    try {
      const keyToUse = apiKey || this.clubSettings.smsApiKey;
      const res = await fetch('/api/sms/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToUse }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  }

  public async getSmsLines(apiKey?: string): Promise<{ success: boolean; lines?: string[]; error?: string }> {
    try {
      const keyToUse = apiKey || this.clubSettings.smsApiKey;
      const res = await fetch('/api/sms/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToUse }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در دریافت لیست خطوط' };
    }
  }

  public async sendBulkSms(payload: {
    apiKey?: string;
    lineNumber?: string;
    messageText: string;
    mobiles: string[];
    recipientNames?: string[];
    targetGroup?: string;
    sentBy?: string;
  }): Promise<{ success: boolean; packId?: string; messageIds?: any[]; cost?: number; error?: string }> {
    const keyToUse = payload.apiKey || this.clubSettings.smsApiKey;
    const lineToUse = payload.lineNumber || this.clubSettings.smsLineNumber || '30007732';
    const actor = payload.sentBy || 'مدیر سیستم';

    try {
      const res = await fetch('/api/sms/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToUse,
          lineNumber: lineToUse,
          messageText: payload.messageText,
          mobiles: payload.mobiles,
        }),
      });
      const data = await res.json();

      if (data.success) {
        this.addSmsLog({
          recipients: payload.mobiles,
          recipientNames: payload.recipientNames,
          message: payload.messageText,
          type: payload.mobiles.length > 1 ? 'bulk' : 'single',
          targetGroup: payload.targetGroup || 'custom',
          status: 'sent',
          cost: data.cost || 0,
          packId: data.packId ? String(data.packId) : undefined,
          messageIds: data.messageIds,
          sentBy: actor,
        });

        this.addAuditLog('admin', actor, 'ارسال پیامک انبوه / تکی', 'SMS', data.packId || 'bulk', `ارسال پیامک به ${payload.mobiles.length} شماره`);
        return { success: true, packId: data.packId, messageIds: data.messageIds, cost: data.cost };
      } else {
        this.addSmsLog({
          recipients: payload.mobiles,
          recipientNames: payload.recipientNames,
          message: payload.messageText,
          type: payload.mobiles.length > 1 ? 'bulk' : 'single',
          targetGroup: payload.targetGroup || 'custom',
          status: 'failed',
          errorMessage: data.error || 'خطا در ارسال از درگاه مخابراتی',
          sentBy: actor,
        });
        return { success: false, error: data.error || 'خطا در ارسال پیامک' };
      }
    } catch (err: any) {
      this.addSmsLog({
        recipients: payload.mobiles,
        recipientNames: payload.recipientNames,
        message: payload.messageText,
        type: payload.mobiles.length > 1 ? 'bulk' : 'single',
        targetGroup: payload.targetGroup || 'custom',
        status: 'failed',
        errorMessage: err.message || 'خطای شبکه در ارتباط با سرور',
        sentBy: actor,
      });
      return { success: false, error: err.message || 'خطای شبکه' };
    }
  }

  public async sendVerifyPatternSms(payload: {
    apiKey?: string;
    mobile: string;
    recipientName?: string;
    templateId: string | number;
    parameters: { name: string; value: string }[];
    sentBy?: string;
  }): Promise<{ success: boolean; messageId?: any; cost?: number; error?: string }> {
    const keyToUse = payload.apiKey || this.clubSettings.smsApiKey;
    const actor = payload.sentBy || 'سیستم خودکار';

    try {
      const res = await fetch('/api/sms/send-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToUse,
          mobile: payload.mobile,
          templateId: payload.templateId,
          parameters: payload.parameters,
        }),
      });
      const data = await res.json();

      const paramsText = payload.parameters.map((p) => `${p.name}: ${p.value}`).join(' | ');
      const descMessage = `[الگوی اعتبارسنجی پترن #${payload.templateId}] - ${paramsText}`;

      if (data.success) {
        this.addSmsLog({
          recipients: [payload.mobile],
          recipientNames: payload.recipientName ? [payload.recipientName] : undefined,
          message: descMessage,
          type: 'verify_pattern',
          targetGroup: 'otp_pattern',
          status: 'sent',
          cost: data.cost || 0,
          messageIds: data.messageId ? [data.messageId] : undefined,
          sentBy: actor,
        });
        return { success: true, messageId: data.messageId, cost: data.cost };
      } else {
        this.addSmsLog({
          recipients: [payload.mobile],
          recipientNames: payload.recipientName ? [payload.recipientName] : undefined,
          message: descMessage,
          type: 'verify_pattern',
          targetGroup: 'otp_pattern',
          status: 'failed',
          errorMessage: data.error || 'خطا در ارسال پیامک پترن',
          sentBy: actor,
        });
        return { success: false, error: data.error || 'خطا در ارسال پیامک پترن' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارسال پترن' };
    }
  }

  // ==========================================
  // BALE MESSENGER METHODS
  // ==========================================
  public async testBaleBotConnection(botToken?: string): Promise<{ success: boolean; botInfo?: any; message?: string; error?: string }> {
    try {
      const tokenToUse = botToken || this.clubSettings.baleBotToken;
      const res = await fetch('/api/bale/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: tokenToUse }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور بله' };
    }
  }

  public async sendBaleMessage(payload: {
    botToken?: string;
    chatId?: string;
    text: string;
    recipientName?: string;
    targetGroup?: string;
    sentBy?: string;
  }): Promise<{ success: boolean; messageId?: any; error?: string }> {
    const tokenToUse = payload.botToken || this.clubSettings.baleBotToken;
    const chatToUse = payload.chatId || this.clubSettings.baleChannelOrChatId;
    const actor = payload.sentBy || 'مدیر سیستم';

    try {
      const res = await fetch('/api/bale/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tokenToUse,
          chatId: chatToUse,
          text: payload.text,
        }),
      });
      const data = await res.json();

      if (data.success) {
        this.addSmsLog({
          recipients: [chatToUse || 'Bale Chat'],
          recipientNames: payload.recipientName ? [payload.recipientName] : undefined,
          message: payload.text,
          channel: 'bale',
          type: 'bale_channel',
          targetGroup: payload.targetGroup || 'bale_chat',
          status: 'sent',
          messageIds: data.messageId ? [data.messageId] : undefined,
          sentBy: actor,
        });

        this.addAuditLog('admin', actor, 'ارسال پیام در پیام‌رسان بله', 'Bale', String(data.messageId || 'bale'), `ارسال پیام به چت/کانال ${chatToUse}`);
        return { success: true, messageId: data.messageId };
      } else {
        this.addSmsLog({
          recipients: [chatToUse || 'Bale Chat'],
          recipientNames: payload.recipientName ? [payload.recipientName] : undefined,
          message: payload.text,
          channel: 'bale',
          type: 'bale_channel',
          targetGroup: payload.targetGroup || 'bale_chat',
          status: 'failed',
          errorMessage: data.error || 'خطا در ارسال پیام به بله',
          sentBy: actor,
        });
        return { success: false, error: data.error || 'خطا در ارسال پیام بله' };
      }
    } catch (err: any) {
      this.addSmsLog({
        recipients: [chatToUse || 'Bale Chat'],
        recipientNames: payload.recipientName ? [payload.recipientName] : undefined,
        message: payload.text,
        channel: 'bale',
        type: 'bale_channel',
        targetGroup: payload.targetGroup || 'bale_chat',
        status: 'failed',
        errorMessage: err.message || 'خطای شبکه در ارسال بله',
        sentBy: actor,
      });
      return { success: false, error: err.message || 'خطای شبکه' };
    }
  }

  // GENERATE MYSQL DDL SCRIPT FOR CPANEL

  public generateMySQLSchemaSQL(): string {
    return `-- ============================================================
-- اسکریپت جامع دیتابیس MySQL برای «باشگاه سنگ‌نوردی موج»
-- قابل ایمپورت مستقیم در phpMyAdmin هاست cPanel یا هر دیتابیس MySQL دیگر
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`moj_climbing_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`moj_climbing_db\`;

-- ۱. جدول نقش‌ها (Roles)
CREATE TABLE IF NOT EXISTS \`roles\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`key_name\` VARCHAR(100) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`permissions\` JSON,
  \`isSystem\` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲. جدول کاربران (Users)
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`username\` VARCHAR(100) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`fullName\` VARCHAR(255) NOT NULL,
  \`fatherName\` VARCHAR(255),
  \`nationalId\` VARCHAR(20) NOT NULL UNIQUE,
  \`birthDate\` VARCHAR(50),
  \`phone\` VARCHAR(20) NOT NULL,
  \`emergencyContactName\` VARCHAR(255),
  \`emergencyContactRelation\` VARCHAR(100),
  \`emergencyContactPhone\` VARCHAR(20),
  \`bloodType\` VARCHAR(20),
  \`shoeSize\` VARCHAR(20),
  \`clothingSize\` VARCHAR(20),
  \`address\` TEXT,
  \`medicalConditions\` TEXT,
  \`educationOrJob\` VARCHAR(255),
  \`referrerName\` VARCHAR(255),
  \`referrerPhone\` VARCHAR(20),
  \`climbingExperienceLevel\` VARCHAR(50),
  \`insuranceNumber\` VARCHAR(100),
  \`parentFullName\` VARCHAR(255),
  \`parentNationalId\` VARCHAR(20),
  \`parentPhone\` VARCHAR(20),
  \`baleChatId\` VARCHAR(100),
  \`avatarUrl\` LONGTEXT,
  \`roles\` JSON,
  \`activeRole\` VARCHAR(50) DEFAULT 'athlete',
  \`isActive\` TINYINT(1) DEFAULT 1,
  \`createdAt\` VARCHAR(100),
  \`updatedAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. جدول پیوند والد و فرزند (Parent Athlete Links)
CREATE TABLE IF NOT EXISTS \`parent_athlete_links\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`parentId\` VARCHAR(100) NOT NULL,
  \`athleteId\` VARCHAR(100) NOT NULL,
  \`relationType\` VARCHAR(50) DEFAULT 'father',
  \`createdAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. جدول ردگیری تغییرات (Audit Logs)
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`userRole\` VARCHAR(100),
  \`actorName\` VARCHAR(255),
  \`actionType\` VARCHAR(255),
  \`targetModel\` VARCHAR(100),
  \`targetId\` VARCHAR(100),
  \`details\` TEXT,
  \`timestamp\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. جدول پیش‌ثبت‌نام‌ها (Pre-Registrations)
CREATE TABLE IF NOT EXISTS \`pre_registrations\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`firstName\` VARCHAR(255),
  \`lastName\` VARCHAR(255),
  \`fullName\` VARCHAR(255) NOT NULL,
  \`fatherName\` VARCHAR(255),
  \`shenasnamehNo\` VARCHAR(50),
  \`nationalId\` VARCHAR(20) NOT NULL,
  \`birthDate\` VARCHAR(50),
  \`gender\` VARCHAR(20),
  \`isUnder18\` TINYINT(1) DEFAULT 0,
  \`phone\` VARCHAR(20) NOT NULL,
  \`emergencyContactName\` VARCHAR(255),
  \`emergencyContactRelation\` VARCHAR(100),
  \`emergencyContactPhone\` VARCHAR(20),
  \`bloodType\` VARCHAR(20),
  \`shoeSize\` VARCHAR(20),
  \`clothingSize\` VARCHAR(20),
  \`address\` TEXT,
  \`medicalConditions\` TEXT,
  \`educationOrJob\` VARCHAR(255),
  \`referrerName\` VARCHAR(255),
  \`referrerPhone\` VARCHAR(20),
  \`climbingExperienceLevel\` VARCHAR(50),
  \`insuranceNumber\` VARCHAR(100),
  \`parentFullName\` VARCHAR(255),
  \`parentNationalId\` VARCHAR(20),
  \`parentPhone\` VARCHAR(20),
  \`avatarUrl\` LONGTEXT,
  \`status\` VARCHAR(50) DEFAULT 'pending',
  \`rejectionReason\` TEXT,
  \`assignedRoles\` JSON,
  \`createdUserId\` VARCHAR(100),
  \`createdAt\` VARCHAR(100),
  \`reviewedAt\` VARCHAR(100),
  \`reviewedBy\` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. جدول تنظیمات باشگاه (Club Settings)
CREATE TABLE IF NOT EXISTS \`club_settings\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255),
  \`slogan\` VARCHAR(255),
  \`logo_Icon\` VARCHAR(100),
  \`theme_Palette\` VARCHAR(50),
  \`smsApiKey\` VARCHAR(255),
  \`smsLineNumber\` VARCHAR(50),
  \`smsSignature\` VARCHAR(100),
  \`baleBotToken\` VARCHAR(255),
  \`baleChannelOrChatId\` VARCHAR(100),
  \`settings_json\` LONGTEXT,
  \`updatedAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. جدول اطلاعیه‌ها و اسلایدرها (Club Announcements)
CREATE TABLE IF NOT EXISTS \`club_announcements\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`title\` VARCHAR(255) NOT NULL,
  \`subtitle\` TEXT,
  \`imageUrl\` LONGTEXT,
  \`discountTag\` VARCHAR(100),
  \`startDate\` VARCHAR(100),
  \`endDate\` VARCHAR(100),
  \`isActive\` TINYINT(1) DEFAULT 1,
  \`targetAudience\` VARCHAR(50) DEFAULT 'all',
  \`createdAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. جدول دوره‌ها و سانس‌ها (Courses)
CREATE TABLE IF NOT EXISTS \`courses\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`title\` VARCHAR(255) NOT NULL,
  \`sportType\` VARCHAR(100),
  \`coachId\` VARCHAR(100),
  \`coachName\` VARCHAR(255),
  \`daysOfWeek\` JSON,
  \`startTime\` VARCHAR(50),
  \`endTime\` VARCHAR(50),
  \`capacity\` INT DEFAULT 20,
  \`monthlyFee\` DOUBLE,
  \`isActive\` TINYINT(1) DEFAULT 1,
  \`description\` TEXT,
  \`startDate\` VARCHAR(100),
  \`endDate\` VARCHAR(100),
  \`registrationDeadline\` VARCHAR(100),
  \`level\` VARCHAR(100),
  \`locationRoom\` VARCHAR(255),
  \`createdAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۹. جدول ثبت‌نام‌ها (Enrollments)
CREATE TABLE IF NOT EXISTS \`enrollments\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`sessionId\` VARCHAR(100),
  \`userId\` VARCHAR(100),
  \`athleteName\` VARCHAR(255),
  \`athletePhone\` VARCHAR(20),
  \`athleteNationalId\` VARCHAR(20),
  \`status\` VARCHAR(50) DEFAULT 'active',
  \`paymentStatus\` VARCHAR(50) DEFAULT 'paid',
  \`trackingNumber\` VARCHAR(100),
  \`receiptUrl\` LONGTEXT,
  \`receiptFileName\` VARCHAR(255),
  \`paymentMethod\` VARCHAR(50),
  \`enrolledAt\` VARCHAR(100),
  \`expireDate\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۰. جدول تراکنش‌های مالی (Transactions)
CREATE TABLE IF NOT EXISTS \`transactions\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(100),
  \`userName\` VARCHAR(255),
  \`userNationalId\` VARCHAR(20),
  \`amount\` DOUBLE,
  \`type\` VARCHAR(50),
  \`method\` VARCHAR(50),
  \`trackingNumber\` VARCHAR(100),
  \`receiptUrl\` LONGTEXT,
  \`receiptFileName\` VARCHAR(255),
  \`description\` TEXT,
  \`status\` VARCHAR(50),
  \`createdAt\` VARCHAR(100),
  \`createdBy\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۱. جدول سوابق حضور غیاب (Attendance Records)
CREATE TABLE IF NOT EXISTS \`attendance_records\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`sessionId\` VARCHAR(100),
  \`date\` VARCHAR(100),
  \`userId\` VARCHAR(100),
  \`userName\` VARCHAR(255),
  \`status\` VARCHAR(50),
  \`reason\` TEXT,
  \`recordedBy\` VARCHAR(255),
  \`recordedAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۲. جدول بدهکاران (Debtors)
CREATE TABLE IF NOT EXISTS \`debtors\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(100),
  \`fullName\` VARCHAR(255),
  \`nationalId\` VARCHAR(20),
  \`phone\` VARCHAR(20),
  \`category\` VARCHAR(100),
  \`categoryTitle\` VARCHAR(255),
  \`amount\` DOUBLE,
  \`dueDate\` VARCHAR(100),
  \`status\` VARCHAR(50),
  \`notes\` TEXT,
  \`createdAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۳. جدول بستانکاران (Creditors)
CREATE TABLE IF NOT EXISTS \`creditors\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`creditorName\` VARCHAR(255),
  \`category\` VARCHAR(100),
  \`categoryTitle\` VARCHAR(255),
  \`contactPhone\` VARCHAR(20),
  \`ibanNumber\` VARCHAR(100),
  \`amount\` DOUBLE,
  \`dueDate\` VARCHAR(100),
  \`status\` VARCHAR(50) DEFAULT 'unpaid',
  \`notes\` TEXT,
  \`createdAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۴. جدول درخواست‌های بیمه (Insurance Requests)
CREATE TABLE IF NOT EXISTS \`insurance_requests\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(100),
  \`userName\` VARCHAR(255),
  \`userNationalId\` VARCHAR(20),
  \`insuranceNumber\` VARCHAR(100),
  \`startDate\` VARCHAR(100),
  \`expiryDate\` VARCHAR(100),
  \`documentUrl\` LONGTEXT,
  \`fileName\` VARCHAR(255),
  \`status\` VARCHAR(50) DEFAULT 'pending',
  \`rejectionReason\` TEXT,
  \`createdAt\` VARCHAR(100),
  \`reviewedAt\` VARCHAR(100),
  \`reviewedBy\` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۵. جدول تیکت‌های پشتیبانی (Support Tickets)
CREATE TABLE IF NOT EXISTS \`support_tickets\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`ticketNumber\` VARCHAR(100),
  \`userId\` VARCHAR(100),
  \`userName\` VARCHAR(255),
  \`userNationalId\` VARCHAR(20),
  \`userRole\` VARCHAR(50),
  \`userPhone\` VARCHAR(20),
  \`subject\` VARCHAR(255),
  \`department\` VARCHAR(100),
  \`priority\` VARCHAR(50),
  \`status\` VARCHAR(50),
  \`lastResponseAt\` VARCHAR(100),
  \`hasUnreadAdminMessage\` TINYINT(1) DEFAULT 0,
  \`hasUnreadUserMessage\` TINYINT(1) DEFAULT 0,
  \`createdAt\` VARCHAR(100),
  \`messages\` JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۶. جدول اعلان‌های درون برنامه‌ای (App Notifications)
CREATE TABLE IF NOT EXISTS \`app_notifications\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(100),
  \`targetAudience\` VARCHAR(50),
  \`title\` VARCHAR(255),
  \`message\` TEXT,
  \`category\` VARCHAR(50),
  \`isRead\` TINYINT(1) DEFAULT 0,
  \`actionLink\` TEXT,
  \`createdAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۷. جدول محصولات و کالاها (Products)
CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`code\` VARCHAR(100),
  \`name\` VARCHAR(255) NOT NULL,
  \`category\` VARCHAR(100),
  \`price\` DOUBLE DEFAULT 0,
  \`buyPrice\` DOUBLE DEFAULT 0,
  \`stock\` INT DEFAULT 0,
  \`minStock\` INT DEFAULT 5,
  \`minStockAlert\` INT DEFAULT 5,
  \`unit\` VARCHAR(50),
  \`imageUrl\` LONGTEXT,
  \`description\` TEXT,
  \`isActive\` TINYINT(1) DEFAULT 1,
  \`createdAt\` VARCHAR(100),
  \`updatedAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۸. جدول فاکتورهای فروشگاه (Shop Invoices)
CREATE TABLE IF NOT EXISTS \`shop_invoices\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`invoiceNumber\` VARCHAR(100),
  \`athleteId\` VARCHAR(100),
  \`athleteName\` VARCHAR(255),
  \`creatorId\` VARCHAR(100),
  \`creatorName\` VARCHAR(255),
  \`date\` VARCHAR(100),
  \`items\` LONGTEXT,
  \`totalAmount\` DOUBLE DEFAULT 0,
  \`paymentMethod\` VARCHAR(50),
  \`paymentStatus\` VARCHAR(50),
  \`notes\` TEXT,
  \`createdAt\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۹. جدول آیتم‌های فاکتور فروشگاه (Shop Invoice Items)
CREATE TABLE IF NOT EXISTS \`shop_invoice_items\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`invoiceId\` VARCHAR(100) NOT NULL,
  \`productId\` VARCHAR(100),
  \`productName\` VARCHAR(255) NOT NULL,
  \`category\` VARCHAR(100),
  \`unitPrice\` DOUBLE NOT NULL DEFAULT 0,
  \`buyPrice\` DOUBLE NOT NULL DEFAULT 0,
  \`quantity\` INT NOT NULL DEFAULT 1,
  \`totalPrice\` DOUBLE NOT NULL DEFAULT 0,
  FOREIGN KEY (\`invoiceId\`) REFERENCES \`shop_invoices\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲۰. جدول سوابق و لاگ‌های پیامک (SMS Logs)
CREATE TABLE IF NOT EXISTS \`sms_logs\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`recipients\` JSON,
  \`recipientNames\` JSON,
  \`message\` TEXT,
  \`channel\` VARCHAR(50) DEFAULT 'sms',
  \`type\` VARCHAR(50),
  \`targetGroup\` VARCHAR(50),
  \`status\` VARCHAR(50) DEFAULT 'sent',
  \`cost\` DOUBLE DEFAULT 0,
  \`packId\` VARCHAR(100),
  \`messageIds\` JSON,
  \`sentBy\` VARCHAR(255),
  \`sentAt\` VARCHAR(100),
  \`errorMessage\` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- داده‌های پایه و اولیه‌
-- ============================================================

INSERT IGNORE INTO \`roles\` (\`id\`, \`key_name\`, \`title\`, \`description\`, \`isSystem\`) VALUES
('role-admin', 'admin', 'مدیر کل (Admin)', 'دسترسی کامل به تمامی بخش‌های سیستم', 1),
('role-secretary', 'secretary', 'منشی باشگاه', 'مدیریت ثبت‌نام، بیمه و حضور غیاب', 1),
('role-accountant', 'accountant', 'حسابدار', 'مدیریت امور مالی و شهریه‌ها', 1),
('role-coach', 'coach', 'مربی', 'مدیریت برنامه‌ها و حضورغیاب کلاس‌ها', 1),
('role-athlete', 'athlete', 'ورزشکار', 'مشاهده برنامه‌ها و پرداخت شهریه', 1),
('role-parent', 'parent', 'والدین', 'پیگیری وضعیت تمام فرزندان', 1);

-- کاربر ادمین اولیه پیش‌فرض (توصیه می‌شود پس از ورود رمز را تغییر دهید)
INSERT IGNORE INTO \`users\` (\`id\`, \`username\`, \`password\`, \`fullName\`, \`nationalId\`, \`phone\`, \`roles\`, \`activeRole\`, \`isActive\`, \`createdAt\`) VALUES
('usr-admin-default', 'admin', 'admin123', 'مدیر ارشد سیستم', '0000000000', '09120000000', '["admin"]', 'admin', 1, '1405/01/01');
`;
  }
}

export const dbStore = new StorageEngine();
