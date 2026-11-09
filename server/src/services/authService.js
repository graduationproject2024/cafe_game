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
    this.activeTokens = new Map(); // token -> { staffId, username, role, expiresAt }
  }

  /**
   * Authenticates staff member credentials
   */
  login(username, password, ipAddress = '127.0.0.1'){
    if(!username || !password){
      throw new Error('Username and password are required');
    }

    const stmt = this.db.prepare(`
      SELECT * FROM staff_accounts WHERE username = ? AND active = 1
    `);
    const staff = stmt.get(username);

    if(!staff){
      if(this.auditService){
        this.auditService.log('STAFF_LOGIN_FAILED', username, 'STAFF', { reason: 'User not found' }, ipAddress);
      }
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const isValid = cryptoService.verifyPassword(password, staff.salt, staff.password_hash);
    if(!isValid){
      if(this.auditService){
        this.auditService.log('STAFF_LOGIN_FAILED', staff.id, 'STAFF', { reason: 'Password mismatch' }, ipAddress);
      }
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    // Generate secure token (8-hour session)
    const token = 'AA_STAFF_' + crypto.randomBytes(24).toString('base64url');
    const expiresAt = Date.now() + (8 * 3600 * 1000);
    const sessionData = {
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
        username: staff.username,
        role: staff.role,
        fullName: staff.full_name
      },
      expiresAt
    };
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
   * Roles hierarchy / definitions:
   * - cashier: redemption, verification
   * - manager: analytics, reporting, audit logs
   * - owner: all permissions
   */
  authorize(session, requiredRole){
    if(!session) return false;
    if(session.role === 'owner') return true; // Owner has all permissions

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

