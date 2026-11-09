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

const VALID_GAME_IDS = ['reflex', 'pattern', 'shuffle', 'stack', 'beans', 'pour', 'rhythm', 'pairhunt', 'basketball'];

const GAME_CEILINGS = {
  reflex: 1200,
  pattern: 900,
  shuffle: 900,
  stack: 1000,
  beans: 900,
  pour: 1200,
  rhythm: 1200,
  pairhunt: 1000,
  basketball: 1500
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
   * Starts an anonymous guest session for visitors who begin playing before entering phone
   */
  startGuestSession(ipAddress = '127.0.0.1'){
    const now = Date.now();
    const sessionId = 'GUEST_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
    this.db.prepare(`
      INSERT INTO sessions (id, customer_id, ip_address, started_at, last_active_at, is_active)
      VALUES (?, NULL, ?, ?, ?, 1)
    `).run(sessionId, ipAddress, now, now);

    const guestToken = cryptoService.mintGuestSessionToken(sessionId);
    return {
      session: {
        id: sessionId,
        token: guestToken,
        isGuest: true,
        startedAt: now
      }
    };
  }

  /**
   * Binds an anonymous guest session to a customer profile upon entering Saudi mobile number
   * Seamlessly transfers all verified gameplay runs and recalculates qualification
   */
  bindGuestSession(guestToken, phone, nickname = 'ضيف the A&A', ipAddress = '127.0.0.1'){
    const tokenPayload = cryptoService.verifyCustomerSessionToken(guestToken);
    if(!tokenPayload || !tokenPayload.sessionId){
      const err = new Error('Invalid or expired guest session token');
      err.status = 401;
      throw err;
    }

    const sessionId = tokenPayload.sessionId;
    const session = this.db.prepare('SELECT * FROM sessions WHERE id = ? AND is_active = 1').get(sessionId);
    if(!session){
      const err = new Error('Session not found or expired');
      err.status = 404;
      throw err;
    }

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
        UPDATE customers SET last_active_at = ?, nickname = COALESCE(?, nickname)
        WHERE id = ?
      `).run(now, nickname, customer.id);
      customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
    }

    // Bind session to customer
    this.db.prepare('UPDATE sessions SET customer_id = ?, last_active_at = ? WHERE id = ?').run(customer.id, now, sessionId);

    // Transfer all guest runs from this session to the customer
    this.db.prepare('UPDATE game_runs SET customer_id = ? WHERE session_id = ? AND customer_id IS NULL').run(customer.id, sessionId);

    // Calculate customer's maximum score including newly bound runs
    const maxRunRow = this.db.prepare('SELECT MAX(verified_score) as maxScore FROM game_runs WHERE customer_id = ? AND status = "VERIFIED"').get(customer.id);
    const maxRunScore = maxRunRow ? (maxRunRow.maxScore || 0) : 0;
    const newBest = Math.max(customer.best_score || 0, maxRunScore);

    let promoStatus = customer.welcome_promo_status;
    if(customer.total_visits <= 2 && newBest >= 350 && promoStatus === 'ELIGIBLE'){
      promoStatus = 'QUALIFIED';
    }

    this.db.prepare(`
      UPDATE customers SET best_score = ?, welcome_promo_status = ?, last_active_at = ?
      WHERE id = ?
    `).run(newBest, promoStatus, now, customer.id);
    customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);

    const fullSessionToken = cryptoService.mintCustomerSessionToken(sessionId, customer.id, customer.phone);

    return {
      session: {
        id: sessionId,
        token: fullSessionToken,
        isGuest: false,
        startedAt: session.started_at
      },
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
   * Finding P0-04: Starts customer session & mints cryptographic session token
   * Optionally binds an existing guest session token if provided
   */
  startCustomerSession(phone, nickname = 'ضيف the A&A', ipAddress = '127.0.0.1', guestSessionToken = null){
    if(guestSessionToken){
      return this.bindGuestSession(guestSessionToken, phone, nickname, ipAddress);
    }
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

    // Cryptographic Session Token: binds sessionId, customerId and phone
    const sessionToken = cryptoService.mintCustomerSessionToken(sessionId, customer.id, customer.phone);

    return {
      session: {
        id: sessionId,
        token: sessionToken,
        isGuest: false,
        startedAt: now
      },
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
   * Finding P0-06: Server-Side Game Run Feasibility & Anti-Abuse Bounds Validation
   */
  submitGameRun(sessionIdentifier, gameId, rawScore, durationMs, ipAddress = '127.0.0.1'){
    // Validate game ID
    if(!VALID_GAME_IDS.includes(gameId)){
      const err = new Error(`Invalid gameId '${gameId}'. Must be one of the approved 9 games.`);
      err.status = 400;
      throw err;
    }

    // Resolve session: either signed token or direct session ID
    let sessionId = sessionIdentifier;
    let expectedCustomerId = null;

    if(typeof sessionIdentifier === 'string' && sessionIdentifier.includes('.')){
      const tokenPayload = cryptoService.verifyCustomerSessionToken(sessionIdentifier);
      if(!tokenPayload){
        const err = new Error('Invalid or expired customer session token');
        err.status = 401;
        throw err;
      }
      sessionId = tokenPayload.sessionId;
      expectedCustomerId = tokenPayload.customerId;
    }

    const session = this.db.prepare('SELECT * FROM sessions WHERE id = ? AND is_active = 1').get(sessionId);
    if(!session){
      const err = new Error('Invalid or expired game session');
      err.status = 401;
      throw err;
    }

    if(expectedCustomerId && session.customer_id !== expectedCustomerId){
      const err = new Error('Session ownership mismatch');
      err.status = 403;
      throw err;
    }

    const customer = session.customer_id ? this.db.prepare('SELECT * FROM customers WHERE id = ?').get(session.customer_id) : null;
    const score = parseInt(rawScore, 10);
    const duration = parseInt(durationMs, 10);

    // Feasibility bounds check per game
    let isFeasible = true;
    let reason = '';
    const ceiling = GAME_CEILINGS[gameId] || 1500;

    if(isNaN(score) || score < 0){
      isFeasible = false;
      reason = 'Score must be non-negative integer';
    } else if(duration < 2500 && score > 60){
      isFeasible = false;
      reason = `Impossible reaction time: duration ${duration}ms too short for score ${score}`;
    } else if(score > ceiling){
      isFeasible = false;
      reason = `Score ${score} exceeds theoretical engine ceiling of ${ceiling} for game [${gameId}]`;
    }

    const now = Date.now();
    const runId = 'RUN_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const verifiedScore = isFeasible ? score : 0;
    const status = isFeasible ? 'VERIFIED' : 'REJECTED_BOUNDS';

    this.db.prepare(`
      INSERT INTO game_runs (id, session_id, customer_id, game_id, raw_score, verified_score, duration_ms, status, rejection_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, session.id, customer ? customer.id : null, gameId, score, verifiedScore, duration, status, reason, now);

    if(!isFeasible){
      if(this.auditService){
        this.auditService.log('RUN_BOUNDS_REJECTED', customer ? customer.id : session.id, 'CUSTOMER', {
          gameId,
          rawScore: score,
          ceiling,
          reason
        }, ipAddress);
      }
      const err = new Error('Game score rejected by server feasibility check: ' + reason);
      err.status = 422;
      throw err;
    }

    // Update customer best score if bound to a registered customer profile
    let newBest = verifiedScore;
    let promoStatus = 'ELIGIBLE';

    if(customer){
      newBest = Math.max(customer.best_score || 0, verifiedScore);
      promoStatus = customer.welcome_promo_status;
      if(customer.total_visits <= 2 && verifiedScore >= 350 && promoStatus === 'ELIGIBLE'){
        promoStatus = 'QUALIFIED';
      }

      this.db.prepare(`
        UPDATE customers SET best_score = ?, welcome_promo_status = ?, last_active_at = ?
        WHERE id = ?
      `).run(newBest, promoStatus, now, customer.id);
    } else {
      if(verifiedScore >= 350){
        promoStatus = 'QUALIFIED';
      }
    }

    return {
      runId,
      status: 'VERIFIED',
      verifiedScore,
      bestScore: newBest,
      welcomePromoStatus: promoStatus,
      isGuest: !customer
    };
  }

  /**
   * Finding P0-04: Server-Authoritative Voucher Claim with Impersonation Defense
   */
  claimVoucher(customerIdentity, targetType = 'T', isUpgrade = false, ipAddress = '127.0.0.1'){
    return this.db.transaction((db) => {
      let customerId = customerIdentity;

      // If customerIdentity is a signed session token: verify cryptographically
      if(typeof customerIdentity === 'string' && customerIdentity.includes('.')){
        const tokenPayload = cryptoService.verifyCustomerSessionToken(customerIdentity);
        if(!tokenPayload){
          const err = new Error('Invalid or expired customer session token');
          err.status = 401;
          throw err;
        }
        customerId = tokenPayload.customerId;
      } else if(typeof customerIdentity === 'object' && customerIdentity !== null){
        customerId = customerIdentity.customerId || customerIdentity.id;
      }

      if(!customerId || typeof customerId !== 'string'){
        const err = new Error('Valid customer session token or ID required');
        err.status = 401;
        throw err;
      }

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
   * Section 5.1: Protected Voucher Verification (Hides customer PII from unauthenticated requests)
   */
  verifyVoucher(rawCode, staffMember = null){
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

    const response = {
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
        expiresAt: voucher.expires_at
      }
    };

    // Only expose customer details to authenticated staff
    if(staffMember && staffMember.id){
      if(staffMember.role === 'cashier' || staffMember.role === 'owner'){
        response.voucher.customerNickname = voucher.nickname;
        response.voucher.customerPhone = voucher.phone;
      } else if(staffMember.role === 'manager'){
        response.voucher.customerNickname = voucher.nickname;
        response.voucher.customerPhone = voucher.phone ? voucher.phone.slice(0, 3) + '***' + voucher.phone.slice(-4) : '';
      }
    }

    return response;
  }
}

module.exports = VoucherService;
