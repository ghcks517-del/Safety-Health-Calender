import crypto from 'node:crypto';

const MIN_PIN_LENGTH = process.env.PIN_LENGTH ? parseInt(process.env.PIN_LENGTH) : 6;
const MAX_PIN_LENGTH = 8;
const PEPPER = process.env.PIN_PEPPER || 'development_default_pepper_do_not_use_in_prod';

export function validatePinFormat(pin: string, username: string): string | null {
  if (!/^\d+$/.test(pin)) return 'PIN은 숫자만 포함해야 합니다.';
  if (pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) return `PIN은 ${MIN_PIN_LENGTH}자리에서 ${MAX_PIN_LENGTH}자리 사이여야 합니다.`;
  
  // 금지된 PIN 검증 (연속된 패턴, 단순 반복)
  const forbiddenPins = [
    '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
    '123456', '654321', '012345', '987654', '121212', '112233', '123123', '101010'
  ];
  
  if (forbiddenPins.some(fp => pin.includes(fp))) {
    return '사용할 수 없는 패턴의 PIN입니다 (연속되거나 반복되는 숫자).';
  }
  
  // 동일 숫자 모두 반복 여부 확인 (동적 길이용)
  if (/^(\d)\1+$/.test(pin)) {
    return '모든 자리가 같은 숫자인 PIN은 사용할 수 없습니다.';
  }

  // 아이디에 포함된 숫자와 동일한지 제한
  const usernameNumbers = username.replace(/\D/g, '');
  if (usernameNumbers.length >= 4 && pin.includes(usernameNumbers)) {
    return '아이디에 포함된 숫자와 동일한 형태의 PIN은 사용할 수 없습니다.';
  }

  return null;
}

export function hashPin(pin: string, salt: string): string {
  // scrypt(PIN + PIN_PEPPER, 사용자별 Salt)
  const input = pin + PEPPER;
  // Node.js crypto.scryptSync(password, salt, keylen)
  const derivedKey = crypto.scryptSync(input, salt, 64);
  return derivedKey.toString('base64');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function verifyPin(inputPin: string, storedHashBase64: string, storedSaltBase64: string): boolean {
  const derivedKey = crypto.scryptSync(inputPin + PEPPER, storedSaltBase64, 64);
  const storedHashBuf = Buffer.from(storedHashBase64, 'base64');
  
  // Prevent length mismatch errors in timingSafeEqual
  if (derivedKey.length !== storedHashBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedKey, storedHashBuf);
}
