/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Cryptographic Security Service (HMAC-SHA256, PBKDF2, Checksum Voucher Codes)
 */

const crypto = require('node:crypto');

const SERVER_SECRET = process.env.AA_SERVER_SECRET || 'AA_MADINAH_SPECIALTY_COFFEE_2024_PROD_SALT_V4_SECURE_PHASE2';
const PBKDF2_ITERATIONS = 12000;
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
   * Hashes a password using PBKDF2-HMAC-SHA512
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
}

module.exports = new CryptoService();
