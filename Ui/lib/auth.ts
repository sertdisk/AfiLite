/* Kısa açıklama: JWT yardımcıları — server-side kullanım için minimal decode/verify yardımı. Client tarafına sızdırmayın. */
import jwt from 'jsonwebtoken';

/**
 * Açıklama (TR):
 * - Bu yardımcı yalnızca sunucu tarafında kullanılmalıdır (Route Handler, Server Component).
 * - Amaç: JWT içerisindeki payload'u okumak (ör. sub, roles vs.).
 * - Doğrulama (verify) opsiyoneldir; genellikle backend zaten doğrulayacağı için burada
 *   sadece decode etmek yeterli olabilir. İhtiyaç halinde verifySecret ile verify yapılabilir.
 */

export type DecodedJwt = null | (jwt.JwtPayload & { sub?: string; email?: string; roles?: string[] });

/** JWT'yi imza doğrulaması yapmadan base64 decode eder (güvenli değil, sadece okuma amaçlı). */
export function decodeJwt(token?: string | null): DecodedJwt {
  if (!token) return null;
  try {
    return jwt.decode(token) as DecodedJwt;
  } catch {
    return null;
  }
}

/**
 * JWT doğrulaması — yalnızca gerekiyorsa kullanın.
 * Not: verify için bir secret gerekir. Bu secret, UI katmanında genellikle bulunmaz.
 * Prod mimaride doğrulama backend/gateway katmanında yapılmalıdır.
 */
export function verifyJwt(token?: string | null, verifySecret?: string): DecodedJwt {
  if (!token || !verifySecret) return null;
  try {
    return jwt.verify(token, verifySecret) as DecodedJwt;
  } catch {
    return null;
  }
}