/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Server-Authoritative Voucher & Gameplay Feasibility Service
 */

const cryptoService = require('./cryptoService');
const crypto = require('node:crypto');

const REWARDS = {
  T: { nameAr: 'خصم 5% على طلبك القادم', nameEn: '5% OFF Your Next Order', tier: 1, minScore: 5000, welcomeScore: 350 },
  S: { nameAr: 'خصم 7% على طلبك القادم', nameEn: '7% OFF Your Next Order', tier: 2, minScore: 7500 },
  G: { nameAr: 'ترقية مجانية لمشروبك المفضل', nameEn: 'Free Specialty Drink Upgrade', tier: 3, minScore: 10000 }
};

class VoucherService {
  constructor(db, auditService){
    this.db = db;
    this.auditService = auditService;
  }

  /**
   * Normalizes and validates Saudi mobile number
   */
  normalizeSaudiPhone(phone){
    if(!phone || typeof phone !== 'string') return null;
    let clean = phone.replace(/[^0-9]/g, '');
    if(clean.startsWith('9665') && clean.length === 12){
      clean = '05' + clean.slice(4);
    } else if(clean.startsWith('5') && clean.length === 9){
      clean = '05' + clean.slice(1);
    }
    if(/^05[0-9]{8}$/.test(clean)){
      return clean;
    }
    return null;
  }

  /**
   * Starts or resumes a customer session
   */
  startCustomerSession(phone, nickname = 'ضيف the A&A', ipAddress = '127.0.0.1'){
    const normalizedPhone = this.normalizeSaudiPhone(phone);
    if(!normalizedPhone){
      const err = new Error('Invalid Saudi phone number. Must start with 05 and have 10 digits.');
      err.status = 400;
      throw err;
    }

    const now = Date.now();
    let customer = this.db.prepare('SELECT * FROM customers WHERE phone = ?').get(normalizedPhone);

    if(!customer){
      const customerId = 'CUST_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      this.db.prepare(`
        INSERT INTO customers (id, phone, nickname, welcome_promo_status, first_promo_awarded, total_visits, best_score, created_at, last_active_at)
        VALUES (?, ?, ?, 'ELIGIBLE', 0, 1, 0, ?, ?)
      `).run(customerId, normalizedPhone, nickname, now, now);
      customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    } else {
      this.db.prepare(`
        UPDATE customers SET last_active_at = ?, total_visits = total_visits + 1, nickname = COALESCE(?, nickname)
        WHERE id = ?
      `).run(now, nickname, customer.id);
      customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
    }

    const sessionId = 'SESS_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
    this.db.prepare(`
      INSERT INTO sessions (id, customer_id, ip_address, started_at, last_active_at, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(sessionId, customer.id, ipAddress, now, now);

    return {
      session: { id: sessionId, startedAt: now },
      customer: {
        id: customer.id,
        phone: customer.phone,
        nickname: customer.nickname,
        welcomePromoStatus: customer.welcome_promo_status,
        totalVisits: customer.total_visits,
        bestScore: customer.best_score
      }
    };
  }

  /**
   * Server-Side Game Run Feasibility & Bounds Validation
   */
  submitGameRun(sessionId, gameId, rawScore, durationMs, ipAddress = '127.0.0.1'){
    const session = this.db.prepare('SELECT * FROM sessions WHERE id = ? AND is_active = 1').get(sessionId);
    if(!session){
      const err = new Error('Invalid or expired game session');
      err.status = 401;
      throw err;
    }

    const customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(session.customer_id);
    const score = parseInt(rawScore, 10);
    const duration = parseInt(durationMs, 10);

    // Feasibility bounds: prevent client spoofing impossible scores
    let isFeasible = true;
    let reason = '';

    if(isNaN(score) || score < 0){
      isFeasible = false;
      reason = 'Score must be non-negative integer';
    } else if(duration < 2000 && score > 50){
      isFeasible = false;
      reason = 'Duration too short for reported score';
    } else if(score > 30000){
      isFeasible = false;
      reason = 'Score exceeds theoretical engine ceiling';
    }

    const now = Date.now();
    const runId = 'RUN_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const verifiedScore = isFeasible ? score : 0;
    const status = isFeasible ? 'VERIFIED' : 'REJECTED_BOUNDS';

    this.db.prepare(`
      INSERT INTO game_runs (id, session_id, customer_id, game_id, raw_score, verified_score, duration_ms, status, rejection_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, session.id, customer.id, gameId, score, verifiedScore, duration, status, reason, now);

    if(!isFeasible){
      if(this.auditService){
        this.auditService.log('RUN_BOUNDS_REJECTED', customer.id, 'CUSTOMER', { gameId, rawScore: score, reason }, ipAddress);
      }
      const err = new Error('Game score rejected by server feasibility check: ' + reason);
      err.status = 422;
      throw err;
    }

    // Update customer best score
    const newBest = Math.max(customer.best_score || 0, verifiedScore);
    let promoStatus = customer.welcome_promo_status;
    if(customer.total_visits <= 2 && verifiedScore >= 350 && promoStatus === 'ELIGIBLE'){
      promoStatus = 'QUALIFIED';
    }

    this.db.prepare(`
      UPDATE customers SET best_score = ?, welcome_promo_status = ?, last_active_at = ?
      WHERE id = ?
    `).run(newBest, promoStatus, now, customer.id);

    return {
      runId,
      status: 'VERIFIED',
      verifiedScore,
      bestScore: newBest,
      welcomePromoStatus: promoStatus
    };
  }

  /**
   * Server-Authoritative Voucher Claim & Upgrade
   */
  claimVoucher(customerId, targetType = 'T', isUpgrade = false, ipAddress = '127.0.0.1'){
    return this.db.transaction((db) => {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
      if(!customer){
        const err = new Error('Customer not found');
        err.status = 404;
        throw err;
      }

      const rewardDef = REWARDS[targetType];
      if(!rewardDef){
        const err = new Error('Invalid reward type');
        err.status = 400;
        throw err;
      }

      // Check existing active vouchers & duplicate prevention FIRST
      const activeVoucher = db.prepare(`
        SELECT * FROM vouchers WHERE customer_id = ? AND status = 'ACTIVE'
      `).get(customer.id);

      if(!isUpgrade && activeVoucher){
        const err = new Error('Customer already has an active voucher. Upgrade required to claim higher tier.');
        err.status = 409;
        throw err;
      }

      if(!isUpgrade && customer.welcome_promo_status === 'CLAIMED' && targetType === 'T'){
        const err = new Error('Welcome promotional voucher already claimed. Cannot issue duplicate.');
        err.status = 409;
        throw err;
      }

      // 1. Verify eligibility
      let isEligible = false;
      const score = customer.best_score || 0;

      if(targetType === 'T'){
        // 5% can be earned via >= 5000 pts OR welcome promo >= 350 pts
        if(score >= rewardDef.minScore){
          isEligible = true;
        } else if((customer.welcome_promo_status === 'QUALIFIED' || customer.welcome_promo_status === 'ELIGIBLE') && score >= rewardDef.welcomeScore){
          isEligible = true;
        }
      } else if(targetType === 'S'){
        isEligible = score >= rewardDef.minScore;
      } else if(targetType === 'G'){
        isEligible = score >= rewardDef.minScore;
      }

      if(!isEligible){
        const err = new Error(`Ineligible for Tier ${targetType}. Required score: ${rewardDef.minScore}, current: ${score}`);
        err.status = 403;
        throw err;
      }

      let previousCode = null;
      if(isUpgrade && activeVoucher){
        // Revoke old voucher code atomically
        previousCode = activeVoucher.code;
        db.prepare(`
          UPDATE vouchers SET status = 'REVOKED' WHERE id = ?
        `).run(activeVoucher.id);

        if(this.auditService){
          this.auditService.log('VOUCHER_REVOKED_UPGRADE', customer.id, 'CUSTOMER', {
            oldCode: previousCode,
            newType: targetType
          }, ipAddress);
        }
      }

      // Mint new voucher
      const now = Date.now();
      const voucherId = 'VOUCH_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      const code = cryptoService.mintVoucherCode(targetType);
      const expiresAt = now + (3 * 86400 * 1000); // 3-day validity
      const sigPayload = `${voucherId}|${code}|${customer.id}|${targetType}|${expiresAt}`;
      const serverSig = cryptoService.signPayload(sigPayload);

      db.prepare(`
        INSERT INTO vouchers (id, code, customer_id, type, tier, status, issued_at, expires_at, previous_code, server_signature)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
      `).run(voucherId, code, customer.id, targetType, rewardDef.tier, now, expiresAt, previousCode, serverSig);

      // Close welcome promo cycle if applicable
      db.prepare(`
        UPDATE customers SET welcome_promo_status = 'CLAIMED', first_promo_awarded = 1 WHERE id = ?
      `).run(customer.id);

      if(this.auditService){
        this.auditService.log(isUpgrade ? 'VOUCHER_UPGRADE_ISSUED' : 'VOUCHER_CLAIMED', customer.id, 'CUSTOMER', {
          voucherId,
          code,
          type: targetType,
          expiresAt
        }, ipAddress);
      }

      return {
        voucher: {
          id: voucherId,
          code,
          type: targetType,
          tier: rewardDef.tier,
          nameAr: rewardDef.nameAr,
          nameEn: rewardDef.nameEn,
          issuedAt: now,
          expiresAt,
          status: 'ACTIVE',
          previousCode,
          signature: serverSig
        }
      };
    });
  }

  /**
   * Cashier Voucher Verification
   */
  verifyVoucher(rawCode){
    if(!rawCode) return { valid: false, reason: 'Empty voucher code' };
    const clean = rawCode.trim().toUpperCase();

    // Query voucher by code (with or without hyphens)
    const normalized = clean.replace(/-/g, '');
    const voucher = this.db.prepare(`
      SELECT v.*, c.phone, c.nickname 
      FROM vouchers v
      JOIN customers c ON v.customer_id = c.id
      WHERE REPLACE(v.code, '-', '') = ?
    `).get(normalized);

    if(!voucher){
      return { valid: false, status: 'INVALID', reason: 'Voucher code not found in central database' };
    }

    const now = Date.now();
    if(voucher.status === 'REVOKED'){
      return { valid: false, status: 'REVOKED', reason: 'Voucher was revoked due to upgrade to higher reward tier' };
    }
    if(voucher.status === 'REDEEMED'){
      return { valid: false, status: 'REDEEMED', reason: 'Voucher has already been redeemed' };
    }
    if(voucher.status === 'EXPIRED' || now > voucher.expires_at){
      return { valid: false, status: 'EXPIRED', reason: 'Voucher has expired (3-day validity window exceeded)' };
    }

    const reward = REWARDS[voucher.type] || { nameAr: 'مكافأة the A&A', nameEn: 'A&A Reward' };
    return {
      valid: true,
      status: 'ACTIVE',
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        tier: voucher.tier,
        rewardNameAr: reward.nameAr,
        rewardNameEn: reward.nameEn,
        issuedAt: voucher.issued_at,
        expiresAt: voucher.expires_at,
        customerNickname: voucher.nickname,
        customerPhone: voucher.phone
      }
    };
  }
}

module.exports = VoucherService;
