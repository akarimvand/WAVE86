import mysql from 'mysql2/promise';

/**
 * Server-side Audit Trail (Phase 5).
 * Writes enriched audit entries (who / what / when / old / new / ip / agent)
 * into `audit_logs`. Enriched columns exist after Migration 004; on older
 * databases the insert falls back to the base columns so auditing never breaks
 * a business operation.
 */
export interface AuditEntry {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  oldValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
}

/** Extract client IP + User-Agent from an Express request (proxy-aware). */
export function getRequestInfo(req: any): { ip: string; userAgent: string } {
  const fwd = req?.headers?.['x-forwarded-for'];
  const ip =
    (typeof fwd === 'string' && fwd.split(',')[0].trim()) ||
    req?.socket?.remoteAddress ||
    '';
  const userAgent = String(req?.headers?.['user-agent'] || '').slice(0, 250);
  return { ip, userAgent };
}

function trimJson(value: any): string | null {
  if (value === undefined || value === null) return null;
  try {
    // Never persist password material into audit trail
    const clone: any = { ...value };
    delete clone.password;
    return JSON.stringify(clone).slice(0, 12000);
  } catch {
    return null;
  }
}

export async function writeAudit(db: mysql.Pool | mysql.PoolConnection, entry: AuditEntry): Promise<void> {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();

  const enrichedSql = `INSERT INTO audit_logs
    (id, userId, userName, action, targetEntity, targetId, details, timestamp, oldValue, newValue, ip, userAgent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const enrichedParams = [
    id,
    entry.userId || '',
    entry.userName || '',
    entry.action,
    entry.entity,
    entry.entityId || '',
    entry.details || '',
    timestamp,
    trimJson(entry.oldValue),
    trimJson(entry.newValue),
    entry.ip || '',
    entry.userAgent || '',
  ];

  try {
    await (db as any).query(enrichedSql, enrichedParams);
  } catch (err: any) {
    // Fallback for databases where Migration 004 has not been applied yet
    try {
      await (db as any).query(
        `INSERT INTO audit_logs
          (id, userId, userName, action, targetEntity, targetId, details, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        enrichedParams.slice(0, 8)
      );
    } catch (fallbackErr: any) {
      console.error('[Audit] Failed writing audit entry:', fallbackErr.message || fallbackErr);
    }
  }
}