import { db, auth } from './firebase-admin.js';

export async function requireFirebaseSession(req: any, res: any, next: any) {
  const sessionCookie = req.cookies.__session || '';
  if (!sessionCookie) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  if (!auth || !db) {
    return res.status(500).json({ error: '서버 설정 오류.' });
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: '유효하지 않은 계정입니다.' });
    }
    
    const userData = userDoc.data()!;
    
    assertActiveAccount(userData);
    assertTenantOwnership(decodedClaims.tenantId, userData.tenantId);
    
    req.user = {
      uid: decodedClaims.uid,
      tenantId: decodedClaims.tenantId,
      role: decodedClaims.role,
      ...userData
    };
    
    next();
  } catch (error: any) {
    res.status(error.status || 401).json({ error: error.message || '세션이 만료되었거나 유효하지 않습니다.' });
  }
}

export function assertActiveAccount(userData: any) {
  if (userData.status !== 'ACTIVE') {
    const error: any = new Error('계정이 활성화되지 않았습니다.');
    error.status = 403;
    throw error;
  }
}

export function assertTenantOwnership(tokenTenantId: string, userTenantId: string) {
  if (tokenTenantId !== userTenantId) {
    const error: any = new Error('권한이 없습니다 (Tenant 불일치).');
    error.status = 403;
    throw error;
  }
}

export function requireTenantSession(req: any, res: any, next: any) {
  requireFirebaseSession(req, res, () => {
    // Check specific tenant if required, but ownership is already asserted in requireFirebaseSession
    next();
  });
}

export function requireAdminSession(req: any, res: any, next: any) {
  requireFirebaseSession(req, res, () => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  });
}

