import mysql from 'mysql2/promise';
import { hashPassword } from './db';

const CHUNK_SIZE = 100;

/**
 * Generic chunked batch upsert with Optimistic Locking protection.
 */
async function batchUpsert(
  conn: mysql.PoolConnection,
  tableName: string,
  columns: string[],
  rows: any[][],
  updateCols: string[],
  enableOptimisticLocking: boolean = true
) {
  if (rows.length === 0) return;

  const colList = columns.map((c) => `\`${c}\``).join(', ');
  
  // Optimistic Locking: if table has updatedAt column, guard updates against stale timestamps
  const hasUpdatedAt = updateCols.includes('updatedAt') || columns.includes('updatedAt');
  const updateList = updateCols.map((c) => {
    if (c === 'password') {
      return `\`${c}\`=IF(VALUES(\`${c}\`) != '' AND VALUES(\`${c}\`) IS NOT NULL, VALUES(\`${c}\`), \`${c}\`)`;
    }
    if (enableOptimisticLocking && hasUpdatedAt && c !== 'updatedAt') {
      return `\`${c}\`=IF(VALUES(\`updatedAt\`) >= \`updatedAt\` OR \`updatedAt\` IS NULL OR \`updatedAt\` = '' OR LENGTH(VALUES(\`updatedAt\`)) != LENGTH(\`updatedAt\`), VALUES(\`${c}\`), \`${c}\`)`;
    }
    return `\`${c}\`=VALUES(\`${c}\`)`;
  }).join(', ');

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const sql = `INSERT INTO \`${tableName}\` (${colList}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updateList};`;
    const flatValues = chunk.flat();

    await conn.query(sql, flatValues);
  }
}

export class SyncRepository {
  // ==========================================
  // USERS
  // ==========================================
  static async syncUsers(conn: mysql.PoolConnection, users: any[], convertBase64ToLocalFile: Function) {
    if (!Array.isArray(users) || users.length === 0) return;

    const columns = [
      'id', 'username', 'password', 'firstName', 'lastName', 'fullName', 'fatherName', 'shenasnamehNo', 'nationalId',
      'birthDate', 'gender', 'phone', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
      'bloodType', 'shoeSize', 'clothingSize', 'address', 'medicalConditions', 'referrerName', 'referrerPhone',
      'educationOrJob', 'climbingExperienceLevel', 'roles', 'activeRole', 'isActive', 'insuranceNumber',
      'insuranceExpiryDate', 'isInsuranceValid', 'baleChatId', 'avatarUrl', 'createdAt', 'updatedAt'
    ];

    const updateCols = [
      'username', 'password', 'firstName', 'lastName', 'fullName', 'fatherName', 'shenasnamehNo', 'nationalId',
      'birthDate', 'gender', 'phone', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
      'bloodType', 'shoeSize', 'clothingSize', 'address', 'medicalConditions', 'referrerName', 'referrerPhone',
      'educationOrJob', 'climbingExperienceLevel', 'roles', 'activeRole', 'isActive', 'insuranceNumber',
      'insuranceExpiryDate', 'isInsuranceValid', 'baleChatId', 'avatarUrl', 'updatedAt'
    ];

    const rows = await Promise.all(users.map(async (u) => {
      const avatarUrl = convertBase64ToLocalFile(u.avatarUrl, 'profile_image', u.nationalId || u.id);
      u.avatarUrl = avatarUrl;
      const pwd = u.password ? await hashPassword(u.password) : '';

      let rolesJson = '["athlete"]';
      if (Array.isArray(u.roles)) {
        rolesJson = JSON.stringify(u.roles);
      } else if (typeof u.roles === 'string') {
        try {
          const parsed = JSON.parse(u.roles);
          rolesJson = JSON.stringify(Array.isArray(parsed) ? parsed : [u.roles]);
        } catch {
          rolesJson = JSON.stringify(u.roles.includes(',') ? u.roles.split(',').map((s: string) => s.trim()) : [u.roles]);
        }
      }

      return [
        u.id,
        u.username || u.nationalId || u.id,
        pwd,
        u.firstName || '',
        u.lastName || '',
        u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'کاربر',
        u.fatherName || '',
        u.shenasnamehNo || '',
        u.nationalId || '',
        u.birthDate || '',
        u.gender || '',
        u.phone || '',
        u.emergencyContactName || '',
        u.emergencyContactRelation || '',
        u.emergencyContactPhone || '',
        u.bloodType || '',
        u.shoeSize || '',
        u.clothingSize || '',
        u.address || '',
        u.medicalConditions || '',
        u.referrerName || '',
        u.referrerPhone || '',
        u.educationOrJob || '',
        u.climbingExperienceLevel || '',
        rolesJson,
        u.activeRole || (Array.isArray(u.roles) && u.roles[0]) || 'athlete',
        u.isActive !== false ? 1 : 0,
        u.insuranceNumber || '',
        u.insuranceExpiryDate || '',
        u.isInsuranceValid ? 1 : 0,
        u.baleChatId || '',
        avatarUrl,
        u.createdAt || '',
        u.updatedAt || new Date().toISOString(),
      ];
    }));

    await batchUpsert(conn, 'users', columns, rows, updateCols, true);
  }

  static async findUserById(pool: mysql.Pool | mysql.PoolConnection, id: string) {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (rows && rows.length > 0) {
      const u = rows[0];
      return {
        ...u,
        roles: typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles,
        isActive: Boolean(u.isActive),
        isInsuranceValid: Boolean(u.isInsuranceValid),
      };
    }
    return null;
  }

  static async findUserByUsername(pool: mysql.Pool | mysql.PoolConnection, username: string) {
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE username = ? OR nationalId = ? LIMIT 1',
      [username, username]
    );
    if (rows && rows.length > 0) {
      const u = rows[0];
      return {
        ...u,
        roles: typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles,
        isActive: Boolean(u.isActive),
        isInsuranceValid: Boolean(u.isInsuranceValid),
      };
    }
    return null;
  }

  static async saveUser(pool: mysql.Pool | mysql.PoolConnection, u: any) {
    const pwd = u.password ? (u.password.startsWith('$2a$') || u.password.startsWith('$2b$') ? u.password : await hashPassword(u.password)) : '';
    const updatedAt = u.updatedAt || new Date().toISOString();
    let rolesJson = '["athlete"]';
    if (Array.isArray(u.roles)) {
      rolesJson = JSON.stringify(u.roles);
    } else if (typeof u.roles === 'string') {
      try {
        const parsed = JSON.parse(u.roles);
        rolesJson = JSON.stringify(Array.isArray(parsed) ? parsed : [u.roles]);
      } catch {
        rolesJson = JSON.stringify(u.roles.includes(',') ? u.roles.split(',').map((s: string) => s.trim()) : [u.roles]);
      }
    }
    await pool.query(
      `INSERT INTO users (
        id, username, password, firstName, lastName, fullName, fatherName, shenasnamehNo, nationalId,
        birthDate, gender, phone, emergencyContactName, emergencyContactRelation, emergencyContactPhone,
        bloodType, shoeSize, clothingSize, address, medicalConditions, referrerName, referrerPhone,
        educationOrJob, climbingExperienceLevel, roles, activeRole, isActive, insuranceNumber,
        insuranceExpiryDate, isInsuranceValid, baleChatId, avatarUrl, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username=VALUES(username),
        password=IF(VALUES(password) != '' AND VALUES(password) IS NOT NULL, VALUES(password), password),
        firstName=VALUES(firstName), lastName=VALUES(lastName),
        fullName=VALUES(fullName), fatherName=VALUES(fatherName), shenasnamehNo=VALUES(shenasnamehNo),
        nationalId=VALUES(nationalId), birthDate=VALUES(birthDate), gender=VALUES(gender), phone=VALUES(phone),
        emergencyContactName=VALUES(emergencyContactName), emergencyContactRelation=VALUES(emergencyContactRelation),
        emergencyContactPhone=VALUES(emergencyContactPhone), bloodType=VALUES(bloodType), shoeSize=VALUES(shoeSize),
        clothingSize=VALUES(clothingSize), address=VALUES(address), medicalConditions=VALUES(medicalConditions),
        referrerName=VALUES(referrerName), referrerPhone=VALUES(referrerPhone), educationOrJob=VALUES(educationOrJob),
        climbingExperienceLevel=VALUES(climbingExperienceLevel), roles=VALUES(roles), activeRole=VALUES(activeRole),
        isActive=VALUES(isActive), insuranceNumber=VALUES(insuranceNumber), insuranceExpiryDate=VALUES(insuranceExpiryDate),
        isInsuranceValid=VALUES(isInsuranceValid), baleChatId=VALUES(baleChatId), avatarUrl=VALUES(avatarUrl),
        updatedAt=VALUES(updatedAt);`,
      [
        u.id,
        u.username || u.nationalId || u.id,
        pwd,
        u.firstName || '',
        u.lastName || '',
        u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'کاربر',
        u.fatherName || '',
        u.shenasnamehNo || '',
        u.nationalId || '',
        u.birthDate || '',
        u.gender || '',
        u.phone || '',
        u.emergencyContactName || '',
        u.emergencyContactRelation || '',
        u.emergencyContactPhone || '',
        u.bloodType || '',
        u.shoeSize || '',
        u.clothingSize || '',
        u.address || '',
        u.medicalConditions || '',
        u.referrerName || '',
        u.referrerPhone || '',
        u.educationOrJob || '',
        u.climbingExperienceLevel || '',
        rolesJson,
        u.activeRole || (Array.isArray(u.roles) && u.roles[0]) || 'athlete',
        u.isActive !== false ? 1 : 0,
        u.insuranceNumber || '',
        u.insuranceExpiryDate || '',
        u.isInsuranceValid ? 1 : 0,
        u.baleChatId || '',
        u.avatarUrl || '',
        u.createdAt || new Date().toISOString(),
        updatedAt,
      ]
    );
  }

  static async deleteUser(pool: mysql.Pool | mysql.PoolConnection, id: string) {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Optimistic locking update for a single user via direct REST (PUT/PATCH).
   * Uses `version = version + 1 ... WHERE id = ? AND version = ?` to prevent
   * lost updates when two clients edit the same row concurrently.
   * Returns the number of affected rows: 0 => stale version (HTTP 409).
   */
  static async updateUserVersioned(
    pool: mysql.Pool | mysql.PoolConnection,
    u: any,
    expectedVersion: number
  ): Promise<number> {
    const pwd = u.password ? (u.password.startsWith('$2a$') || u.password.startsWith('$2b$') ? u.password : await hashPassword(u.password)) : '';
    const updatedAt = u.updatedAt || new Date().toISOString();

    let rolesJson = '["athlete"]';
    if (Array.isArray(u.roles)) {
      rolesJson = JSON.stringify(u.roles);
    } else if (typeof u.roles === 'string') {
      try {
        const parsed = JSON.parse(u.roles);
        rolesJson = JSON.stringify(Array.isArray(parsed) ? parsed : [u.roles]);
      } catch {
        rolesJson = JSON.stringify(u.roles.includes(',') ? u.roles.split(',').map((s: string) => s.trim()) : [u.roles]);
      }
    }

    const [result]: any = await pool.query(
      `UPDATE users SET
        username=?, 
        password=IF(? IS NULL OR ? = '', password, ?),
        firstName=?, lastName=?, fullName=?, fatherName=?, shenasnamehNo=?, nationalId=?,
        birthDate=?, gender=?, phone=?, emergencyContactName=?, emergencyContactRelation=?, emergencyContactPhone=?,
        bloodType=?, shoeSize=?, clothingSize=?, address=?, medicalConditions=?, referrerName=?, referrerPhone=?,
        educationOrJob=?, climbingExperienceLevel=?, roles=?, activeRole=?, isActive=?, insuranceNumber=?,
        insuranceExpiryDate=?, isInsuranceValid=?, baleChatId=?, avatarUrl=?, updatedAt=?, version = version + 1
       WHERE id = ? AND version = ?`,
      [
        u.username || u.nationalId || u.id,
        pwd || null,
        pwd || '',
        pwd,
        u.firstName || '',
        u.lastName || '',
        u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'کاربر',
        u.fatherName || '',
        u.shenasnamehNo || '',
        u.nationalId || '',
        u.birthDate || '',
        u.gender || '',
        u.phone || '',
        u.emergencyContactName || '',
        u.emergencyContactRelation || '',
        u.emergencyContactPhone || '',
        u.bloodType || '',
        u.shoeSize || '',
        u.clothingSize || '',
        u.address || '',
        u.medicalConditions || '',
        u.referrerName || '',
        u.referrerPhone || '',
        u.educationOrJob || '',
        u.climbingExperienceLevel || '',
        rolesJson,
        u.activeRole || (Array.isArray(u.roles) && u.roles[0]) || 'athlete',
        u.isActive !== false ? 1 : 0,
        u.insuranceNumber || '',
        u.insuranceExpiryDate || '',
        u.isInsuranceValid ? 1 : 0,
        u.baleChatId || '',
        u.avatarUrl || '',
        updatedAt,
        u.id,
        expectedVersion,
      ]
    );

    return result?.affectedRows || 0;
  }

  static async userExists(pool: mysql.Pool | mysql.PoolConnection, id: string): Promise<boolean> {
    const [rows]: any = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    return Array.isArray(rows) && rows.length > 0;
  }

  // ==========================================
  // ROLES
  // ==========================================
  static async syncRoles(conn: mysql.PoolConnection, roles: any[]) {
    if (!Array.isArray(roles) || roles.length === 0) return;

    const columns = ['id', 'key_name', 'title', 'description', 'permissions', 'isSystem'];
    const updateCols = ['title', 'description', 'permissions'];

    const rows = roles.map((r) => [
      r.id,
      r.key || r.key_name || r.id,
      r.title || '',
      r.description || '',
      JSON.stringify(r.permissions || []),
      r.isSystem ? 1 : 0,
    ]);

    await batchUpsert(conn, 'roles', columns, rows, updateCols);
  }

  // ==========================================
  // LINKS (Parent - Athlete)
  // ==========================================
  static async syncLinks(conn: mysql.PoolConnection, links: any[]) {
    if (!Array.isArray(links) || links.length === 0) return;

    const columns = ['id', 'parentId', 'athleteId', 'relationType', 'createdAt'];
    const updateCols = ['relationType'];

    const rows = links.map((l) => [
      l.id,
      l.parentId,
      l.athleteId,
      l.relationType || 'parent',
      l.createdAt || '',
    ]);

    await batchUpsert(conn, 'parent_athlete_links', columns, rows, updateCols);
  }

  // ==========================================
  // PRE-REGISTRATIONS
  // ==========================================
  static async syncPreRegistrations(conn: mysql.PoolConnection, preRegistrations: any[], convertBase64ToLocalFile: Function) {
    if (!Array.isArray(preRegistrations) || preRegistrations.length === 0) return;

    const columns = [
      'id', 'firstName', 'lastName', 'fullName', 'fatherName', 'shenasnamehNo', 'nationalId', 'birthDate', 'gender',
      'isUnder18', 'phone', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
      'bloodType', 'shoeSize', 'clothingSize', 'address', 'medicalConditions', 'educationOrJob', 'referrerName',
      'referrerPhone', 'climbingExperienceLevel', 'insuranceNumber', 'parentFullName', 'parentNationalId',
      'parentPhone', 'avatarUrl', 'status', 'rejectionReason', 'assignedRoles', 'createdUserId', 'createdAt', 'reviewedAt', 'reviewedBy'
    ];

    const updateCols = ['status', 'rejectionReason', 'assignedRoles', 'createdUserId', 'reviewedAt', 'reviewedBy'];

    const rows = preRegistrations.map((pr) => {
      const avatarUrl = convertBase64ToLocalFile(pr.avatarUrl, 'profile_image', pr.nationalId || pr.id);
      pr.avatarUrl = avatarUrl;

      return [
        pr.id,
        pr.firstName || '',
        pr.lastName || '',
        pr.fullName || `${pr.firstName || ''} ${pr.lastName || ''}`.trim() || 'پیش‌ثبت‌نام',
        pr.fatherName || '',
        pr.shenasnamehNo || '',
        pr.nationalId || '',
        pr.birthDate || '',
        pr.gender || '',
        pr.isUnder18 ? 1 : 0,
        pr.phone || '',
        pr.emergencyContactName || '',
        pr.emergencyContactRelation || '',
        pr.emergencyContactPhone || '',
        pr.bloodType || '',
        pr.shoeSize || '',
        pr.clothingSize || '',
        pr.address || '',
        pr.medicalConditions || '',
        pr.educationOrJob || '',
        pr.referrerName || '',
        pr.referrerPhone || '',
        pr.climbingExperienceLevel || '',
        pr.insuranceNumber || '',
        pr.parentFullName || '',
        pr.parentNationalId || '',
        pr.parentPhone || '',
        avatarUrl,
        pr.status || 'pending',
        pr.rejectionReason || '',
        JSON.stringify(pr.assignedRoles || ['athlete']),
        pr.createdUserId || '',
        pr.createdAt || '',
        pr.reviewedAt || '',
        pr.reviewedBy || '',
      ];
    });

    await batchUpsert(conn, 'pre_registrations', columns, rows, updateCols);
  }

  // ==========================================
  // CLUB SETTINGS
  // ==========================================
  static async syncClubSettings(conn: mysql.PoolConnection, settings: any) {
    if (!settings || typeof settings !== 'object') return;

    const s = { ...settings };
    const cleanS = { ...settings };
    delete cleanS.name;
    delete cleanS.slogan;
    delete cleanS.logoIcon;
    delete cleanS.logo_Icon;
    delete cleanS.logo_icon;
    delete cleanS.themePalette;
    delete cleanS.theme_Palette;
    delete cleanS.theme_palette;

    const logo = s.logoIcon || s.logo_Icon || s.logo_icon || 'mountain';
    const theme = s.themePalette || s.theme_Palette || s.theme_palette || 'teal';
    const settingsJson = JSON.stringify(cleanS);
    const updatedAt = new Date().toISOString();

    try {
      // Check existing columns to avoid duplicate column name collisions
      const [colRows]: any = await conn.query('SHOW COLUMNS FROM `club_settings`');
      const colMap = new Map<string, string>();
      for (const r of colRows || []) {
        colMap.set(r.Field.toLowerCase(), r.Field);
      }

      const insertCols: string[] = ['`id`'];
      const values: any[] = ['1'];
      const updateList: string[] = [];

      const addCol = (colName: string, val: any) => {
        const lower = colName.toLowerCase();
        if (colMap.has(lower)) {
          const actualCol = colMap.get(lower)!;
          insertCols.push(`\`${actualCol}\``);
          values.push(val);
          updateList.push(`\`${actualCol}\`=VALUES(\`${actualCol}\`)`);
        }
      };

      addCol('name', s.name || 'باشگاه سنگ‌نوردی موج');
      addCol('slogan', s.slogan || '');
      addCol('logo_Icon', logo);
      addCol('theme_Palette', theme);
      addCol('settings_json', settingsJson);
      addCol('updatedAt', updatedAt);
      addCol('smsApiKey', s.smsApiKey || '');
      addCol('smsLineNumber', s.smsLineNumber || '');
      addCol('smsSignature', s.smsSignature || '');
      addCol('baleBotToken', s.baleBotToken || '');
      addCol('baleChannelOrChatId', s.baleChannelOrChatId || '');

      const placeholders = insertCols.map(() => '?').join(', ');
      const sql = `INSERT INTO \`club_settings\` (${insertCols.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateList.join(', ')};`;
      await conn.query(sql, values);
    } catch (e: any) {
      // Safe fallback with standard single casing columns
      await conn.query(
        `INSERT INTO \`club_settings\` (\`id\`, \`name\`, \`slogan\`, \`logo_Icon\`, \`theme_Palette\`, \`settings_json\`, \`updatedAt\`)
         VALUES ('1', ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           \`name\`=VALUES(\`name\`), \`slogan\`=VALUES(\`slogan\`), \`logo_Icon\`=VALUES(\`logo_Icon\`),
           \`theme_Palette\`=VALUES(\`theme_Palette\`), \`settings_json\`=VALUES(\`settings_json\`), \`updatedAt\`=VALUES(\`updatedAt\`);`,
        [s.name || 'باشگاه سنگ‌نوردی موج', s.slogan || '', logo, theme, settingsJson, updatedAt]
      );
    }
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  static async syncProducts(conn: mysql.PoolConnection, products: any[], convertBase64ToLocalFile: Function) {
    if (!Array.isArray(products) || products.length === 0) return;

    const columns = [
      'id', 'code', 'name', 'category', 'price', 'buyPrice', 'stock', 'minStock', 'minStockAlert',
      'unit', 'imageUrl', 'description', 'isActive', 'createdAt', 'updatedAt'
    ];

    const updateCols = [
      'code', 'name', 'category', 'price', 'buyPrice', 'stock', 'minStock', 'minStockAlert',
      'unit', 'imageUrl', 'description', 'isActive', 'updatedAt'
    ];

    const rows = products.map((p) => {
      const imageUrl = convertBase64ToLocalFile(p.imageUrl, 'product_image', p.id);
      p.imageUrl = imageUrl;

      return [
        p.id,
        p.code || '',
        p.name || '',
        p.category || '',
        p.price ?? 0,
        p.buyPrice ?? p.buy_price ?? 0,
        p.stock ?? 0,
        p.minStock ?? p.minStockAlert ?? 5,
        p.minStockAlert ?? p.minStock ?? 5,
        p.unit || '',
        imageUrl,
        p.description || '',
        p.isActive !== false ? 1 : 0,
        p.createdAt || '',
        p.updatedAt || new Date().toISOString(),
      ];
    });

    await batchUpsert(conn, 'products', columns, rows, updateCols, true);
  }

  // ==========================================
  // COURSES / SESSIONS
  // ==========================================
  static async syncCourses(conn: mysql.PoolConnection, courses: any[]) {
    if (!Array.isArray(courses) || courses.length === 0) return;

    const columns = [
      'id', 'title', 'sportType', 'coachId', 'coachName', 'daysOfWeek', 'startTime', 'endTime',
      'capacity', 'monthlyFee', 'isActive', 'description', 'startDate', 'endDate', 'registrationDeadline', 'level', 'locationRoom', 'createdAt'
    ];

    const updateCols = [
      'title', 'sportType', 'coachId', 'coachName', 'daysOfWeek', 'startTime', 'endTime',
      'capacity', 'monthlyFee', 'isActive', 'description', 'startDate', 'endDate', 'registrationDeadline', 'level', 'locationRoom'
    ];

    const rows = courses.map((c) => [
      c.id,
      c.title || '',
      c.sportType || c.category || '',
      c.coachId || '',
      c.coachName || '',
      JSON.stringify(c.daysOfWeek || []),
      c.startTime || '',
      c.endTime || '',
      c.capacity || c.maxCapacity || 20,
      c.monthlyFee || 0,
      c.isActive !== false ? 1 : 0,
      c.description || '',
      c.startDate || '',
      c.endDate || '',
      c.registrationDeadline || '',
      c.level || '',
      c.locationRoom || '',
      c.createdAt || '',
    ]);

    await batchUpsert(conn, 'courses', columns, rows, updateCols);
  }

  // ==========================================
  // ENROLLMENTS
  // ==========================================
  static async syncEnrollments(conn: mysql.PoolConnection, enrollments: any[], convertBase64ToLocalFile: Function) {
    if (!Array.isArray(enrollments) || enrollments.length === 0) return;

    const columns = [
      'id', 'sessionId', 'userId', 'athleteName', 'athletePhone', 'athleteNationalId', 'status',
      'paymentStatus', 'trackingNumber', 'receiptUrl', 'receiptFileName', 'paymentMethod',
      'enrolledAt', 'expireDate', 'startDate', 'endDate', 'totalSessionsAllowed', 'usedSessionsCount', 'priceAtEnrollment'
    ];

    const updateCols = [
      'status', 'paymentStatus', 'paymentMethod', 'trackingNumber', 'receiptUrl', 'receiptFileName',
      'enrolledAt', 'expireDate', 'startDate', 'endDate', 'totalSessionsAllowed', 'usedSessionsCount', 'priceAtEnrollment'
    ];

    const rows = enrollments.map((e) => {
      const receiptUrl = convertBase64ToLocalFile(e.receiptUrl, 'receipt', e.athleteNationalId || e.id);
      e.receiptUrl = receiptUrl;

      const startDate = (e.startDate || e.enrolledAt || '').trim();
      const endDate = (e.endDate || e.expireDate || '').trim();

      return [
        e.id,
        e.sessionId || '',
        e.userId || '',
        e.athleteName || '',
        e.athletePhone || '',
        e.athleteNationalId || '',
        e.status || 'active',
        e.paymentStatus || 'paid',
        e.trackingNumber || '',
        receiptUrl,
        e.receiptFileName || '',
        e.paymentMethod || '',
        startDate,
        endDate,
        startDate,
        endDate,
        Number(e.totalSessionsAllowed) || 12,
        Number(e.usedSessionsCount) || 0,
        Number(e.priceAtEnrollment) || 0,
      ];
    });

    await batchUpsert(conn, 'enrollments', columns, rows, updateCols);
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================
  static async syncTransactions(conn: mysql.PoolConnection, transactions: any[], convertBase64ToLocalFile: Function) {
    if (!Array.isArray(transactions) || transactions.length === 0) return;

    const columns = [
      'id', 'userId', 'userName', 'userNationalId', 'amount', 'type', 'method', 'trackingNumber',
      'receiptUrl', 'receiptFileName', 'description', 'status', 'createdAt', 'createdBy'
    ];

    const updateCols = ['amount', 'type', 'method', 'trackingNumber', 'receiptUrl', 'description', 'status'];

    const rows = transactions.map((t) => {
      const receiptUrl = convertBase64ToLocalFile(t.receiptUrl, 'receipt', t.userNationalId || t.id);
      t.receiptUrl = receiptUrl;

      return [
        t.id,
        t.userId || '',
        t.userName || '',
        t.userNationalId || '',
        t.amount ?? 0,
        t.type || '',
        t.method || '',
        t.trackingNumber || '',
        receiptUrl,
        t.receiptFileName || '',
        t.description || '',
        t.status || '',
        t.createdAt || '',
        t.createdBy || '',
      ];
    });

    await batchUpsert(conn, 'transactions', columns, rows, updateCols);
  }

  // ==========================================
  // SUPPORT TICKETS
  // ==========================================
  static async syncSupportTickets(conn: mysql.PoolConnection, tickets: any[]) {
    if (!Array.isArray(tickets) || tickets.length === 0) return;

    const columns = [
      'id', 'ticketNumber', 'userId', 'userName', 'userNationalId', 'userRole', 'userPhone',
      'subject', 'department', 'priority', 'status', 'lastResponseAt', 'hasUnreadAdminMessage', 'hasUnreadUserMessage', 'createdAt', 'messages'
    ];

    const updateCols = ['status', 'messages', 'lastResponseAt', 'hasUnreadAdminMessage', 'hasUnreadUserMessage'];

    const rows = tickets.map((t) => [
      t.id,
      t.ticketNumber || t.id,
      t.userId || '',
      t.userName || '',
      t.userNationalId || '',
      t.userRole || '',
      t.userPhone || '',
      t.subject || '',
      t.department || t.category || '',
      t.priority || 'medium',
      t.status || 'open',
      t.lastResponseAt || '',
      t.hasUnreadAdminMessage ? 1 : 0,
      t.hasUnreadUserMessage ? 1 : 0,
      t.createdAt || '',
      JSON.stringify(t.messages || []),
    ]);

    await batchUpsert(conn, 'support_tickets', columns, rows, updateCols);
  }

  // ==========================================
  // DEBTORS & CREDITORS
  // ==========================================
  static async syncDebtors(conn: mysql.PoolConnection, debtors: any[]) {
    if (!Array.isArray(debtors) || debtors.length === 0) return;

    const columns = ['id', 'userId', 'fullName', 'nationalId', 'phone', 'category', 'categoryTitle', 'amount', 'dueDate', 'status', 'notes', 'createdAt'];
    const updateCols = ['amount', 'dueDate', 'status', 'notes'];

    const rows = debtors.map((d) => [
      d.id,
      d.userId || '',
      d.fullName || '',
      d.nationalId || '',
      d.phone || '',
      d.category || '',
      d.categoryTitle || '',
      d.amount ?? 0,
      d.dueDate || '',
      d.status || 'unpaid',
      d.notes || '',
      d.createdAt || '',
    ]);

    await batchUpsert(conn, 'debtors', columns, rows, updateCols);
  }

  static async syncCreditors(conn: mysql.PoolConnection, creditors: any[]) {
    if (!Array.isArray(creditors) || creditors.length === 0) return;

    const columns = ['id', 'creditorName', 'category', 'categoryTitle', 'contactPhone', 'ibanNumber', 'amount', 'dueDate', 'status', 'notes', 'createdAt'];
    const updateCols = ['creditorName', 'amount', 'dueDate', 'status', 'notes'];

    const rows = creditors.map((c) => [
      c.id,
      c.creditorName || '',
      c.category || '',
      c.categoryTitle || '',
      c.contactPhone || '',
      c.ibanNumber || '',
      c.amount ?? 0,
      c.dueDate || '',
      c.status || 'unpaid',
      c.notes || '',
      c.createdAt || '',
    ]);

    await batchUpsert(conn, 'creditors', columns, rows, updateCols);
  }

  // ==========================================
  // INSURANCE REQUESTS
  // ==========================================
  static async syncInsuranceRequests(conn: mysql.PoolConnection, insuranceRequests: any[], convertBase64ToLocalFile: Function) {
    if (!Array.isArray(insuranceRequests) || insuranceRequests.length === 0) return;

    const columns = ['id', 'userId', 'userName', 'userNationalId', 'insuranceNumber', 'startDate', 'expiryDate', 'documentUrl', 'fileName', 'status', 'rejectionReason', 'createdAt', 'reviewedAt', 'reviewedBy'];
    const updateCols = ['status', 'insuranceNumber', 'rejectionReason', 'reviewedAt', 'reviewedBy'];

    const rows = insuranceRequests.map((ins) => {
      const rawDoc = ins.documentUrl || ins.insuranceCardUrl || '';
      const docUrl = convertBase64ToLocalFile(rawDoc, 'document', ins.userNationalId || ins.id);
      ins.documentUrl = docUrl;

      return [
        ins.id,
        ins.userId || '',
        ins.userName || '',
        ins.userNationalId || '',
        ins.insuranceNumber || '',
        ins.startDate || '',
        ins.expiryDate || '',
        docUrl,
        ins.fileName || '',
        ins.status || 'pending',
        ins.rejectionReason || '',
        ins.createdAt || '',
        ins.reviewedAt || '',
        ins.reviewedBy || '',
      ];
    });

    await batchUpsert(conn, 'insurance_requests', columns, rows, updateCols);
  }

  // ==========================================
  // ATTENDANCE RECORDS
  // ==========================================
  static async syncAttendanceRecords(conn: mysql.PoolConnection, attendanceRecords: any[]) {
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) return;

    const columns = ['id', 'sessionId', 'date', 'userId', 'userName', 'status', 'reason', 'recordedBy', 'recordedAt'];
    const updateCols = ['status', 'reason', 'recordedBy', 'recordedAt'];

    const rows = attendanceRecords.map((att) => [
      att.id,
      att.sessionId || '',
      att.date || '',
      att.userId || '',
      att.userName || '',
      att.status || 'present',
      att.reason || '',
      att.recordedBy || '',
      att.recordedAt || '',
    ]);

    await batchUpsert(conn, 'attendance_records', columns, rows, updateCols);
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  static async syncNotifications(conn: mysql.PoolConnection, notifications: any[]) {
    if (!Array.isArray(notifications) || notifications.length === 0) return;

    const columns = ['id', 'userId', 'targetAudience', 'title', 'message', 'category', 'isRead', 'actionLink', 'createdAt'];
    const updateCols = ['isRead'];

    const rows = notifications.map((n) => [
      n.id,
      n.userId || '',
      n.targetAudience || 'all',
      n.title || '',
      n.message || '',
      n.category || 'system',
      n.isRead ? 1 : 0,
      n.actionLink || '',
      n.createdAt || '',
    ]);

    await batchUpsert(conn, 'app_notifications', columns, rows, updateCols);
  }

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================
  static async syncAnnouncements(conn: mysql.PoolConnection, announcements: any[]) {
    if (!Array.isArray(announcements) || announcements.length === 0) return;

    const columns = ['id', 'title', 'subtitle', 'imageUrl', 'discountTag', 'startDate', 'endDate', 'isActive', 'targetAudience', 'createdAt'];
    const updateCols = ['title', 'subtitle', 'imageUrl', 'discountTag', 'startDate', 'endDate', 'isActive', 'targetAudience'];

    const rows = announcements.map((a) => [
      a.id,
      a.title || '',
      a.subtitle || a.text || '',
      a.imageUrl || '',
      a.discountTag || '',
      a.startDate || a.date || '',
      a.endDate || '',
      a.isActive !== false ? 1 : 0,
      a.targetAudience || a.targetRole || 'all',
      a.createdAt || a.date || '',
    ]);

    await batchUpsert(conn, 'club_announcements', columns, rows, updateCols);
  }

  // ==========================================
  // SHOP INVOICES
  // ==========================================
  static async syncShopInvoices(conn: mysql.PoolConnection, shopInvoices: any[]) {
    if (!Array.isArray(shopInvoices) || shopInvoices.length === 0) return;

    const invoiceCols = ['id', 'invoiceNumber', 'athleteId', 'athleteName', 'creatorId', 'creatorName', 'date', 'items', 'totalAmount', 'paymentMethod', 'paymentStatus', 'notes', 'createdAt'];
    const invoiceUpdateCols = ['invoiceNumber', 'athleteId', 'athleteName', 'creatorId', 'creatorName', 'date', 'items', 'totalAmount', 'paymentMethod', 'paymentStatus', 'notes'];

    const invoiceRows = shopInvoices.map((inv) => [
      inv.id,
      inv.invoiceNumber || '',
      inv.athleteId || '',
      inv.athleteName || '',
      inv.creatorId || '',
      inv.creatorName || '',
      inv.date || '',
      JSON.stringify(inv.items || []),
      inv.totalAmount ?? 0,
      inv.paymentMethod || '',
      inv.paymentStatus || '',
      inv.notes || '',
      inv.createdAt || '',
    ]);

    await batchUpsert(conn, 'shop_invoices', invoiceCols, invoiceRows, invoiceUpdateCols);

    const invoiceIds = shopInvoices.map((inv) => inv.id).filter(Boolean);
    if (invoiceIds.length > 0) {
      const placeholders = invoiceIds.map(() => '?').join(', ');
      await conn.query(`DELETE FROM shop_invoice_items WHERE invoiceId IN (${placeholders})`, invoiceIds).catch(() => {});
    }

    const allItemRows: any[][] = [];
    for (const inv of shopInvoices) {
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        inv.items.forEach((item: any) => {
          allItemRows.push([
            item.id || `${inv.id}-${item.productId}`,
            inv.id,
            item.productId || '',
            item.productName || '',
            item.category || '',
            item.unitPrice ?? 0,
            item.buyPrice ?? 0,
            item.quantity ?? 0,
            item.totalPrice ?? 0,
          ]);
        });
      }
    }

    if (allItemRows.length > 0) {
      const itemCols = ['id', 'invoiceId', 'productId', 'productName', 'category', 'unitPrice', 'buyPrice', 'quantity', 'totalPrice'];
      const itemUpdateCols = ['productName', 'category', 'unitPrice', 'buyPrice', 'quantity', 'totalPrice'];
      await batchUpsert(conn, 'shop_invoice_items', itemCols, allItemRows, itemUpdateCols);
    }
  }

  // ==========================================
  // SMS & AUDIT LOGS
  // ==========================================
  static async syncSmsLogs(conn: mysql.PoolConnection, smsLogs: any[]) {
    if (!Array.isArray(smsLogs) || smsLogs.length === 0) return;

    const columns = ['id', 'recipients', 'recipientNames', 'message', 'channel', 'type', 'targetGroup', 'status', 'cost', 'packId', 'messageIds', 'sentBy', 'sentAt', 'errorMessage'];
    const updateCols = ['channel', 'status', 'cost', 'packId', 'messageIds', 'errorMessage'];

    const rows = smsLogs.map((log) => [
      log.id,
      JSON.stringify(log.recipients || []),
      JSON.stringify(log.recipientNames || []),
      log.message || '',
      log.channel || 'sms',
      log.type || 'bulk',
      log.targetGroup || 'custom',
      log.status || 'sent',
      log.cost || 0,
      log.packId || '',
      JSON.stringify(log.messageIds || []),
      log.sentBy || 'سیستم',
      log.sentAt || '',
      log.errorMessage || '',
    ]);

    await batchUpsert(conn, 'sms_logs', columns, rows, updateCols);
  }

  static async syncAuditLogs(conn: mysql.PoolConnection, auditLogs: any[]) {
    if (!Array.isArray(auditLogs) || auditLogs.length === 0) return;

    const columns = ['id', 'userId', 'userName', 'action', 'targetEntity', 'targetId', 'details', 'timestamp'];
    const updateCols = ['details'];

    const rows = auditLogs.map((a) => [
      a.id,
      a.userId || '',
      a.userName || '',
      a.action || '',
      a.targetEntity || '',
      a.targetId || '',
      a.details || '',
      a.timestamp || '',
    ]);

    await batchUpsert(conn, 'audit_logs', columns, rows, updateCols);
  }

  static async hashAllLegacyPasswords(pool: mysql.Pool | mysql.PoolConnection) {
    try {
      const [rows]: any = await pool.query('SELECT id, username, nationalId, password FROM users');
      if (!Array.isArray(rows)) return { total: 0, updated: 0 };
      let updatedCount = 0;
      for (const u of rows) {
        const rawPwd = u.password || u.nationalId || u.username || '123';
        if (!rawPwd.startsWith('$2a$') && !rawPwd.startsWith('$2b$')) {
          const hashed = await hashPassword(rawPwd);
          await pool.query('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [
            hashed,
            new Date().toISOString(),
            u.id,
          ]);
          updatedCount++;
        }
      }
      return { total: rows.length, updated: updatedCount };
    } catch (err) {
      console.error('[Hash All Passwords Error]', err);
      throw err;
    }
  }
}
