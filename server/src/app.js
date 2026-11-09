/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Phase 2 REST API Application (Pure Node.js HTTP Server, Zero External Dependencies)
 */

const http = require('node:http');
const url = require('node:url');

class App {
  constructor({ db, authService, voucherService, redemptionService, auditService }){
    this.db = db;
    this.authService = authService;
    this.voucherService = voucherService;
    this.redemptionService = redemptionService;
    this.auditService = auditService;
    this.server = null;
  }

  // Parse incoming JSON body
  async _parseBody(req){
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
        if(data.length > 1e6){ // 1MB limit
          req.destroy();
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        if(!data.trim()) return resolve({});
        try {
          resolve(JSON.parse(data));
        } catch(err){
          const error = new Error('Invalid JSON payload');
          error.status = 400;
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  // Send JSON response with standard headers
  _send(res, statusCode, payload){
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(JSON.stringify(payload));
  }

  // Request router handler
  async handleRequest(req, res){
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;
    const ipAddress = req.socket.remoteAddress || '127.0.0.1';

    // CORS preflight
    if(method === 'OPTIONS'){
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      });
      return res.end();
    }

    try {
      // 1. Health check
      if(method === 'GET' && pathname === '/api/v1/health'){
        return this._send(res, 200, {
          status: 'healthy',
          project: 'the A&A Specialty Cafe & Sweets',
          location: 'Al-Madinah Al-Munawwarah',
          version: '2.0.0',
          timestamp: Date.now()
        });
      }

      // 2. Customer Start Session
      if(method === 'POST' && pathname === '/api/v1/sessions/start'){
        const body = await this._parseBody(req);
        const result = this.voucherService.startCustomerSession(body.phone, body.nickname, ipAddress);
        return this._send(res, 200, result);
      }

      // 3. Submit Game Run
      if(method === 'POST' && pathname === '/api/v1/games/submit-run'){
        const body = await this._parseBody(req);
        const result = this.voucherService.submitGameRun(body.sessionId, body.gameId, body.rawScore, body.durationMs, ipAddress);
        return this._send(res, 200, result);
      }

      // 4. Claim / Upgrade Voucher
      if(method === 'POST' && pathname === '/api/v1/vouchers/claim'){
        const body = await this._parseBody(req);
        const result = this.voucherService.claimVoucher(body.customerId, body.targetType || 'T', !!body.isUpgrade, ipAddress);
        return this._send(res, 201, result);
      }

      // 5. Cashier Verify Voucher
      if(method === 'POST' && pathname === '/api/v1/vouchers/verify'){
        const body = await this._parseBody(req);
        const result = this.voucherService.verifyVoucher(body.code);
        return this._send(res, 200, result);
      }

      // 6. Cashier Redeem Voucher (Atomic)
      if(method === 'POST' && pathname === '/api/v1/vouchers/redeem'){
        const authHeader = req.headers['authorization'];
        const staffSession = this.authService.verifyToken(authHeader);
        if(!staffSession){
          return this._send(res, 401, { error: 'Authentication required. Valid staff token must be provided.' });
        }

        const body = await this._parseBody(req);
        const result = this.redemptionService.redeemVoucher(body.code, staffSession, body.orderRef, body.notes, ipAddress);
        return this._send(res, 200, result);
      }

      // 7. Staff Login
      if(method === 'POST' && pathname === '/api/v1/staff/login'){
        const body = await this._parseBody(req);
        const result = this.authService.login(body.username, body.password, ipAddress);
        return this._send(res, 200, result);
      }

      // 8. Staff Analytics (Manager / Owner only)
      if(method === 'GET' && pathname === '/api/v1/staff/analytics'){
        const authHeader = req.headers['authorization'];
        const staffSession = this.authService.verifyToken(authHeader);
        if(!staffSession){
          return this._send(res, 401, { error: 'Authentication required.' });
        }
        if(!this.authService.authorize(staffSession, 'manager')){
          return this._send(res, 403, { error: `Forbidden: role '${staffSession.role}' is not authorized to view manager analytics.` });
        }

        const stats = {
          totalCustomers: this.db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
          totalRuns: this.db.prepare('SELECT COUNT(*) as c FROM game_runs').get().c,
          totalVouchers: this.db.prepare('SELECT COUNT(*) as c FROM vouchers').get().c,
          activeVouchers: this.db.prepare("SELECT COUNT(*) as c FROM vouchers WHERE status = 'ACTIVE'").get().c,
          totalRedemptions: this.db.prepare('SELECT COUNT(*) as c FROM redemptions').get().c,
          recentAudits: this.auditService.getRecentLogs(10)
        };
        return this._send(res, 200, { stats });
      }

      // 404 Route Not Found
      return this._send(res, 404, { error: 'API endpoint not found', path: pathname });

    } catch(err){
      const status = err.status || 500;
      return this._send(res, status, { error: err.message || 'Internal server error' });
    }
  }

  listen(port = 3000, callback){
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.server.listen(port, callback);
    return this.server;
  }

  close(callback){
    if(this.server){
      this.server.close(callback);
    } else if(callback){
      callback();
    }
  }
}

module.exports = App;
