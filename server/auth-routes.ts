// @ts-check
import { Router } from "express";
import { db, auth, isLocalMode } from "./firebase-admin.js";
import { validatePinFormat, hashPin, generateSalt, verifyPin } from "./pin-utils.js";
import { requireFirebaseSession } from "./auth-middleware.js";

export const authRouter = Router();

// Rate limiting in-memory store for basic protection
const ipRateLimits = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_COUNT = parseInt(process.env.LOGIN_RATE_LIMIT_PER_MINUTE || '30');

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = ipRateLimits.get(ip);
  if (!limit || now > limit.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limit.count >= RATE_LIMIT_COUNT) {
    return false;
  }
  limit.count++;
  return true;
}

// 아이디 중복 확인 엔드포인트
authRouter.get('/check-username', async (req, res) => {
  try {
    if (!db) throw new Error("Firebase is not initialized");
    const rawUsername = ((req.query.username as string) || '').trim();
    if (!rawUsername) {
      return res.status(400).json({ available: false, message: "아이디를 입력해주세요." });
    }

    const normalizedUsername = rawUsername.toLowerCase();
    if (normalizedUsername.length < 4) {
      return res.status(400).json({ available: false, message: "아이디는 4자 이상이어야 합니다." });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(rawUsername)) {
      return res.status(400).json({ available: false, message: "아이디는 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다." });
    }

    // 1. usernames 컬렉션 확인
    const usernameDoc = await db.collection('usernames').doc(normalizedUsername).get();
    if (usernameDoc.exists) {
      return res.json({ available: false, message: "이미 사용 중인 아이디입니다." });
    }

    // 2. users 컬렉션 전수 확인 (대소문자 무관 중복 방지)
    const usersSnapshot = await db.collection('users').get();
    let alreadyTaken = false;
    usersSnapshot.forEach((doc: any) => {
      const u = doc.data();
      if (u && (u.username || '').trim().toLowerCase() === normalizedUsername) {
        alreadyTaken = true;
      }
    });

    if (alreadyTaken) {
      return res.json({ available: false, message: "이미 사용 중인 아이디입니다." });
    }

    return res.json({ available: true, message: "사용 가능한 아이디입니다." });
  } catch (error: any) {
    console.error('Check username error:', error);
    res.status(500).json({ error: error.message || "아이디 중복 확인 중 오류가 발생했습니다." });
  }
});

authRouter.post('/register', async (req, res) => {
  try {
    if (!db || !auth) throw new Error("Firebase is not initialized");

    const { username, pin, pinConfirm, name, organization, phoneNumber } = req.body;
    if (!username || !pin || !pinConfirm) {
      return res.status(400).json({ error: "아이디와 PIN을 모두 입력해주세요." });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "이름을 2자 이상 입력해주세요." });
    }

    if (!organization || organization.trim().length < 2) {
      return res.status(400).json({ error: "소속(회사/부서명)을 입력해주세요." });
    }

    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ error: "올바른 휴대폰번호를 입력해주세요. (예: 010-1234-5678)" });
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername.length < 4) {
      return res.status(400).json({ error: "아이디는 4자 이상이어야 합니다." });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      return res.status(400).json({ error: "아이디는 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다." });
    }

    if (pin !== pinConfirm) {
      return res.status(400).json({ error: "PIN 확인값이 일치하지 않습니다." });
    }

    const pinError = validatePinFormat(pin, normalizedUsername);
    if (pinError) {
      return res.status(400).json({ error: pinError });
    }

    const usernameRef = db.collection('usernames').doc(normalizedUsername);

    // 1. usernames 컬렉션에서 중복 여부 확인
    const existingDoc = await usernameRef.get();
    if (existingDoc.exists) {
      return res.status(400).json({ error: "이미 존재하는 아이디입니다. 다른 아이디를 입력해주세요." });
    }

    // 2. users 컬렉션에서도 중복 여부 전수 확인 (대소문자 무관)
    const usersSnapshot = await db.collection('users').get();
    let alreadyTaken = false;
    usersSnapshot.forEach((doc: any) => {
      const u = doc.data();
      if (u && (u.username || '').trim().toLowerCase() === normalizedUsername) {
        alreadyTaken = true;
      }
    });
    if (alreadyTaken) {
      return res.status(400).json({ error: "이미 존재하는 아이디입니다. 다른 아이디를 입력해주세요." });
    }

    const tenantId = `tenant_${Date.now()}`;
    const status = process.env.REQUIRE_ADMIN_APPROVAL === 'true' ? 'PENDING' : 'ACTIVE';

    // 2. Create user with ONLY uid in Firebase Auth
    const userRecord = await auth.createUser({
      disabled: process.env.REQUIRE_ADMIN_APPROVAL === 'true'
    });
    const uid = userRecord.uid;

    const salt = generateSalt();
    const pinHash = hashPin(pin, salt);

    await db.runTransaction(async (t: any) => {
      // Re-verify in transaction
      const usernameDoc = await t.get(usernameRef);
      if (usernameDoc.exists) {
        throw new Error("ALREADY_EXISTS");
      }

      // users 문서
      const userRef = db.collection('users').doc(uid);
      t.set(userRef, {
        uid,
        tenantId,
        username: normalizedUsername,
        name: name.trim(),
        organization: organization.trim(),
        phoneNumber: cleanPhone,
        role: 'USER',
        status,
        mustChangePin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // authCredentials 문서 (일반 클라이언트 접근 금지)
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // usernames 문서
      t.set(usernameRef, {
        normalizedUsername,
        uid,
        tenantId,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // Custom Claims 설정
    try {
      await auth.setCustomUserClaims(uid, {
        tenantId,
        role: 'USER',
        accountStatus: status
      });
    } catch (claimErr) {
      console.warn("Could not set custom user claims:", claimErr);
    }

    res.json({ success: true, message: "회원가입이 완료되었습니다." });

  } catch (error: any) {
    if (error.message === 'ALREADY_EXISTS') {
      return res.status(400).json({ error: "이미 존재하는 아이디입니다." });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || "회원가입 중 오류가 발생했습니다." });
  }
});


authRouter.post('/login', async (req, res) => {
  try {
    if (!db || !auth) throw new Error("Firebase is not initialized");

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." });
    }

    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: "아이디와 PIN을 입력해주세요." });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const genericError = "아이디 또는 PIN이 올바르지 않습니다.";

    // 1. usernames 문서 조회
    const usernameDoc = await db.collection('usernames').doc(normalizedUsername).get();
    if (!usernameDoc.exists) {
      return res.status(401).json({ error: genericError });
    }

    const { uid } = usernameDoc.data()!;

    // 2. users 문서 조회
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: genericError });
    }
    const userData = userDoc.data()!;
    if (userData.status === 'PENDING') {
      return res.status(403).json({ error: "가입신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다." });
    }
    if (userData.status !== 'ACTIVE') {
      return res.status(403).json({ error: "비활성화된 계정입니다." });
    }

    // 3. authCredentials 문서 조회
    const credsRef = db.collection('authCredentials').doc(uid);
    const credsDoc = await credsRef.get();
    if (!credsDoc.exists) {
      return res.status(401).json({ error: genericError });
    }
    
    const creds = credsDoc.data()!;

    // 4. 잠금 상태 확인
    const now = Date.now();
    if (creds.lockedUntil && new Date(creds.lockedUntil).getTime() > now) {
      return res.status(403).json({ error: "로그인 시도가 여러 차례 실패하여 계정이 일시적으로 잠겼습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요." });
    }

    // 5. PIN 검증
    const isValid = verifyPin(pin, creds.pinHash, creds.pinSalt);
    if (!isValid) {
      let nextFailedCount = (creds.failedLoginCount || 0) + 1;
      const MAX_ATTEMPTS = parseInt(process.env.PIN_MAX_FAILED_ATTEMPTS || '5');
      const LOCK_MINUTES = parseInt(process.env.PIN_LOCK_MINUTES || '15');
      let newLockedUntil = null;

      if (nextFailedCount >= MAX_ATTEMPTS) {
        newLockedUntil = new Date(now + LOCK_MINUTES * 60000).toISOString();
      }

      await credsRef.update({
        failedLoginCount: nextFailedCount,
        lastFailedLoginAt: new Date().toISOString(),
        lockedUntil: newLockedUntil
      });

      return res.status(401).json({ error: genericError });
    }

    // 6. 성공 시 실패 횟수 초기화
    await credsRef.update({
      failedLoginCount: 0,
      lockedUntil: null
    });

    const expiresInHours = parseInt(process.env.FIREBASE_SESSION_EXPIRES_IN_HOURS || '12');
    const expiresInMs = expiresInHours * 60 * 60 * 1000;

    let sessionCookie: string;
    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    if (apiKey && process.env.FIREBASE_PROJECT_ID && !isLocalMode) {
      try {
        const customToken = await auth.createCustomToken(uid, {
          tenantId: userData.tenantId,
          role: userData.role,
          accountStatus: userData.status
        });

        const tokenRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken, returnSecureToken: true })
        });

        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.idToken) {
          sessionCookie = await auth.createSessionCookie(tokenData.idToken, { expiresIn: expiresInMs });
        } else {
          sessionCookie = await auth.createSessionCookie(JSON.stringify({
            uid,
            tenantId: userData.tenantId,
            role: userData.role,
            accountStatus: userData.status
          }), { expiresIn: expiresInMs });
        }
      } catch {
        sessionCookie = await auth.createSessionCookie(JSON.stringify({
          uid,
          tenantId: userData.tenantId,
          role: userData.role,
          accountStatus: userData.status
        }), { expiresIn: expiresInMs });
      }
    } else {
      sessionCookie = await auth.createSessionCookie(JSON.stringify({
        uid,
        tenantId: userData.tenantId,
        role: userData.role,
        accountStatus: userData.status
      }), { expiresIn: expiresInMs });
    }

    // 8. 쿠키 저장 및 토큰 발급
    res.cookie('__session', sessionCookie, {
      maxAge: expiresInMs,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });

    await db.collection('users').doc(uid).update({
      lastLoginAt: new Date().toISOString()
    });

    res.json({ success: true, redirectTo: "/calendar" });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "로그인 처리 중 서버 오류가 발생했습니다." });
  }
});

authRouter.post('/logout', async (req, res) => {
  res.clearCookie('__session', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });
  res.json({ success: true });
});

authRouter.get('/me', requireFirebaseSession, (req, res) => {
  // @ts-ignore
  res.json({ user: req.user });
});

authRouter.post('/change-pin', requireFirebaseSession, async (req, res) => {
  try {
    if (!db || !auth) throw new Error("Firebase is not initialized");

    // @ts-ignore
    const uid = req.user.uid;
    const { currentPin, newPin, newPinConfirm } = req.body;

    if (!currentPin || !newPin || !newPinConfirm) {
      return res.status(400).json({ error: "모든 필드를 입력해주세요." });
    }
    if (newPin !== newPinConfirm) {
      return res.status(400).json({ error: "새 PIN 확인값이 일치하지 않습니다." });
    }

    // @ts-ignore
    const pinError = validatePinFormat(newPin, req.user.username);
    if (pinError) {
      return res.status(400).json({ error: pinError });
    }

    const credsRef = db.collection('authCredentials').doc(uid);
    const credsDoc = await credsRef.get();
    if (!credsDoc.exists) return res.status(400).json({ error: "인증 정보를 찾을 수 없습니다." });

    const creds = credsDoc.data()!;
    
    if (!verifyPin(currentPin, creds.pinHash, creds.pinSalt)) {
      return res.status(400).json({ error: "현재 PIN이 올바르지 않습니다." });
    }

    if (currentPin === newPin) {
      return res.status(400).json({ error: "기존 PIN과 같은 PIN으로 변경할 수 없습니다." });
    }

    const salt = generateSalt();
    const pinHash = hashPin(newPin, salt);

    await credsRef.update({
      pinHash,
      pinSalt: salt,
      credentialVersion: (creds.credentialVersion || 1) + 1,
      mustChangePin: false,
      lastPinChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await db.collection('users').doc(uid).update({
      mustChangePin: false
    });

    try {
      await auth.revokeRefreshTokens(uid);
    } catch (revokeErr) {
      console.warn("Could not revoke refresh tokens:", revokeErr);
    }
    
    res.clearCookie('__session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });

    res.json({ success: true, message: "PIN이 변경되었습니다. 다시 로그인해주세요." });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: "PIN 변경 중 오류가 발생했습니다." });
  }
});

// 아이디 찾기 (이름, 소속, 휴대폰번호 일치 확인)
authRouter.post('/find-id', async (req, res) => {
  try {
    if (!db) throw new Error("Firebase is not initialized");
    const { name, organization, phoneNumber } = req.body;

    if (!name || !organization || !phoneNumber) {
      return res.status(400).json({ error: "이름, 소속, 휴대폰번호를 모두 입력해주세요." });
    }

    const trimmedName = name.trim();
    const trimmedOrg = organization.trim().toLowerCase();
    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');

    const usersSnapshot = await db.collection('users').get();
    let matchedUser: any = null;

    usersSnapshot.forEach((doc: any) => {
      const u = doc.data();
      if (!u) return;
      const uName = (u.name || '').trim();
      const uOrg = (u.organization || '').trim().toLowerCase();
      const uPhone = (u.phoneNumber || '').replace(/[^0-9]/g, '');

      if (uName === trimmedName && uOrg === trimmedOrg && uPhone === cleanPhone) {
        matchedUser = u;
      }
    });

    if (!matchedUser) {
      return res.status(404).json({ error: "일치하는 회원 정보를 찾을 수 없습니다. 이름, 소속, 휴대폰번호를 다시 확인해주세요." });
    }

    const username = matchedUser.username;
    const masked = username.length > 3 
      ? username.slice(0, 2) + '*'.repeat(username.length - 3) + username.slice(-1)
      : username.slice(0, 1) + '*'.repeat(username.length - 1);

    res.json({
      success: true,
      username: matchedUser.username,
      maskedUsername: masked,
      name: matchedUser.name,
      organization: matchedUser.organization,
      createdAt: matchedUser.createdAt
    });
  } catch (error: any) {
    console.error('Find ID error:', error);
    res.status(500).json({ error: error.message || "아이디 찾기 중 오류가 발생했습니다." });
  }
});

// PIN 재설정을 위한 본인 확인 (아이디 + 이름 + 소속 + 휴대폰번호)
authRouter.post('/verify-identity', async (req, res) => {
  try {
    if (!db) throw new Error("Firebase is not initialized");
    const { username, name, organization, phoneNumber } = req.body;

    if (!username || !name || !organization || !phoneNumber) {
      return res.status(400).json({ error: "아이디, 이름, 소속, 휴대폰번호를 모두 입력해주세요." });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedOrg = organization.trim().toLowerCase();
    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');

    const usernameDoc = await db.collection('usernames').doc(normalizedUsername).get();
    if (!usernameDoc.exists) {
      return res.status(404).json({ error: "일치하는 회원 정보를 찾을 수 없습니다." });
    }

    const { uid } = usernameDoc.data()!;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "일치하는 회원 정보를 찾을 수 없습니다." });
    }

    const u = userDoc.data()!;
    const uName = (u.name || '').trim();
    const uOrg = (u.organization || '').trim().toLowerCase();
    const uPhone = (u.phoneNumber || '').replace(/[^0-9]/g, '');

    if (uName !== trimmedName || uOrg !== trimmedOrg || uPhone !== cleanPhone) {
      return res.status(400).json({ error: "입력하신 정보(이름, 소속, 휴대폰번호)가 등록된 계정 정보와 일치하지 않습니다." });
    }

    res.json({ success: true, message: "본인 확인이 완료되었습니다." });
  } catch (error: any) {
    console.error('Verify identity error:', error);
    res.status(500).json({ error: "본인 확인 중 오류가 발생했습니다." });
  }
});

// PIN 재설정 (본인 확인 정보 검증 후 새 PIN 저장)
authRouter.post('/reset-pin', async (req, res) => {
  try {
    if (!db) throw new Error("Firebase is not initialized");
    const { username, name, organization, phoneNumber, newPin, newPinConfirm } = req.body;

    if (!username || !name || !organization || !phoneNumber || !newPin || !newPinConfirm) {
      return res.status(400).json({ error: "모든 항목을 입력해주세요." });
    }

    if (newPin !== newPinConfirm) {
      return res.status(400).json({ error: "새 PIN 확인값이 일치하지 않습니다." });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const pinError = validatePinFormat(newPin, normalizedUsername);
    if (pinError) {
      return res.status(400).json({ error: pinError });
    }

    const trimmedName = name.trim();
    const trimmedOrg = organization.trim().toLowerCase();
    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');

    const usernameDoc = await db.collection('usernames').doc(normalizedUsername).get();
    if (!usernameDoc.exists) {
      return res.status(404).json({ error: "일치하는 회원 정보를 찾을 수 없습니다." });
    }

    const { uid } = usernameDoc.data()!;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "일치하는 회원 정보를 찾을 수 없습니다." });
    }

    const u = userDoc.data()!;
    const uName = (u.name || '').trim();
    const uOrg = (u.organization || '').trim().toLowerCase();
    const uPhone = (u.phoneNumber || '').replace(/[^0-9]/g, '');

    if (uName !== trimmedName || uOrg !== trimmedOrg || uPhone !== cleanPhone) {
      return res.status(400).json({ error: "입력하신 정보(이름, 소속, 휴대폰번호)가 등록된 계정 정보와 일치하지 않습니다." });
    }

    const salt = generateSalt();
    const pinHash = hashPin(newPin, salt);

    const credsRef = db.collection('authCredentials').doc(uid);
    const credsDoc = await credsRef.get();
    const credsData = credsDoc.exists ? credsDoc.data() : {};

    await credsRef.set({
      uid,
      pinHash,
      pinSalt: salt,
      pinAlgorithm: "scrypt",
      pinVersion: (credsData?.pinVersion || 1) + 1,
      credentialVersion: (credsData?.credentialVersion || 1) + 1,
      failedLoginCount: 0,
      lockedUntil: null,
      lastPinChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await db.collection('users').doc(uid).update({
      mustChangePin: false,
      updatedAt: new Date().toISOString()
    });

    try {
      if (auth.revokeRefreshTokens) {
        await auth.revokeRefreshTokens(uid);
      }
    } catch {
      // Ignore if in local mode
    }

    res.json({ success: true, message: "PIN 번호가 성공적으로 재설정되었습니다. 새 PIN으로 로그인해주세요." });
  } catch (error: any) {
    console.error('Reset PIN error:', error);
    res.status(500).json({ error: error.message || "PIN 재설정 중 오류가 발생했습니다." });
  }
});
