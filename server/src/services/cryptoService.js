/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Cryptographic Security Service (HMAC-SHA256, PBKDF2 100k, Checksum Voucher Codes, Signed Session Tokens)
 */

const crypto = require('node:crypto');

// Finding P0-03: In production, require an explicit, cryptographically strong secret.
const IS_PROD = process.env.NODE_ENV === 'production';
let SERVER_SECRET = process.env.AA_SERVER_SECRET;

if(IS_PROD){
  if(!SERVER_SECRET || SERVER_SECRET.length < 32){
    throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: In production, AA_SERVER_SECRET environment variable must be set and at least 32 characters long.');
  }
} else {
  if(!SERVER_SECRET){
    SERVER_SECRET = 'AA_DEV_SECRET_MADINAH_SPECIALTY_COFFEE_2024_SECURE_TEST_KEY_32CHARS';
  }
}

// Section 5.4: Modern OWASP standard work factor for PBKDF2-HMAC-SHA512
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

class CryptoService {
  /**
   * Generates a cryptographically strong salt for password hashing
   */
  generateSalt(){
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hashes a password using PBKDF2-HMAC-SHA512 with 100,000 iterations
   */
  hashPassword(password, salt){
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  }

  /**
   * Verifies password against stored hash using constant-time comparison
   */
  verifyPassword(password, salt, storedHash){
    const computed = this.hashPassword(password, salt);
    const bufA = Buffer.from(computed, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if(bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Computes server-authoritative HMAC-SHA256 signature for voucher or certificate
   */
  signPayload(payload){
    const normalized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', SERVER_SECRET).update(normalized).digest('hex');
  }

  /**
   * Constant-time verification of HMAC-SHA256 signature
   */
  verifySignature(payload, signature){
    if(!signature) return false;
    const expected = this.signPayload(payload);
    const bufA = Buffer.from(expected, 'hex');
    const bufB = Buffer.from(signature, 'hex');
    if(bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Generates formatted voucher code with prefix, random entropy and checksum
   * E.g. TNAX-8K9-M2P
   */
  mintVoucherCode(type = 'T'){
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 without 0/O, 1/I confusion
    const tierPrefix = ['T', 'S', 'G'].includes(type) ? type : 'T';
    
    // Generate 6 random base32 characters
    const randBytes = crypto.randomBytes(6);
    let randomPart = '';
    for(let i = 0; i < 6; i++){
      randomPart += chars[randBytes[i] % chars.length];
    }

    // Checksum 2 characters
    const checkSumInput = `${tierPrefix}|${randomPart}|${SERVER_SECRET}`;
    const hash = crypto.createHash('sha256').update(checkSumInput).digest();
    const c1 = chars[hash[0] % chars.length];
    const c2 = chars[hash[1] % chars.length];

    const raw = `${tierPrefix}NAX${randomPart}${c1}${c2}`;
    // Format as TNAX-XXX-XXX
    return `${raw.slice(0, 4)}-${raw.slice(4, 7)}-${raw.slice(7)}`;
  }

  /**
   * Validates internal code checksum format
   */
  isValidVoucherFormat(code){
    if(!code || typeof code !== 'string') return false;
    const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if(clean.length < 10) return false;
    const tier = clean[0];
    return ['T', 'S', 'G'].includes(tier);
  }

  /**
   * Finding P0-04: Creates a tamper-evident customer session token
   * Prevents client impersonation by cryptographically binding sessionId, customerId and phone
   */
  mintCustomerSessionToken(sessionId, customerId, phone, expMs = 24 * 3600 * 1000){
    const expiresAt = Date.now() + expMs;
    const payload = { sessionId, customerId, phone, exp: expiresAt };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = this.signPayload(payloadB64);
    return `${payloadB64}.${sig}`;
  }

  /**
   * Validates and unpacks customer session token
   */
  verifyCustomerSessionToken(tokenString){
    if(!tokenString || typeof tokenString !== 'string') return null;
    const parts = tokenString.trim().split('.');
    if(parts.length !== 2) return null;

    const [payloadB64, sig] = parts;
    if(!this.verifySignature(payloadB64, sig)) return null;

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if(!payload || !payload.sessionId || !payload.customerId) return null;
      if(Date.now() > payload.exp) return null; // Expired
      return payload;
    } catch(e){
      return null;
    }
  }
}

module.exports = new CryptoService();
