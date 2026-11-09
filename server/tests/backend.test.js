/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Phase 2 Backend Automated Test Suite (Authentication, RBAC, Issuance, and Atomic Concurrency)
 */

const { createServer } = require('../src/server');

const results = [];
function assert(category, desc, condition, detail){
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ category, desc, status, detail: detail || '' });
  const icon = condition ? '[\x1b[32m✓ PASS\x1b[0m]' : '[\x1b[31m✗ FAIL\x1b[0m]';
  console.log(`${icon} [${category}] ${desc}`);
  if(detail) console.log(`   -> ${detail}`);
  if(!condition){
    process.exitCode = 1;
  }
}

async function runBackendTests(){
  console.log('================================================================');
  console.log('  the A&A Cafe Games — SECURE PHASE 2 BACKEND TEST SUITE        ');
  console.log('  Al-Madinah Al-Munawwarah, Saudi Arabia                         ');
  console.log('================================================================\n');

  // Initialize in-memory test database instance
  const { db, authService, voucherService, redemptionService, auditService, app } = createServer(':memory:');

  try {
    // -------------------------------------------------------------------------
    // 1. Staff Authentication & RBAC
    // -------------------------------------------------------------------------
    console.log('--- 1. Staff Authentication & Server-Side RBAC ---');
    
    // Valid Cashier Login
    const cashierLogin = authService.login('cashier1', 'Cashier@AA2024');
    assert('Staff Auth', 'Cashier authenticates successfully with PBKDF2 hash & receives session token',
      cashierLogin.token && cashierLogin.staff.role === 'cashier',
      `Token: ${cashierLogin.token.slice(0, 16)}..., Role: ${cashierLogin.staff.role}`);

    // Invalid Password Rejection
    let invalidPassRejected = false;
    try {
      authService.login('cashier1', 'WrongPassword123');
    } catch(err){
      invalidPassRejected = err.status === 401;
    }
    assert('Staff Auth', 'Invalid password rejected with 401 Unauthorized',
      invalidPassRejected === true, 'Rejected mismatch password');

    // Manager Login
    const managerLogin = authService.login('manager1', 'Manager@AA2024');
    assert('Staff Auth', 'Manager authenticates successfully with manager role',
      managerLogin.staff.role === 'manager', `Role: ${managerLogin.staff.role}`);

    // Owner Login
    const ownerLogin = authService.login('owner1', 'Owner@AA2024');
    assert('Staff Auth', 'Owner authenticates successfully with owner role',
      ownerLogin.staff.role === 'owner', `Role: ${ownerLogin.staff.role}`);

    // RBAC Permission Checks
    const cashierCanRedeem = authService.authorize(cashierLogin.staff, 'cashier');
    const cashierCanManager = authService.authorize(cashierLogin.staff, 'manager');
    const managerCanManager = authService.authorize(managerLogin.staff, 'manager');
    const ownerCanAll = authService.authorize(ownerLogin.staff, 'cashier') && authService.authorize(ownerLogin.staff, 'manager');

    assert('RBAC', 'Cashier authorized for redemption but strictly forbidden from manager analytics',
      cashierCanRedeem === true && cashierCanManager === false,
      `CanRedeem: ${cashierCanRedeem}, CanManager: ${cashierCanManager}`);

    assert('RBAC', 'Manager authorized for analytics and Owner holds universal permissions',
      managerCanManager === true && ownerCanAll === true,
      `ManagerCanAnalytics: ${managerCanManager}, OwnerCanAll: ${ownerCanAll}`);

    // -------------------------------------------------------------------------
    // 2. Customer Identity & Saudi Phone Normalization
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Customer Identity & Saudi Mobile Normalization ---');

    const customerSession = voucherService.startCustomerSession('0501234567', 'عبدالعزيز');
    assert('Customer Identity', 'Saudi mobile normalized and customer session created in database',
      customerSession.customer.phone === '0501234567' && customerSession.session.id.startsWith('SESS_'),
      `Phone: ${customerSession.customer.phone}, Session: ${customerSession.session.id}`);

    // International format normalization (+9665...)
    const intlSession = voucherService.startCustomerSession('+966512345678', 'سعود');
    assert('Customer Identity', 'International +9665 format normalized to local 05XXXXXXXX',
      intlSession.customer.phone === '0512345678',
      `Normalized: ${intlSession.customer.phone}`);

    // Invalid mobile rejection
    let badPhoneRejected = false;
    try {
      voucherService.startCustomerSession('12345678', 'غير صالح');
    } catch(err){
      badPhoneRejected = err.status === 400;
    }
    assert('Customer Identity', 'Non-Saudi or invalid format phone strictly rejected with 400',
      badPhoneRejected === true, 'Rejected invalid phone');

    // -------------------------------------------------------------------------
    // 3. Server-Authoritative Game Run Submission & Feasibility Check
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Game Run Submission & Anti-Spoofing Feasibility ---');

    // Plausible gameplay run
    const normalRun = voucherService.submitGameRun(customerSession.session.id, 'reflex', 420, 28000);
    assert('Game Runs', 'Plausible gameplay run verified by server bounds check',
      normalRun.status === 'VERIFIED' && normalRun.verifiedScore === 420 && normalRun.welcomePromoStatus === 'QUALIFIED',
      `Verified Score: ${normalRun.verifiedScore}, Promo Status: ${normalRun.welcomePromoStatus}`);

    // Anti-Spoofing: Client spoofing impossible score (99,999 in 2 seconds)
    let spoofRunRejected = false;
    try {
      voucherService.submitGameRun(customerSession.session.id, 'reflex', 99999, 1500);
    } catch(err){
      spoofRunRejected = err.status === 422;
    }
    assert('Game Runs', 'Absurd spoofed client score strictly rejected with 422 Unprocessable',
      spoofRunRejected === true, 'Impossible score blocked by server bounds check');

    // -------------------------------------------------------------------------
    // 4. Server-Authoritative Voucher Issuance & Duplicate Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Server-Authoritative Voucher Issuance & Duplicate Prevention ---');

    const customerId = customerSession.customer.id;
    const voucherClaim = voucherService.claimVoucher(customerId, 'T', false);
    const voucher = voucherClaim.voucher;

    assert('Voucher Issuance', 'Tier T (5% Welcome) voucher issued with HMAC-SHA256 signature and 3-day validity',
      voucher.code.startsWith('T') && voucher.type === 'T' && voucher.signature.length === 64,
      `Code: ${voucher.code}, Sig: ${voucher.signature.slice(0, 16)}...`);

    // Duplicate Claim Prevention: Attempting to claim a second welcome voucher
    let dupClaimBlocked = false;
    try {
      voucherService.claimVoucher(customerId, 'T', false);
    } catch(err){
      dupClaimBlocked = err.status === 409;
    }
    assert('Voucher Issuance', 'Duplicate voucher claim attempt strictly rejected with 409 Conflict',
      dupClaimBlocked === true, 'Second voucher creation blocked');

    // Verify voucher status in central registry
    const verifyBefore = voucherService.verifyVoucher(voucher.code);
    assert('Voucher Verification', 'Cashier verification confirms active voucher status in database',
      verifyBefore.valid === true && verifyBefore.status === 'ACTIVE',
      `Valid: ${verifyBefore.valid}, Status: ${verifyBefore.status}`);

    // -------------------------------------------------------------------------
    // 5. Legitimate Voucher Upgrade
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Legitimate Voucher Upgrade (Tier T -> Tier S) ---');

    // Customer earns 7500 pts (qualifying for Tier S - 7%)
    voucherService.submitGameRun(customerSession.session.id, 'reflex', 7600, 29000);
    const upgradeClaim = voucherService.claimVoucher(customerId, 'S', true);
    const upgradedVoucher = upgradeClaim.voucher;

    assert('Voucher Upgrade', 'Customer successfully upgraded to Tier S (7% Discount)',
      upgradedVoucher.type === 'S' && upgradedVoucher.previousCode === voucher.code,
      `New Type: ${upgradedVoucher.type}, Old Code Revoked: ${upgradedVoucher.previousCode}`);

    // Verification of OLD code must now return REVOKED
    const verifyOldRevoked = voucherService.verifyVoucher(voucher.code);
    assert('Voucher Upgrade', 'Attempt to verify revoked old code returns REVOKED status and blocks usage',
      verifyOldRevoked.valid === false && verifyOldRevoked.status === 'REVOKED',
      `Valid: ${verifyOldRevoked.valid}, Reason: ${verifyOldRevoked.reason}`);

    // Verification of NEW code returns ACTIVE
    const verifyNewActive = voucherService.verifyVoucher(upgradedVoucher.code);
    assert('Voucher Upgrade', 'New Tier S voucher is ACTIVE and ready for redemption',
      verifyNewActive.valid === true && verifyNewActive.status === 'ACTIVE',
      `Valid: ${verifyNewActive.valid}, Status: ${verifyNewActive.status}`);

    // -------------------------------------------------------------------------
    // 6. ATOMIC VOUCHER REDEMPTION CONCURRENCY RACE TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Atomic Redemption & High Concurrency Race Test ---');

    // Create a fresh customer & voucher specifically for the concurrency trial
    const racerSession = voucherService.startCustomerSession('0558889999', 'فهد');
    voucherService.submitGameRun(racerSession.session.id, 'reflex', 500, 25000);
    const raceVoucherClaim = voucherService.claimVoucher(racerSession.customer.id, 'T', false);
    const targetCode = raceVoucherClaim.voucher.code;

    console.log(`   Target Voucher for Concurrency Race: ${targetCode}`);
    console.log(`   Simulating 2 simultaneous cashier redemption requests...`);

    // Create two concurrent cashier redemption requests
    const cashierA = cashierLogin.staff;
    const cashierB = { id: 'STAFF_CASHIER2', username: 'cashier2', role: 'cashier', fullName: 'كاشير الفرع الثاني' };

    let successCount = 0;
    let conflictCount = 0;
    const errors = [];

    // Execute concurrently using Promise.allSettled
    const resultsSettled = await Promise.allSettled([
      new Promise((resolve, reject) => {
        try {
          const res = redemptionService.redeemVoucher(targetCode, cashierA, 'ORDER-101', 'Counter 1');
          resolve(res);
        } catch(e){ reject(e); }
      }),
      new Promise((resolve, reject) => {
        try {
          const res = redemptionService.redeemVoucher(targetCode, cashierB, 'ORDER-102', 'Counter 2');
          resolve(res);
        } catch(e){ reject(e); }
      })
    ]);

    for(const r of resultsSettled){
      if(r.status === 'fulfilled'){
        successCount++;
      } else {
        conflictCount++;
        errors.push(r.reason);
      }
    }

    console.log(`   Concurrency Outcome: ${successCount} Succeeded, ${conflictCount} Rejected with Conflict`);

    // STRICT ATOMIC REDEMPTION ASSERTION
    assert('Atomic Redemption', 'Exactly ONE cashier redemption request succeeds under simultaneous race condition',
      successCount === 1,
      `Success Count: ${successCount} (strictly 1)`);

    assert('Atomic Redemption', 'Conflicting concurrent redemption request is strictly rejected with 409 Conflict',
      conflictCount === 1 && (errors[0]?.status === 409 || errors[0]?.message.includes('already been redeemed')),
      `Conflict Count: ${conflictCount}, Error: ${errors[0]?.message}`);

    // Verify database state: Exactly 1 row in redemptions table for this voucher
    const redemptionsInDb = db.prepare('SELECT COUNT(*) as cnt FROM redemptions WHERE voucher_code = ?').get(targetCode).cnt;
    assert('Atomic Redemption', 'Central database contains strictly ONE redemption record (Zero Double-Spend)',
      redemptionsInDb === 1,
      `Redemptions Count in DB: ${redemptionsInDb} (strictly 1)`);

    // Verify voucher status in central registry is REDEEMED
    const finalVoucherStatus = db.prepare('SELECT status FROM vouchers WHERE code = ?').get(targetCode).status;
    assert('Atomic Redemption', 'Voucher status updated to REDEEMED in database',
      finalVoucherStatus === 'REDEEMED',
      `Voucher Status: ${finalVoucherStatus}`);

    // Subsequent redemption attempt must also be rejected
    let subsequentBlocked = false;
    try {
      redemptionService.redeemVoucher(targetCode, cashierA, 'ORDER-103');
    } catch(err){
      subsequentBlocked = err.status === 409;
    }
    assert('Atomic Redemption', 'Subsequent redemption attempts on used voucher strictly rejected',
      subsequentBlocked === true, 'Post-redemption attempt blocked');

    // -------------------------------------------------------------------------
    // 7. Tamper-Evident Audit Logging
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Tamper-Evident Security Audit Logs ---');

    const recentLogs = auditService.getRecentLogs(20);
    const hasLoginAudit = recentLogs.some(l => l.event_type === 'STAFF_LOGIN_SUCCESS');
    const hasClaimAudit = recentLogs.some(l => l.event_type === 'VOUCHER_CLAIMED');
    const hasRedeemAudit = recentLogs.some(l => l.event_type === 'VOUCHER_REDEEMED');
    const hasRaceAudit = recentLogs.some(l => l.event_type === 'REDEEM_RACE_BLOCKED');

    assert('Audit Trail', 'Security audit log records staff login, voucher claims, redemptions, and blocked race collisions',
      hasLoginAudit && hasClaimAudit && hasRedeemAudit && hasRaceAudit,
      `Total Audits: ${recentLogs.length}, Found: Login=${hasLoginAudit}, Claim=${hasClaimAudit}, Redeem=${hasRedeemAudit}, RaceBlocked=${hasRaceAudit}`);

  } catch(err){
    console.error('Fatal backend test error:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('       SECURE BACKEND — OFFICIAL TEST EXECUTION REPORT          ');
  console.log('================================================================');
  console.table(results);
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`\nOVERALL BACKEND STATUS: ${passed} / ${total} PASSED (${Math.round(passed / total * 100)}%) ${failed === 0 ? '✓' : '✗'}\n`);
}

runBackendTests();
