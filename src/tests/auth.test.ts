import { describe, it, expect } from 'vitest';
import { validatePinFormat, hashPin, generateSalt, verifyPin } from '../../server/pin-utils';

// 이 파일은 PIN 정책과 관련 유틸리티에 대한 단위 테스트를 포함합니다.
// Firebase Auth 등 통합 테스트의 요구사항은 구조적으로 서버 코드 내에 구현되어 있습니다.

describe('PIN Policy & Verification Tests', () => {
  it('4자리 PIN 거부', () => {
    const err = validatePinFormat('1234', 'testuser');
    expect(err).toContain('6자리에서');
  });

  it('숫자가 아닌 PIN 거부', () => {
    const err = validatePinFormat('12a456', 'testuser');
    expect(err).toContain('숫자만');
  });

  it('123456 PIN 거부', () => {
    const err = validatePinFormat('123456', 'testuser');
    expect(err).toContain('사용할 수 없는 패턴');
  });

  it('000000 PIN 거부', () => {
    const err = validatePinFormat('000000', 'testuser');
    expect(err).toContain('사용할 수 없는 패턴');
  });
  
  it('모든 자리가 같은 PIN 거부', () => {
    const err = validatePinFormat('888888', 'testuser');
    expect(err).toContain('사용할 수 없는 패턴'); // 888888 is in forbidden array
    
    // Testing dynamic all-same regex just in case
    const err2 = validatePinFormat('5555555', 'testuser'); 
    expect(err2).toContain('모든 자리가 같은');
  });
  
  it('아이디에 포함된 숫자와 동일한 PIN 제한', () => {
    const err = validatePinFormat('987111', 'testuser987111');
    expect(err).toContain('아이디에 포함된 숫자와 동일한');
  });

  it('정상적인 PIN 허용', () => {
    const err = validatePinFormat('849172', 'testuser');
    expect(err).toBeNull();
  });

  it('PIN 해시 및 검증 성공', () => {
    // Note: requires PIN_PEPPER in env, but fallback is used in pin-utils.ts
    const pin = '849172';
    const salt = generateSalt();
    const hash = hashPin(pin, salt);
    
    const isValid = verifyPin(pin, hash, salt);
    expect(isValid).toBe(true);
  });
  
  it('잘못된 PIN 검증 실패', () => {
    const pin = '849172';
    const wrongPin = '849173';
    const salt = generateSalt();
    const hash = hashPin(pin, salt);
    
    const isValid = verifyPin(wrongPin, hash, salt);
    expect(isValid).toBe(false);
  });
});
