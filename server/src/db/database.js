/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Database Layer (SQLite DatabaseSync with immediate transactions, strict migrations & PostgreSQL compatibility)
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const cryptoService = require('../services/cryptoService');

class Database {
  constructor(dbPath = null){
    this.dbPath = dbPath || process.env.AA_DB_PATH || path.join(__dirname, 'aa_cafe.db');
    this.sqlite = new DatabaseSync(this.dbPath);
    this.init();
  }

  init(){
    // Section 5.6: Read and execute schema with fail-closed integrity
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for(const stmt of statements){
      try {
        this.sqlite.exec(stmt + ';');
      } catch(err){
        // Only allow idempotent rerun warnings (e.g. table/index already exists)
        if(!err.message.includes('already exists')){
          throw new Error(`Database schema initialization aborted. Critical DDL failure: ${err.message} in statement: ${stmt.slice(0, 50)}...`);
        }
      }
    }

    // Finding P0-02: Secure staff bootstrap behavior
    this._bootstrapStaff();
  }

  /**
   * Finding P0-02: Never seed hardcoded credentials in production.
   */
  _bootstrapStaff(){
    const isProd = process.env.NODE_ENV === 'production';
    const checkStmt = this.sqlite.prepare('SELECT COUNT(*) as cnt FROM staff_accounts');
    const res = checkStmt.get();
    const existingCount = res ? res.cnt : 0;

    if(existingCount > 0) return;

    if(isProd){
      // In production: only bootstrap if explicit environment variables are provided
      const bootstrapUser = process.env.AA_BOOTSTRAP_ADMIN_USER;
      const bootstrapPass = process.env.AA_BOOTSTRAP_ADMIN_PASS;
      if(bootstrapUser && bootstrapPass){
        this.createStaffAccount(bootstrapUser, bootstrapPass, 'owner', 'مدير النظام الأول');
        console.log(`[SECURITY AUDIT] Bootstrapped production administrator account from environment: ${bootstrapUser}`);
      } else {
        console.warn('[SECURITY NOTICE] Production database initialized with 0 staff accounts. Please provision an admin account via AA_BOOTSTRAP_ADMIN_USER/PASS or admin CLI.');
      }
    } else {
      // In dev/test: seed standard disposable test fixtures
      this.seedTestFixtures();
    }
  }

  /**
   * Creates a staff account with validated role and per-user cryptographic salt
   */
  createStaffAccount(username, password, role = 'cashier', fullName = 'موظف the A&A'){
    if(!['cashier', 'manager', 'owner'].includes(role)){
      throw new Error(`Invalid staff role '${role}'. Must be cashier, manager, or owner.`);
    }
    if(!username || !password || password.length < 8){
      throw new Error('Username and minimum 8-character password are required.');
    }

    const salt = cryptoService.generateSalt();
    const hash = cryptoService.hashPassword(password, salt);
    const id = 'STAFF_' + username.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const now = Date.now();

    const insertStmt = this.sqlite.prepare(`
      INSERT INTO staff_accounts (id, username, password_hash, salt, role, full_name, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertStmt.run(id, username, hash, salt, role, fullName, now);

    return { id, username, role, fullName };
  }

  /**
   * Disposable test accounts for automated test fixtures
   */
  seedTestFixtures(){
    const defaultStaff = [
      { username: 'cashier1', role: 'cashier', name: 'كاشير الفرع الرئيسي', pass: 'Cashier@AA2024' },
      { username: 'manager1', role: 'manager', name: 'مدير العمليات - فرع المدينة', pass: 'Manager@AA2024' },
      { username: 'owner1', role: 'owner', name: 'الإدارة العليا the A&A', pass: 'Owner@AA2024' }
    ];

    for(const s of defaultStaff){
      try {
        this.createStaffAccount(s.username, s.pass, s.role, s.name);
      } catch(e){} // Ignore if already seeded
    }
  }

  /**
   * Executes a callback within a strict immediate transaction (row-locking semantics)
   */
  transaction(fn){
    this.sqlite.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn(this);
      this.sqlite.exec('COMMIT;');
      return result;
    } catch(err){
      this.sqlite.exec('ROLLBACK;');
      throw err;
    }
  }

  prepare(sql){
    return this.sqlite.prepare(sql);
  }

  exec(sql){
    return this.sqlite.exec(sql);
  }

  close(){
    try {
      this.sqlite.close();
    } catch(e){}
  }
}

// Singleton instance with lazy init
let instance = null;
module.exports = {
  getDB: (customPath) => {
    if(!instance || customPath){
      instance = new Database(customPath);
    }
    return instance;
  },
  createTestDB: () => {
    return new Database(':memory:');
  }
};
