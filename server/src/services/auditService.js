/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Audit Logging Service
 */

const crypto = require('node:crypto');

class AuditService {
  constructor(db){
    this.db = db;
  }

  log(eventType, actorId, actorType = 'STAFF', details = {}, ipAddress = '127.0.0.1'){
    const id = 'AUD_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    const now = Date.now();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (id, event_type, actor_id, actor_type, details, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, eventType, actorId, actorType, detailsStr, ipAddress, now);
      return { id, eventType, timestamp: now };
    } catch(err){
      console.error('Failed to write audit log:', err);
      return null;
    }
  }

  getRecentLogs(limit = 50){
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?
      `);
      return stmt.all(limit);
    } catch(err){
      console.error('Failed to query audit logs:', err);
      return [];
    }
  }
}

module.exports = AuditService;
