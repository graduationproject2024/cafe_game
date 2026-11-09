/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Staff Authentication & Role-Based Access Control (RBAC) Service
 */

const cryptoService = require('./cryptoService');
const crypto = require('node:crypto');

class AuthService {
  constructor(db, auditService){
    this.db = db;
    this.auditService = auditService;
    this.activeTokens = new Map(); // token -> { id, staffId, username, role, fullName, expiresAt }
    this.loginAttempts = new Map(); // key -> { count, lockedUntil }
  }

  /**
   * Finding P0-02 & P0-05: Authenticates staff credentials with rate limiting and canonical principal identity
   */
  login(username, password, ipAddress = '127.0.0.1'){
    if(!username || !password){
      const err = new Error('Username and password are required');
      err.status = 400;
      throw err;
    }

    // Rate limiting check
    const rateKey = `${username.toLowerCase()}|${ipAddress}`;
    const attemptRecord = this.loginAttempts.get(rateKey);
    const now = Date.now();

    if(attemptRecord && attemptRecord.lockedUntil && now < attemptRecord.lockedUntil){
      const remainingSecs = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      const err = new Error(`Too many failed login attempts. Temporarily locked for ${remainingSecs} seconds.`);
      err.status = 429;
      throw err;
    }

    // Query active staff account
    const stmt = this.db.prepare(`
      SELECT * FROM staff_accounts WHERE username = ?
    `);
    const staff = stmt.get(username);

    if(!staff || staff.active !== 1){
      this._recordFailedAttempt(rateKey);
      if(this.auditService){
        this.auditService.log('STAFF_LOGIN_FAILED', username, 'STAFF', {
          reason: !staff ? 'User not found' : 'Account deactivated'
        }, ipAddress);
      }
      const err = new Error(!staff ? 'Invalid credentials' : 'Staff account deactivated. Contact administration.');
      err.status = !staff ? 401 : 403;
      throw err;
    }

    const isValid = cryptoService.verifyPassword(password, staff.salt, staff.password_hash);
    if(!isValid){
      this._recordFailedAttempt(rateKey);
      if(this.auditService){
        this.auditService.log('STAFF_LOGIN_FAILED', staff.id, 'STAFF', { reason: 'Password mismatch' }, ipAddress);
      }
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    // Login succeeded: clear rate limiting record
    this.loginAttempts.delete(rateKey);

    // Finding P0-05: Standardize canonical staff principal (id AND staffId)
    const token = 'AA_STAFF_' + crypto.randomBytes(24).toString('base64url');
    const expiresAt = now + (8 * 3600 * 1000);
    const sessionData = {
      id: staff.id,
      staffId: staff.id,
      username: staff.username,
      role: staff.role,
      fullName: staff.full_name,
      expiresAt
    };

    this.activeTokens.set(token, sessionData);

    if(this.auditService){
      this.auditService.log('STAFF_LOGIN_SUCCESS', staff.id, 'STAFF', { role: staff.role }, ipAddress);
    }

    return {
      token,
      staff: {
        id: staff.id,
        staffId: staff.id,
        username: staff.username,
        role: staff.role,
        fullName: staff.full_name
      },
      expiresAt
    };
  }

  _recordFailedAttempt(key){
    const record = this.loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
    record.count++;
    if(record.count >= 5){
      record.lockedUntil = Date.now() + (5 * 60 * 1000); // 5-minute lockout
    }
    this.loginAttempts.set(key, record);
  }

  /**
   * Validates bearer token
   */
  verifyToken(token){
    if(!token) return null;
    const clean = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const session = this.activeTokens.get(clean);

    if(!session) return null;
    if(Date.now() > session.expiresAt){
      this.activeTokens.delete(clean);
      return null;
    }

    return session;
  }

  /**
   * RBAC authorization check
   * Roles hierarchy:
   * - cashier: redemption, verification
   * - manager: analytics, reporting, audit logs
   * - owner: all permissions
   */
  authorize(session, requiredRole){
    if(!session) return false;
    if(session.role === 'owner') return true; // Owner has universal access

    if(requiredRole === 'cashier'){
      return session.role === 'cashier';
    }
    if(requiredRole === 'manager'){
      return session.role === 'manager';
    }
    return session.role === requiredRole;
  }

  logout(token){
    if(!token) return;
    const clean = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    this.activeTokens.delete(clean);
  }
}

module.exports = AuthService;
