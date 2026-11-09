/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Phase 2 Backend Entrypoint
 */

const { getDB } = require('./db/database');
const AuditService = require('./services/auditService');
const AuthService = require('./services/authService');
const VoucherService = require('./services/voucherService');
const RedemptionService = require('./services/redemptionService');
const App = require('./app');

function createServer(dbPath = null){
  const db = getDB(dbPath);
  const auditService = new AuditService(db);
  const authService = new AuthService(db, auditService);
  const voucherService = new VoucherService(db, auditService);
  const redemptionService = new RedemptionService(db, auditService);

  const app = new App({
    db,
    authService,
    voucherService,
    redemptionService,
    auditService
  });

  return { app, db, authService, voucherService, redemptionService, auditService };
}

if(require.main === module){
  const PORT = process.env.PORT || 3000;
  const { app } = createServer();
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  the A&A Cafe Games — Phase 2 Secure Backend Running on :${PORT}`);
    console.log(`  Al-Madinah Al-Munawwarah, Saudi Arabia                         `);
    console.log(`================================================================`);
  });
}

module.exports = { createServer };
