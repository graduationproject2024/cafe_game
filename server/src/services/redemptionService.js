/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Atomic Voucher Redemption Service (Guaranteed Single Redemption Under High Concurrency)
 */

const crypto = require('node:crypto');

class RedemptionService {
  constructor(db, auditService){
    this.db = db;
    this.auditService = auditService;
  }

  /**
   * Atomically redeems a voucher with strict immediate transaction locking
   * Guarantees that concurrent redemption attempts result in exactly 1 success and 409 Conflict for others.
   */
  redeemVoucher(rawCode, staffMember, orderRef = '', notes = '', ipAddress = '127.0.0.1'){
    if(!rawCode || typeof rawCode !== 'string'){
      const err = new Error('Voucher code is required');
      err.status = 400;
      throw err;
    }

    if(!staffMember || !staffMember.id){
      const err = new Error('Authenticated staff member is required for redemption');
      err.status = 401;
      throw err;
    }

    // Role check: Only cashier or owner can redeem vouchers
    if(staffMember.role !== 'cashier' && staffMember.role !== 'owner'){
      if(this.auditService){
        this.auditService.log('REDEEM_UNAUTHORIZED_ROLE', staffMember.id, 'STAFF', {
          role: staffMember.role,
          code: rawCode
        }, ipAddress);
      }
      const err = new Error(`Staff role '${staffMember.role}' is not authorized to redeem vouchers (requires cashier or owner)`);
      err.status = 403;
      throw err;
    }

    const normalizedCode = rawCode.trim().toUpperCase().replace(/-/g, '');

    // Execute within BEGIN IMMEDIATE transaction with outside audit logging on race conditions
    try {
      return this.db.transaction((db) => {
        // 1. Fetch voucher with row-level exclusivity
        const voucher = db.prepare(`
          SELECT * FROM vouchers WHERE REPLACE(code, '-', '') = ?
        `).get(normalizedCode);

        if(!voucher){
          const err = new Error('Voucher code not found in central registry');
          err.status = 404;
          throw err;
        }

        // 2. Strict status check
        if(voucher.status === 'REDEEMED'){
          const err = new Error('Voucher has already been redeemed. Double redemption rejected.');
          err.status = 409; // HTTP 409 Conflict
          err.isRaceCondition = true;
          throw err;
        }

        if(voucher.status === 'REVOKED'){
          const err = new Error('Voucher has been revoked due to an upgrade to a higher reward tier.');
          err.status = 409;
          throw err;
        }

        const now = Date.now();
        if(voucher.status === 'EXPIRED' || now > voucher.expires_at){
          const err = new Error('Voucher has expired (3-day promotional window exceeded).');
          err.status = 410; // HTTP 410 Gone
          throw err;
        }

        if(voucher.status !== 'ACTIVE'){
          const err = new Error(`Voucher cannot be redeemed: current status is ${voucher.status}`);
          err.status = 409;
          throw err;
        }

        // 3. Atomic status transition: ACTIVE -> REDEEMED
        const updateResult = db.prepare(`
          UPDATE vouchers 
          SET status = 'REDEEMED' 
          WHERE id = ? AND status = 'ACTIVE'
        `).run(voucher.id);

        if(updateResult.changes !== 1){
          // Concurrency race lost: another thread or worker just redeemed it
          const err = new Error('Voucher was redeemed concurrently by another cashier request.');
          err.status = 409;
          err.isRaceCondition = true;
          throw err;
        }

        // 4. Record redemption entry in redemptions table (voucher_id has UNIQUE constraint)
        const redemptionId = 'RED_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
        try {
          db.prepare(`
            INSERT INTO redemptions (id, voucher_id, voucher_code, staff_id, redeemed_at, order_ref, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(redemptionId, voucher.id, voucher.code, staffMember.id, now, orderRef || null, notes || null);
        } catch(constraintErr){
          // In the event of a duplicate key constraint
          const err = new Error('Voucher already recorded in redemptions register.');
          err.status = 409;
          err.isRaceCondition = true;
          throw err;
        }

        // 5. Tamper-evident Audit Log
        if(this.auditService){
          this.auditService.log('VOUCHER_REDEEMED', staffMember.id, 'STAFF', {
            redemptionId,
            voucherId: voucher.id,
            code: voucher.code,
            type: voucher.type,
            orderRef: orderRef || 'N/A'
          }, ipAddress);
        }

        return {
          success: true,
          redemptionId,
          voucherCode: voucher.code,
          voucherType: voucher.type,
          redeemedAt: now,
          staffId: staffMember.id,
          staffName: staffMember.fullName || staffMember.username,
          orderRef: orderRef || null
        };
      });
    } catch(err){
      // Persist security audit log outside rolled-back transaction
      if(this.auditService){
        if(err.isRaceCondition || err.status === 409){
          this.auditService.log('REDEEM_RACE_BLOCKED', staffMember.id, 'STAFF', {
            code: rawCode,
            reason: err.message
          }, ipAddress);
        } else if(err.status === 404){
          this.auditService.log('REDEEM_NOT_FOUND', staffMember.id, 'STAFF', { code: rawCode }, ipAddress);
        }
      }
      throw err;
    }
  }
}

module.exports = RedemptionService;
