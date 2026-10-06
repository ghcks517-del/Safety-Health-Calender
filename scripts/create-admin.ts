import { db, auth } from '../server/firebase-admin.js';
import { validatePinFormat, hashPin, generateSalt } from '../server/pin-utils.js';
import dotenv from 'dotenv';
dotenv.config();

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const pin = process.env.ADMIN_INITIAL_PIN;

  if (!username || !pin) {
    console.error("ADMIN_USERNAME and ADMIN_INITIAL_PIN must be set in environment variables.");
    process.exit(1);
  }

  if (!db || !auth) {
    console.error("Firebase is not initialized.");
    process.exit(1);
  }

  try {
    const normalizedUsername = username.trim().toLowerCase();
    
    // 1. 관리자 아이디 검증
    if (normalizedUsername.length < 4) {
      throw new Error("Admin username must be at least 4 characters.");
    }

    // 2. 관리자 PIN 정책 검증
    const pinError = validatePinFormat(pin, normalizedUsername);
    if (pinError) {
      throw new Error(`Invalid Admin PIN: ${pinError}`);
    }

    // 3. 중복 확인
    const usernameRef = db.collection('usernames').doc(normalizedUsername);
    
    await db.runTransaction(async (t) => {
      const usernameDoc = await t.get(usernameRef);
      if (usernameDoc.exists) {
        throw new Error("Admin username already exists.");
      }

      const tenantId = `tenant_admin_${Date.now()}`;
      
      // 4-5. uid 생성 및 이메일 없는 Firebase Authentication 사용자 생성
      const userRecord = await auth.createUser({
        disabled: false // Admin is active by default
      });
      const uid = userRecord.uid;

      const salt = generateSalt();
      const pinHash = hashPin(pin, salt);

      // 6. 관리자 users 문서 생성
      const userRef = db.collection('users').doc(uid);
      t.set(userRef, {
        uid,
        tenantId,
        username: normalizedUsername,
        role: 'ADMIN', // 10. role=ADMIN 지정
        status: 'ACTIVE',
        mustChangePin: true, // 11. 최초 로그인 후 PIN 변경 강제
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 7. authCredentials 문서 생성
      const credsRef = db.collection('authCredentials').doc(uid);
      t.set(credsRef, {
        uid,
        pinHash,
        pinSalt: salt,
        pinAlgorithm: "scrypt",
        pinVersion: 1,
        credentialVersion: 1,
        failedLoginCount: 0,
        lockedUntil: null,
        mustChangePin: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 8. usernames 문서 생성
      t.set(usernameRef, {
        normalizedUsername,
        uid,
        tenantId,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 9. Custom Claims 설정
      await auth.setCustomUserClaims(uid, {
        tenantId,
        role: 'ADMIN',
        accountStatus: 'ACTIVE'
      });
    });

    console.log("Admin account successfully created.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin account:", error);
    process.exit(1);
  }
}

createAdmin();
