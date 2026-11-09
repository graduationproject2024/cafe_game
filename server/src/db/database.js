/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Database Layer (SQLite DatabaseSync with immediate transactions & PostgreSQL compatibility)
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
    // Read and execute schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    // Split into individual statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for(const stmt of statements){
      try {
        this.sqlite.exec(stmt + ';');
      } catch(err){
        // Ignore duplicate index errors if any
        if(!err.message.includes('already exists')){
          console.error('Error executing schema statement:', err);
        }
      }
    }

    // Seed default staff accounts if not present
    this._seedStaffAccounts();
  }

  _seedStaffAccounts(){
    const checkStmt = this.sqlite.prepare('SELECT COUNT(*) as cnt FROM staff_accounts');
    const res = checkStmt.get();
    if(res && res.cnt > 0) return;

    const defaultStaff = [
      { username: 'cashier1', role: 'cashier', name: 'كاشير الفرع الرئيسي', pass: 'Cashier@AA2024' },
      { username: 'manager1', role: 'manager', name: 'مدير العمليات - فرع المدينة', pass: 'Manager@AA2024' },
      { username: 'owner1', role: 'owner', name: 'الإدارة العليا the A&A', pass: 'Owner@AA2024' }
    ];

    const insertStmt = this.sqlite.prepare(`
      INSERT INTO staff_accounts (id, username, password_hash, salt, role, full_name, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const now = Date.now();
    for(const s of defaultStaff){
      const salt = cryptoService.generateSalt();
      const hash = cryptoService.hashPassword(s.pass, salt);
      const id = 'STAFF_' + s.username.toUpperCase();
      insertStmt.run(id, s.username, hash, salt, s.role, s.name, now);
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

