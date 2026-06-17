import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PREFIX = "scrypt";

export interface PasswordHasher {
  compare(rawPassword: string, passwordHash: string): Promise<boolean>;
  hash(rawPassword: string): Promise<string>;
}

export class PlaceholderPasswordHasher implements PasswordHasher {
  async compare(rawPassword: string, passwordHash: string): Promise<boolean> {
    if (passwordHash.startsWith(`${SCRYPT_PREFIX}$`)) {
      const [, salt, storedHash] = passwordHash.split("$");

      if (!salt || !storedHash) {
        return false;
      }

      const derivedKey = (await scrypt(rawPassword, salt, SCRYPT_KEY_LENGTH)) as Buffer;
      const storedBuffer = Buffer.from(storedHash, "hex");

      if (storedBuffer.length !== derivedKey.length) {
        return false;
      }

      return timingSafeEqual(storedBuffer, derivedKey);
    }

    // Temporary compatibility for users seeded before the stronger hash was introduced.
    const legacyHash = createHash("sha256").update(rawPassword).digest("hex");

    return legacyHash === passwordHash;
  }

  async hash(rawPassword: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scrypt(rawPassword, salt, SCRYPT_KEY_LENGTH)) as Buffer;

    return `${SCRYPT_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
  }
}
