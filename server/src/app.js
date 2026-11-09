/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Phase 2 REST API Application (Pure Node.js HTTP Server, Zero External Dependencies)
 */

const http = require('node:http');
const url = require('node:url');
const cryptoService = require('./services/cryptoService');

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

  // Resolves allowed CORS origin based on ALLOWED_ORIGINS environment variable
  _resolveCorsOrigin(req){
    const reqOrigin = req ? req.headers['origin'] : null;
    const envAllowed = process.env.ALLOWED_ORIGINS;
    if(!envAllowed || envAllowed.trim() === '*'){
      return reqOrigin || '*';
    }
    const allowedList = envAllowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if(!reqOrigin) return '*';
    const normalizedReq = reqOrigin.trim().toLowerCase();
    if(allowedList.includes(normalizedReq)){
      return reqOrigin;
    }
    return null; // rejected origin
  }

  // Send JSON response with standard headers & safe origin reflection
  _send(req, res, statusCode, payload){
    const allowedOrigin = this._resolveCorsOrigin(req);
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Session-Token',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    };
    if(allowedOrigin){
      headers['Access-Control-Allow-Origin'] = allowedOrigin;
    }

    res.writeHead(statusCode, headers);
    res.end(JSON.stringify(payload));
  }

  // Request router handler
  async handleRequest(req, res){
    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const method = req.method;
    const ipAddress = req.socket.remoteAddress || '127.0.0.1';

    // CORS preflight
    if(method === 'OPTIONS'){
      const allowedOrigin = this._resolveCorsOrigin(req);
      const headers = {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Session-Token'
      };
      if(allowedOrigin){
        headers['Access-Control-Allow-Origin'] = allowedOrigin;
      }
      res.writeHead(204, headers);
      return res.end();
    }

    try {
      // 1. Health check
      if(method === 'GET' && pathname === '/api/v1/health'){
        return this._send(req, res, 200, {
          status: 'healthy',
          project: 'the A&A Specialty Cafe & Sweets',
          location: 'Al-Madinah Al-Munawwarah',
          version: '2.0.0',
          timestamp: Date.now()
        });
      }

      // 2a. Guest Start Session (Anonymous gameplay session)
      if(method === 'POST' && pathname === '/api/v1/sessions/guest'){
        const result = this.voucherService.startGuestSession(ipAddress);
        return this._send(req, res, 200, result);
      }

      // 2b. Bind Guest Session to Saudi Mobile Phone
      if(method === 'POST' && pathname === '/api/v1/sessions/bind'){
        const body = await this._parseBody(req);
        const guestToken = req.headers['x-session-token'] || body.guestSessionToken || body.sessionToken || body.token;
        const result = this.voucherService.bindGuestSession(guestToken, body.phone, body.nickname, ipAddress);
        return this._send(req, res, 200, result);
      }

      // 2c. Customer Start Session
      if(method === 'POST' && pathname === '/api/v1/sessions/start'){
        const body = await this._parseBody(req);
        const guestToken = req.headers['x-session-token'] || body.guestSessionToken;
        const result = this.voucherService.startCustomerSession(body.phone, body.nickname, ipAddress, guestToken);
        return this._send(req, res, 200, result);
      }

      // 3. Submit Game Run
      if(method === 'POST' && (pathname === '/api/v1/games/submit-run' || pathname === '/api/v1/runs/submit')){
        const body = await this._parseBody(req);
        const sessionTokenHeader = req.headers['x-session-token'];
        const sessionIdentifier = sessionTokenHeader || body.sessionToken || body.sessionId;

        if(!sessionIdentifier){
          return this._send(req, res, 401, { error: 'Customer session token or ID required to submit game run.' });
        }

        const rawScore = body.rawScore !== undefined ? body.rawScore : body.score;
        const result = this.voucherService.submitGameRun(sessionIdentifier, body.gameId, rawScore, body.durationMs, ipAddress);
        return this._send(req, res, 200, result);
      }

      // 4. Finding P0-04: Claim / Upgrade Voucher with Impersonation Protection
      if(method === 'POST' && pathname === '/api/v1/vouchers/claim'){
        const body = await this._parseBody(req);
        const sessionTokenHeader = req.headers['x-session-token'] || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);
        const sessionToken = sessionTokenHeader || body.sessionToken;

        // If no session token is provided, verify whether raw customerId was provided
        if(!sessionToken){
          if(body.customerId){
            // Impersonation vector blocked: client cannot simply pass customerId without a signed token
            return this._send(req, res, 401, { error: 'Authentication required: valid customer session token must be provided to claim vouchers.' });
          }
          return this._send(req, res, 401, { error: 'Customer session token is required to claim vouchers.' });
        }

        // Validate customer session token cryptographically
        const tokenPayload = cryptoService.verifyCustomerSessionToken(sessionToken);
        if(!tokenPayload){
          return this._send(req, res, 401, { error: 'Invalid or expired customer session token.' });
        }

        // If client also supplied a customerId in body, verify it matches token (prevent IDOR)
        if(body.customerId && body.customerId !== tokenPayload.customerId){
          return this._send(req, res, 403, { error: 'Impersonation rejected: customer ID mismatch with session token.' });
        }

        const result = this.voucherService.claimVoucher(sessionToken, body.targetType || 'T', !!body.isUpgrade, ipAddress);
        return this._send(req, res, 201, result);
      }

      // 5. Section 5.1: Cashier Verify Voucher (Hides customer PII from unauthenticated callers)
      if(method === 'POST' && pathname === '/api/v1/vouchers/verify'){
        const body = await this._parseBody(req);
        const authHeader = req.headers['authorization'];
        const staffSession = this.authService.verifyToken(authHeader);
        const result = this.voucherService.verifyVoucher(body.code, staffSession);
        return this._send(req, res, 200, result);
      }

      // 6. Cashier Redeem Voucher (Atomic)
      if(method === 'POST' && pathname === '/api/v1/vouchers/redeem'){
        const authHeader = req.headers['authorization'];
        const staffSession = this.authService.verifyToken(authHeader);
        if(!staffSession){
          return this._send(req, res, 401, { error: 'Authentication required. Valid staff token must be provided.' });
        }

        const body = await this._parseBody(req);
        const result = this.redemptionService.redeemVoucher(body.code, staffSession, body.orderRef, body.notes, ipAddress);
        return this._send(req, res, 200, result);
      }

      // 7. Staff Login
      if(method === 'POST' && pathname === '/api/v1/staff/login'){
        const body = await this._parseBody(req);
        const result = this.authService.login(body.username, body.password, ipAddress);
        return this._send(req, res, 200, result);
      }

      // 7b. Staff Logout / Token Revocation
      if(method === 'POST' && pathname === '/api/v1/staff/logout'){
        const authHeader = req.headers['authorization'];
        if(authHeader){
          this.authService.logout(authHeader);
        }
        return this._send(req, res, 200, { success: true, message: 'Staff logged out successfully.' });
      }

      // 8. Staff Analytics (Manager / Owner only)
      if(method === 'GET' && pathname === '/api/v1/staff/analytics'){
        const authHeader = req.headers['authorization'];
        const staffSession = this.authService.verifyToken(authHeader);
        if(!staffSession){
          return this._send(req, res, 401, { error: 'Authentication required.' });
        }
        if(!this.authService.authorize(staffSession, 'manager')){
          return this._send(req, res, 403, { error: `Forbidden: role '${staffSession.role}' is not authorized to view manager analytics.` });
        }

        const stats = {
          totalCustomers: this.db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
          totalRuns: this.db.prepare('SELECT COUNT(*) as c FROM game_runs').get().c,
          totalVouchers: this.db.prepare('SELECT COUNT(*) as c FROM vouchers').get().c,
          activeVouchers: this.db.prepare("SELECT COUNT(*) as c FROM vouchers WHERE status = 'ACTIVE'").get().c,
          totalRedemptions: this.db.prepare('SELECT COUNT(*) as c FROM redemptions').get().c,
          recentAudits: this.auditService.getRecentLogs(10)
        };
        return this._send(req, res, 200, { stats });
      }

      // 404 Route Not Found
      return this._send(req, res, 404, { error: 'API endpoint not found', path: pathname });

    } catch(err){
      const status = err.status || 500;
      // In production, do not leak internal system stacks to client
      const safeMsg = (status < 500 || process.env.NODE_ENV !== 'production') 
        ? err.message 
        : 'An internal server error occurred. Please contact cafe administration.';
      return this._send(req, res, status, { error: safeMsg });
    }
  }

  listen(...args){
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    return this.server.listen(...args);
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
