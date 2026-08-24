import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

let pool: mysql.Pool | null = null;
let currentConfig: DbConfig | null = null;

// Read config file if present
export function loadSavedConfig(): DbConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (data) {
        if (data.db) return data.db as DbConfig;
        if (data.host && data.database) {
          return {
            host: data.host,
            port: Number(data.port) || 3306,
            user: data.user || process.env.DB_USER || '',
            password: data.password || process.env.DB_PASSWORD || '',
            database: data.database || process.env.DB_NAME || '',
          };
        }
      }
    }
  } catch (err) {
    console.error('[Config] Error reading config.json:', err);
  }

  // Fallback to environment variables or empty defaults (never hardcode credentials)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  };
}

export function saveConfig(dbConfig: DbConfig) {
  const configData = {
    installed: true,
    installedAt: new Date().toISOString(),
    db: dbConfig,
  };
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configData, null, 2), 'utf-8');
  console.log('[Config] Config saved to config.json');
}

export function isInstalled(): boolean {
  return true;
}

export function resetInstallation() {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    fs.unlinkSync(CONFIG_FILE_PATH);
  }
  if (pool) {
    pool.end();
    pool = null;
  }
  currentConfig = null;
}

export function getMySqlPool(customConfig?: DbConfig): mysql.Pool {
  const cfg = customConfig || loadSavedConfig() || {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_climbing',
  };

  if (!pool || JSON.stringify(currentConfig) !== JSON.stringify(cfg)) {
    if (pool) {
      pool.end();
    }
    currentConfig = cfg;
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password || '',
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      charset: 'utf8mb4',
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 5000,
      multipleStatements: true,
    });
  }
  return pool;
}

export async function testMySqlConnection(config?: DbConfig): Promise<{ success: boolean; message: string }> {
  try {
    const targetConfig = config || loadSavedConfig();
    if (!targetConfig) {
      return { success: false, message: 'تنظیمات دیتابیس MySQL یافت نشد.' };
    }

    // Connect without selecting database first to check server connectivity
    const connection = await mysql.createConnection({
      host: targetConfig.host,
      port: targetConfig.port,
      user: targetConfig.user,
      password: targetConfig.password || '',
      connectTimeout: 8000,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${targetConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.changeUser({ database: targetConfig.database });
    await connection.query('SELECT 1 as result');
    await connection.end();

    return { success: true, message: `اتصال به MySQL و دیتابیس ${targetConfig.database} با موفقیت انجام شد.` };
  } catch (err: any) {
    if (err.code !== 'ECONNREFUSED') {
      console.error('MySQL Connection Error:', err);
    }
    return { success: false, message: err.message || 'خطا در برقراری ارتباط با MySQL' };
  }
}

export async function dropAllTables(pool: mysql.Pool) {
  const tables = [
    'roles',
    'users',
    'parent_athlete_links',
    'audit_logs',
    'pre_registrations',
    'club_settings',
    'club_announcements',
    'courses',
    'enrollments',
    'transactions',
    'attendance_records',
    'debtors',
    'creditors',
    'insurance_requests',
    'support_tickets',
    'app_notifications',
    'products',
    'shop_invoice_items',
    'shop_invoices',
    'sms_logs'
  ];

  console.log('[Database] Dropping existing tables as requested...');
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await pool.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('[Database] All existing tables dropped successfully.');
}

export async function initializeTables(pool: mysql.Pool) {
  // 1. Roles table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(100) PRIMARY KEY,
      key_name VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      permissions JSON,
      isSystem TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(100) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      firstName VARCHAR(255),
      lastName VARCHAR(255),
      fullName VARCHAR(255) NOT NULL,
      fatherName VARCHAR(255),
      shenasnamehNo VARCHAR(50),
      nationalId VARCHAR(20),
      birthDate VARCHAR(50),
      gender VARCHAR(20),
      phone VARCHAR(20),
      emergencyContactName VARCHAR(255),
      emergencyContactRelation VARCHAR(100),
      emergencyContactPhone VARCHAR(20),
      bloodType VARCHAR(20),
      shoeSize VARCHAR(20),
      clothingSize VARCHAR(20),
      address TEXT,
      medicalConditions TEXT,
      referrerName VARCHAR(255),
      referrerPhone VARCHAR(20),
      educationOrJob VARCHAR(255),
      climbingExperienceLevel VARCHAR(50),
      roles JSON,
      activeRole VARCHAR(50) DEFAULT 'athlete',
      isActive TINYINT(1) DEFAULT 1,
      insuranceNumber VARCHAR(100),
      insuranceExpiryDate VARCHAR(50),
      isInsuranceValid TINYINT(1) DEFAULT 0,
      baleChatId VARCHAR(100),
      avatarUrl LONGTEXT,
      createdAt VARCHAR(100),
      updatedAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Parent-Athlete Links table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS parent_athlete_links (
      id VARCHAR(100) PRIMARY KEY,
      parentId VARCHAR(100) NOT NULL,
      athleteId VARCHAR(100) NOT NULL,
      relationType VARCHAR(50) NOT NULL,
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Audit Logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(100) PRIMARY KEY,
      userId VARCHAR(100),
      userName VARCHAR(255),
      action VARCHAR(255),
      targetEntity VARCHAR(100),
      targetId VARCHAR(100),
      details TEXT,
      timestamp VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Pre-Registrations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pre_registrations (
      id VARCHAR(100) PRIMARY KEY,
      firstName VARCHAR(255),
      lastName VARCHAR(255),
      fullName VARCHAR(255) NOT NULL,
      fatherName VARCHAR(255),
      shenasnamehNo VARCHAR(50),
      nationalId VARCHAR(20) NOT NULL,
      birthDate VARCHAR(50),
      gender VARCHAR(20),
      isUnder18 TINYINT(1) DEFAULT 0,
      phone VARCHAR(20) NOT NULL,
      emergencyContactName VARCHAR(255),
      emergencyContactRelation VARCHAR(100),
      emergencyContactPhone VARCHAR(20),
      bloodType VARCHAR(20),
      shoeSize VARCHAR(20),
      clothingSize VARCHAR(20),
      address TEXT,
      medicalConditions TEXT,
      educationOrJob VARCHAR(255),
      referrerName VARCHAR(255),
      referrerPhone VARCHAR(20),
      climbingExperienceLevel VARCHAR(50),
      insuranceNumber VARCHAR(100),
      parentFullName VARCHAR(255),
      parentNationalId VARCHAR(20),
      parentPhone VARCHAR(20),
      avatarUrl LONGTEXT,
      status VARCHAR(50) DEFAULT 'pending',
      rejectionReason TEXT,
      assignedRoles JSON,
      createdUserId VARCHAR(100),
      createdAt VARCHAR(100),
      reviewedAt VARCHAR(100),
      reviewedBy VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Club Settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS club_settings (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255),
      slogan VARCHAR(255),
      logo_Icon VARCHAR(100),
      theme_Palette VARCHAR(50),
      smsApiKey VARCHAR(255),
      smsLineNumber VARCHAR(50),
      smsSignature VARCHAR(100),
      baleBotToken VARCHAR(255),
      baleChannelOrChatId VARCHAR(100),
      settings_json LONGTEXT,
      updatedAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. Club Announcements & Sliders table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS club_announcements (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subtitle TEXT,
      imageUrl LONGTEXT,
      discountTag VARCHAR(100),
      startDate VARCHAR(100),
      endDate VARCHAR(100),
      isActive TINYINT(1) DEFAULT 1,
      targetAudience VARCHAR(50) DEFAULT 'all',
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Courses / Sessions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      sportType VARCHAR(100),
      coachId VARCHAR(100),
      coachName VARCHAR(255),
      daysOfWeek JSON,
      startTime VARCHAR(50),
      endTime VARCHAR(50),
      capacity INT DEFAULT 20,
      monthlyFee DOUBLE,
      isActive TINYINT(1) DEFAULT 1,
      description TEXT,
      startDate VARCHAR(100),
      endDate VARCHAR(100),
      registrationDeadline VARCHAR(100),
      level VARCHAR(100),
      locationRoom VARCHAR(255),
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Enrollments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id VARCHAR(100) PRIMARY KEY,
      sessionId VARCHAR(100),
      userId VARCHAR(100),
      athleteName VARCHAR(255),
      athletePhone VARCHAR(20),
      athleteNationalId VARCHAR(20),
      status VARCHAR(50) DEFAULT 'active',
      paymentStatus VARCHAR(50) DEFAULT 'paid',
      trackingNumber VARCHAR(100),
      receiptUrl LONGTEXT,
      receiptFileName VARCHAR(255),
      paymentMethod VARCHAR(50),
      enrolledAt VARCHAR(100),
      expireDate VARCHAR(100),
      startDate VARCHAR(100),
      endDate VARCHAR(100),
      totalSessionsAllowed INT DEFAULT 12,
      usedSessionsCount INT DEFAULT 0,
      priceAtEnrollment INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. Financial Transactions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(100) PRIMARY KEY,
      userId VARCHAR(100),
      userName VARCHAR(255),
      userNationalId VARCHAR(20),
      amount DOUBLE,
      type VARCHAR(50),
      method VARCHAR(50),
      trackingNumber VARCHAR(100),
      receiptUrl LONGTEXT,
      receiptFileName VARCHAR(255),
      description TEXT,
      status VARCHAR(50),
      createdAt VARCHAR(100),
      createdBy VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11. Attendance Records table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id VARCHAR(100) PRIMARY KEY,
      sessionId VARCHAR(100),
      date VARCHAR(100),
      userId VARCHAR(100),
      userName VARCHAR(255),
      status VARCHAR(50),
      reason TEXT,
      recordedBy VARCHAR(255),
      recordedAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 12. Debtors table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debtors (
      id VARCHAR(100) PRIMARY KEY,
      userId VARCHAR(100),
      fullName VARCHAR(255),
      nationalId VARCHAR(20),
      phone VARCHAR(20),
      category VARCHAR(100),
      categoryTitle VARCHAR(255),
      amount DOUBLE,
      dueDate VARCHAR(100),
      status VARCHAR(50),
      notes TEXT,
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 13. Creditors table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS creditors (
      id VARCHAR(100) PRIMARY KEY,
      creditorName VARCHAR(255),
      category VARCHAR(100),
      categoryTitle VARCHAR(255),
      contactPhone VARCHAR(20),
      ibanNumber VARCHAR(100),
      amount DOUBLE,
      dueDate VARCHAR(100),
      status VARCHAR(50) DEFAULT 'unpaid',
      notes TEXT,
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 14. Insurance Requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS insurance_requests (
      id VARCHAR(100) PRIMARY KEY,
      userId VARCHAR(100),
      userName VARCHAR(255),
      userNationalId VARCHAR(20),
      insuranceNumber VARCHAR(100),
      startDate VARCHAR(100),
      expiryDate VARCHAR(100),
      documentUrl LONGTEXT,
      fileName VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      rejectionReason TEXT,
      createdAt VARCHAR(100),
      reviewedAt VARCHAR(100),
      reviewedBy VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 15. Support Tickets table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id VARCHAR(100) PRIMARY KEY,
      ticketNumber VARCHAR(100),
      userId VARCHAR(100),
      userName VARCHAR(255),
      userNationalId VARCHAR(20),
      userRole VARCHAR(50),
      userPhone VARCHAR(20),
      subject VARCHAR(255),
      department VARCHAR(100),
      priority VARCHAR(50),
      status VARCHAR(50),
      lastResponseAt VARCHAR(100),
      hasUnreadAdminMessage TINYINT(1) DEFAULT 0,
      hasUnreadUserMessage TINYINT(1) DEFAULT 0,
      createdAt VARCHAR(100),
      messages JSON
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 16. App Notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_notifications (
      id VARCHAR(100) PRIMARY KEY,
      userId VARCHAR(100),
      targetAudience VARCHAR(50),
      title VARCHAR(255),
      message TEXT,
      category VARCHAR(50),
      isRead TINYINT(1) DEFAULT 0,
      actionLink TEXT,
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 17. Products table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(100) PRIMARY KEY,
      code VARCHAR(100),
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      price DOUBLE DEFAULT 0,
      buyPrice DOUBLE DEFAULT 0,
      stock INT DEFAULT 0,
      minStock INT DEFAULT 5,
      minStockAlert INT DEFAULT 5,
      unit VARCHAR(50),
      imageUrl LONGTEXT,
      description TEXT,
      isActive TINYINT(1) DEFAULT 1,
      createdAt VARCHAR(100),
      updatedAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Migrate existing products table to ensure modern columns (code, buyPrice, minStock, minStockAlert) exist
  try {
    const [columns]: any = await pool.query('SHOW COLUMNS FROM products');
    const columnNames = columns.map((col: any) => col.Field);
    if (!columnNames.includes('code')) {
      await pool.query('ALTER TABLE products ADD COLUMN code VARCHAR(100)');
    }
    if (!columnNames.includes('buyPrice')) {
      await pool.query('ALTER TABLE products ADD COLUMN buyPrice DOUBLE DEFAULT 0');
    }
    if (!columnNames.includes('minStock')) {
      await pool.query('ALTER TABLE products ADD COLUMN minStock INT DEFAULT 5');
      if (columnNames.includes('minStockAlert')) {
        await pool.query('UPDATE products SET minStock = minStockAlert');
      }
    }
    if (!columnNames.includes('minStockAlert')) {
      await pool.query('ALTER TABLE products ADD COLUMN minStockAlert INT DEFAULT 5');
    }
    if (!columnNames.includes('unit')) {
      await pool.query('ALTER TABLE products ADD COLUMN unit VARCHAR(50)');
    }
  } catch (migErr) {
    console.warn('[Database Migration Warning] products table columns check:', migErr);
  }

  // 18. Shop Invoices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_invoices (
      id VARCHAR(100) PRIMARY KEY,
      invoiceNumber VARCHAR(100),
      athleteId VARCHAR(100),
      athleteName VARCHAR(255),
      creatorId VARCHAR(100),
      creatorName VARCHAR(255),
      date VARCHAR(100),
      items LONGTEXT,
      totalAmount DOUBLE DEFAULT 0,
      paymentMethod VARCHAR(50),
      paymentStatus VARCHAR(50),
      notes TEXT,
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 19. Shop Invoice Items table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_invoice_items (
      id VARCHAR(100) PRIMARY KEY,
      invoiceId VARCHAR(100) NOT NULL,
      productId VARCHAR(100),
      productName VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      unitPrice DOUBLE NOT NULL DEFAULT 0,
      buyPrice DOUBLE NOT NULL DEFAULT 0,
      quantity INT NOT NULL DEFAULT 1,
      totalPrice DOUBLE NOT NULL DEFAULT 0,
      FOREIGN KEY (invoiceId) REFERENCES shop_invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    const [invItemCols]: any = await pool.query('SHOW COLUMNS FROM shop_invoice_items');
    const invItemColNames = invItemCols.map((col: any) => col.Field);
    if (!invItemColNames.includes('buyPrice')) {
      await pool.query('ALTER TABLE shop_invoice_items ADD COLUMN buyPrice DOUBLE DEFAULT 0');
    }
  } catch (migErr) {
    console.warn('[Database Migration Warning] shop_invoice_items table check:', migErr);
  }

  // 20. SMS Logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_logs (
      id VARCHAR(100) PRIMARY KEY,
      recipients JSON,
      recipientNames JSON,
      message TEXT,
      channel VARCHAR(50) DEFAULT 'sms',
      type VARCHAR(50),
      targetGroup VARCHAR(50),
      status VARCHAR(50) DEFAULT 'sent',
      cost DOUBLE DEFAULT 0,
      packId VARCHAR(100),
      messageIds JSON,
      sentBy VARCHAR(255),
      sentAt VARCHAR(100),
      errorMessage TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // ==========================================
  // [SELF-HEALING SCHEMAS & COMPATIBILITY LAYER]
  // ==========================================
  console.log('[Database] Running self-healing schema compatibility checks...');

  const ensureCol = async (table: string, col: string, definition: string) => {
    try {
      const [tables]: any = await pool.query(`SHOW TABLES LIKE ?`, [table]);
      if (tables.length === 0) return;

      const [columns]: any = await pool.query(`SHOW COLUMNS FROM ??`, [table]);
      const exists = columns.some((c: any) => c.Field.toLowerCase() === col.toLowerCase());
      if (!exists) {
        console.log(`[Self-Healing] Adding column '${col}' to table '${table}'`);
        await pool.query(`ALTER TABLE ?? ADD COLUMN \`${col}\` ${definition}`, [table]);
      }
    } catch (err) {
      console.error(`[Self-Healing] Failed to ensure column '${col}' in table '${table}':`, err);
    }
  };

  const syncCols = async (table: string, colFrom: string, colTo: string) => {
    try {
      const [tables]: any = await pool.query(`SHOW TABLES LIKE ?`, [table]);
      if (tables.length === 0) return;

      const [columns]: any = await pool.query(`SHOW COLUMNS FROM ??`, [table]);
      const hasFrom = columns.some((c: any) => c.Field.toLowerCase() === colFrom.toLowerCase());
      const hasTo = columns.some((c: any) => c.Field.toLowerCase() === colTo.toLowerCase());
      if (hasFrom && hasTo) {
        await pool.query(`UPDATE ?? SET \`${colTo}\` = \`${colFrom}\` WHERE \`${colTo}\` IS NULL OR \`${colTo}\` = ''`, [table]);
      }
    } catch (err) {
      // Ignore copy/sync errors if columns are empty or have minor types mismatch
    }
  };

  // 1. club_settings table
  await ensureCol('club_settings', 'logo_icon', "VARCHAR(100) DEFAULT 'mountain'");
  await ensureCol('club_settings', 'logo_Icon', "VARCHAR(100) DEFAULT 'mountain'");
  await ensureCol('club_settings', 'logoIcon', "VARCHAR(100) DEFAULT 'mountain'");
  await ensureCol('club_settings', 'theme_palette', "VARCHAR(50) DEFAULT 'teal'");
  await ensureCol('club_settings', 'theme_Palette', "VARCHAR(50) DEFAULT 'teal'");
  await ensureCol('club_settings', 'themePalette', "VARCHAR(50) DEFAULT 'teal'");
  await ensureCol('club_settings', 'smsApiKey', "VARCHAR(255)");
  await ensureCol('club_settings', 'smsLineNumber', "VARCHAR(50)");
  await ensureCol('club_settings', 'smsSignature', "VARCHAR(100)");
  await ensureCol('club_settings', 'baleBotToken', "VARCHAR(255)");
  await ensureCol('club_settings', 'baleChannelOrChatId', "VARCHAR(100)");
  await ensureCol('club_settings', 'settings_json', "LONGTEXT");
  await ensureCol('club_settings', 'updatedAt', "VARCHAR(100)");

  await ensureCol('sms_logs', 'channel', "VARCHAR(50) DEFAULT 'sms'");
  await ensureCol('users', 'baleChatId', "VARCHAR(100)");

  await ensureCol('enrollments', 'startDate', "VARCHAR(100)");
  await ensureCol('enrollments', 'endDate', "VARCHAR(100)");
  await ensureCol('enrollments', 'totalSessionsAllowed', "INT DEFAULT 12");
  await ensureCol('enrollments', 'usedSessionsCount', "INT DEFAULT 0");
  await ensureCol('enrollments', 'priceAtEnrollment', "INT DEFAULT 0");

  await syncCols('enrollments', 'enrolledAt', 'startDate');
  await syncCols('enrollments', 'expireDate', 'endDate');

  await syncCols('club_settings', 'logoIcon', 'logo_icon');
  await syncCols('club_settings', 'logo_icon', 'logoIcon');
  await syncCols('club_settings', 'logo_Icon', 'logo_icon');
  await syncCols('club_settings', 'logo_icon', 'logo_Icon');
  await syncCols('club_settings', 'themePalette', 'theme_palette');
  await syncCols('club_settings', 'theme_palette', 'themePalette');
  await syncCols('club_settings', 'theme_Palette', 'theme_palette');
  await syncCols('club_settings', 'theme_palette', 'theme_Palette');

  // 2. courses table
  await ensureCol('courses', 'sportType', "VARCHAR(100)");
  await ensureCol('courses', 'category', "VARCHAR(100)");
  await ensureCol('courses', 'coachId', "VARCHAR(100)");
  await ensureCol('courses', 'daysOfWeek', "JSON");
  await ensureCol('courses', 'startTime', "VARCHAR(50)");
  await ensureCol('courses', 'endTime', "VARCHAR(50)");
  await ensureCol('courses', 'capacity', "INT DEFAULT 20");
  await ensureCol('courses', 'maxCapacity', "INT DEFAULT 20");
  await ensureCol('courses', 'description', "TEXT");
  await ensureCol('courses', 'level', "VARCHAR(100)");
  await ensureCol('courses', 'locationRoom', "VARCHAR(255)");
  await ensureCol('courses', 'startDate', "VARCHAR(100)");
  await ensureCol('courses', 'endDate', "VARCHAR(100)");
  await ensureCol('courses', 'registrationDeadline', "VARCHAR(100)");

  await syncCols('courses', 'category', 'sportType');
  await syncCols('courses', 'sportType', 'category');
  await syncCols('courses', 'maxCapacity', 'capacity');
  await syncCols('courses', 'capacity', 'maxCapacity');

  // 3. support_tickets table
  await ensureCol('support_tickets', 'department', "VARCHAR(100)");
  await ensureCol('support_tickets', 'category', "VARCHAR(100)");
  await ensureCol('support_tickets', 'ticketNumber', "VARCHAR(100)");
  await ensureCol('support_tickets', 'userRole', "VARCHAR(50)");
  await ensureCol('support_tickets', 'lastResponseAt', "VARCHAR(100)");
  await ensureCol('support_tickets', 'messages', "JSON");

  await syncCols('support_tickets', 'category', 'department');
  await syncCols('support_tickets', 'department', 'category');

  // 4. pre_registrations table
  const preRegCols = {
    firstName: "VARCHAR(255)",
    lastName: "VARCHAR(255)",
    fullName: "VARCHAR(255) NOT NULL DEFAULT ''",
    fatherName: "VARCHAR(255)",
    shenasnamehNo: "VARCHAR(50)",
    nationalId: "VARCHAR(20) NOT NULL DEFAULT ''",
    birthDate: "VARCHAR(50)",
    gender: "VARCHAR(20)",
    isUnder18: "TINYINT(1) DEFAULT 0",
    phone: "VARCHAR(20) NOT NULL DEFAULT ''",
    emergencyContactName: "VARCHAR(255)",
    emergencyContactRelation: "VARCHAR(100)",
    emergencyContactPhone: "VARCHAR(20)",
    bloodType: "VARCHAR(20)",
    shoeSize: "VARCHAR(20)",
    clothingSize: "VARCHAR(20)",
    address: "TEXT",
    medicalConditions: "TEXT",
    educationOrJob: "VARCHAR(255)",
    referrerName: "VARCHAR(255)",
    referrerPhone: "VARCHAR(20)",
    climbingExperienceLevel: "VARCHAR(50)",
    insuranceNumber: "VARCHAR(100)",
    parentFullName: "VARCHAR(255)",
    parentNationalId: "VARCHAR(20)",
    parentPhone: "VARCHAR(20)",
    avatarUrl: "LONGTEXT",
    status: "VARCHAR(50) DEFAULT 'pending'",
    rejectionReason: "TEXT",
    assignedRoles: "JSON",
    createdUserId: "VARCHAR(100)",
    createdAt: "VARCHAR(100)",
    reviewedAt: "VARCHAR(100)",
    reviewedBy: "VARCHAR(255)"
  };

  for (const [col, def] of Object.entries(preRegCols)) {
    await ensureCol('pre_registrations', col, def);
  }

  // 5. users table
  const usersCols = {
    firstName: "VARCHAR(255)",
    lastName: "VARCHAR(255)",
    fullName: "VARCHAR(255) NOT NULL DEFAULT ''",
    fatherName: "VARCHAR(255)",
    shenasnamehNo: "VARCHAR(50)",
    nationalId: "VARCHAR(20)",
    birthDate: "VARCHAR(50)",
    gender: "VARCHAR(20)",
    phone: "VARCHAR(20)",
    emergencyContactName: "VARCHAR(255)",
    emergencyContactRelation: "VARCHAR(100)",
    emergencyContactPhone: "VARCHAR(20)",
    bloodType: "VARCHAR(20)",
    shoeSize: "VARCHAR(20)",
    clothingSize: "VARCHAR(20)",
    address: "TEXT",
    medicalConditions: "TEXT",
    referrerName: "VARCHAR(255)",
    referrerPhone: "VARCHAR(20)",
    educationOrJob: "VARCHAR(255)",
    climbingExperienceLevel: "VARCHAR(50)",
    roles: "JSON",
    activeRole: "VARCHAR(50) DEFAULT 'athlete'",
    isActive: "TINYINT(1) DEFAULT 1",
    insuranceNumber: "VARCHAR(100)",
    insuranceExpiryDate: "VARCHAR(50)",
    isInsuranceValid: "TINYINT(1) DEFAULT 0",
    baleChatId: "VARCHAR(100)",
    avatarUrl: "LONGTEXT",
    createdAt: "VARCHAR(100)",
    updatedAt: "VARCHAR(100)"
  };

  for (const [col, def] of Object.entries(usersCols)) {
    await ensureCol('users', col, def);
  }

  // 6. products table
  const productsCols = {
    code: "VARCHAR(100)",
    name: "VARCHAR(255) NOT NULL DEFAULT ''",
    category: "VARCHAR(100)",
    price: "DOUBLE DEFAULT 0",
    buyPrice: "DOUBLE DEFAULT 0",
    stock: "INT DEFAULT 0",
    minStock: "INT DEFAULT 5",
    minStockAlert: "INT DEFAULT 5",
    unit: "VARCHAR(50)",
    imageUrl: "LONGTEXT",
    description: "TEXT",
    isActive: "TINYINT(1) DEFAULT 1",
    createdAt: "VARCHAR(100)",
    updatedAt: "VARCHAR(100)"
  };
  for (const [col, def] of Object.entries(productsCols)) {
    await ensureCol('products', col, def);
  }

  // 7. shop_invoices table
  const shopInvoicesCols = {
    invoiceNumber: "VARCHAR(100)",
    athleteId: "VARCHAR(100)",
    athleteName: "VARCHAR(255)",
    creatorId: "VARCHAR(100)",
    creatorName: "VARCHAR(255)",
    date: "VARCHAR(100)",
    items: "LONGTEXT",
    totalAmount: "DOUBLE DEFAULT 0",
    paymentMethod: "VARCHAR(50)",
    paymentStatus: "VARCHAR(50)",
    notes: "TEXT",
    createdAt: "VARCHAR(100)"
  };
  for (const [col, def] of Object.entries(shopInvoicesCols)) {
    await ensureCol('shop_invoices', col, def);
  }

  // 8. shop_invoice_items table
  const shopInvoiceItemsCols = {
    invoiceId: "VARCHAR(100) NOT NULL",
    productId: "VARCHAR(100)",
    productName: "VARCHAR(255) NOT NULL",
    category: "VARCHAR(100)",
    unitPrice: "DOUBLE NOT NULL DEFAULT 0",
    quantity: "INT NOT NULL DEFAULT 1",
    totalPrice: "DOUBLE NOT NULL DEFAULT 0"
  };
  for (const [col, def] of Object.entries(shopInvoiceItemsCols)) {
    await ensureCol('shop_invoice_items', col, def);
  }

  console.log('[Database] Self-healing checks finished successfully.');
}

export async function seedInitialAdmin(pool: mysql.Pool) {
  // 1. Initial Club Settings
  await pool.query(`
    INSERT INTO club_settings (id, name, slogan, logo_Icon, theme_Palette)
    VALUES ('1', 'باشگاه سنگ‌نوردی موج', 'اوج افتخار، تمرکز و استقامت در سنگ‌نوردی', 'mountain', 'teal')
    ON DUPLICATE KEY UPDATE name=VALUES(name);
  `);

  // 2. Base Admin User ONLY (No demo fake athletes or courses)
  // Password is stored ONLY as a bcrypt hash (never plaintext).
  // NOTE: The default password below is a bootstrap-only value; it MUST be changed on first login.
  const adminHash = await hashPassword('123');
  await pool.query(
    `INSERT INTO users (id, username, password, fullName, nationalId, phone, roles, activeRole, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE fullName=VALUES(fullName);`,
    [
      'usr-admin-1',
      'admin',
      adminHash,
      'مدیر کل مجموعه',
      '0012345678',
      '09121111111',
      JSON.stringify(['super_admin', 'athlete', 'secretary', 'coach', 'accountant']),
      'super_admin',
      '1403/01/01',
    ]
  );
}

export async function seedDemoData(pool: mysql.Pool) {
  return seedInitialAdmin(pool);
}

export const ensureAllTablesExist = initializeTables;
export const createAllTablesAndIndexes = initializeTables;
