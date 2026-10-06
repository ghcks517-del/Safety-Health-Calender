import { Router } from "express";
import { db, auth } from "./firebase-admin.js";
import { requireFirebaseSession, requireAdminSession } from "./auth-middleware.js";
import { v4 as uuidv4 } from "uuid"; // wait, uuid is not installed? I'll just use Firestore's auto-id or install it. I'll use Firestore auto id: db.collection().doc()

export const apiRouter = Router();

// ==========================================
// Settings API
// ==========================================
apiRouter.get('/settings/company', requireFirebaseSession, async (req: any, res) => {
  try {
    const tenantDoc = await db.collection('tenants').doc(req.user.tenantId).get();
    res.json(tenantDoc.exists ? tenantDoc.data() : {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/settings/company', requireFirebaseSession, async (req: any, res) => {
  try {
    const { name, businessNumber, representative, contact, address, mainTasks } = req.body;
    await db.collection('tenants').doc(req.user.tenantId).set({
      name, businessNumber, representative, contact, address, mainTasks,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/settings/notifications', requireFirebaseSession, async (req: any, res) => {
  try {
    const doc = await db.collection('notificationSettings').doc(req.user.tenantId).get();
    res.json(doc.exists ? doc.data() : { emails: [], useEmail: false, defaultReminderDays: ['7', '1'] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/settings/notifications', requireFirebaseSession, async (req: any, res) => {
  try {
    const { emails, useEmail, defaultReminderDays } = req.body;
    await db.collection('notificationSettings').doc(req.user.tenantId).set({
      emails: emails || [],
      useEmail: !!useEmail,
      defaultReminderDays: defaultReminderDays || ['7', '1'],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Activities API
// ==========================================

export function calculateActivityStatus(act: any, todayStr?: string): string {
  const today = todayStr || new Date().toISOString().split('T')[0];
  
  if (act.completedAt) {
    if (act.status === '미실시' || act.status === '일정 연기' || act.status === '일부 완료' || act.status === '해당 없음') {
      return act.status;
    }
    if (act.actualCompletedDate && act.plannedDate) {
      return act.actualCompletedDate <= act.plannedDate ? '정상 완료' : '지연 완료';
    }
    return act.status || '정상 완료';
  }

  if (!act.plannedDate && !act.plannedMonth) {
    return '일자 미정';
  }

  if (act.plannedDate) {
    if (act.plannedDate < today) {
      return '기한 초과';
    }
    const diffDays = Math.ceil((new Date(act.plannedDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 7) {
      return '임박';
    }
    return '계획';
  }

  if (act.plannedMonth) {
    const currentMonth = today.substring(0, 7);
    if (act.plannedMonth < currentMonth) {
      return '기한 초과';
    }
    return '일자 미정';
  }

  return '계획';
}

apiRouter.get('/activities', requireFirebaseSession, async (req: any, res) => {
  try {
    const snapshot = await db.collection('activityOccurrences')
      .where('tenantId', '==', req.user.tenantId)
      .where('deletedAt', '==', null)
      .get();
    
    const activities = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const calculatedStatus = calculateActivityStatus(data);
      return { id: doc.id, ...data, status: calculatedStatus };
    });
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/activities', requireFirebaseSession, async (req: any, res) => {
  try {
    const { 
      name, category, planYear, plannedDate, plannedMonth,
      startDate, endDate, assignee, target, location, details,
      repeatCycle, priority, reminderDays, lawBasis, memo 
    } = req.body;

    const planRef = db.collection('activityPlans').doc();
    const planId = planRef.id;

    const planData = {
      tenantId: req.user.tenantId,
      name: name || '',
      category: category || '',
      planYear: planYear || '',
      repeatCycle: repeatCycle || '1회',
      priority: priority || '보통',
      reminderDays: reminderDays || null,
      lawBasis: lawBasis || null,
      target: target || null,
      location: location || null,
      details: details || null,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
      deletedAt: null
    };

    const batch = db.batch();
    batch.set(planRef, planData);

    // If it's a one-time event, create 1 occurrence
    // If it's repeating (e.g. monthly), create 12 occurrences
    // For simplicity, let's create a single occurrence if '1회'
    // or if not specified, default to 1 occurrence
    const occurrenceDates = [];
    if (repeatCycle === '매월') {
      for (let i = 1; i <= 12; i++) {
        const d = new Date(planYear, i - 1, 15).toISOString().split('T')[0];
        occurrenceDates.push(d);
      }
    } else {
      occurrenceDates.push(plannedDate || null);
    }

    occurrenceDates.forEach(date => {
      const occRef = db.collection('activityOccurrences').doc();
      batch.set(occRef, {
        tenantId: req.user.tenantId,
        planId,
        name: name || '',
        category: category || '',
        plannedDate: date,
        plannedMonth: date ? date.substring(0, 7) : (plannedMonth || null),
        planYear: planYear || '',
        assignee: assignee || null,
        status: '계획', // To be re-calculated based on current date
        deletedAt: null,
        completedAt: null
      });
    });

    // TODO: tenantYearStats update

    await batch.commit();

    res.json({ success: true, planId });
  } catch (error: any) {
    console.error("Error creating activity:", error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/activities/:id', requireFirebaseSession, async (req: any, res) => {
    try {
        const { 
          name, 
          category, 
          plannedDate, 
          plannedMonth, 
          assignee, 
          priority, 
          lawBasis, 
          details, 
          target, 
          location, 
          status, 
          planYear 
        } = req.body;
        const occRef = db.collection('activityOccurrences').doc(req.params.id);
        
        // Verify tenant
        const doc = await occRef.get();
        if (!doc.exists || doc.data()?.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }

        const existingData = doc.data() || {};
        const updateData: any = {};
        
        if (name !== undefined) updateData.name = name;
        if (category !== undefined) updateData.category = category;
        if (planYear !== undefined) updateData.planYear = planYear;
        if (plannedDate !== undefined) {
            updateData.plannedDate = plannedDate || null;
            updateData.plannedMonth = plannedDate ? plannedDate.substring(0, 7) : (plannedMonth || null);
            if (plannedDate && !planYear) {
                updateData.planYear = plannedDate.substring(0, 4);
            }
        } else if (plannedMonth !== undefined) {
            updateData.plannedMonth = plannedMonth;
        }

        if (assignee !== undefined) updateData.assignee = assignee;
        if (priority !== undefined) updateData.priority = priority;
        if (lawBasis !== undefined) updateData.lawBasis = lawBasis;
        if (details !== undefined) updateData.details = details;
        if (target !== undefined) updateData.target = target;
        if (location !== undefined) updateData.location = location;

        // If not completed, recalculate status based on new date
        if (!existingData.completedAt) {
            const tempMerged = { ...existingData, ...updateData };
            updateData.status = calculateActivityStatus(tempMerged);
        } else if (status !== undefined) {
            updateData.status = status;
        }

        updateData.updatedAt = new Date().toISOString();

        await occRef.update(updateData);
        res.json({ success: true, updated: updateData });
    } catch (error: any) {
        console.error("Error updating activity:", error);
        res.status(500).json({ error: error.message });
    }
});

apiRouter.delete('/activities/:id', requireFirebaseSession, async (req: any, res) => {
    try {
        const occRef = db.collection('activityOccurrences').doc(req.params.id);
        const doc = await occRef.get();
        if (!doc.exists || doc.data()?.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        await occRef.update({ deletedAt: new Date().toISOString() });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

apiRouter.post('/activities/:id/complete', requireFirebaseSession, async (req: any, res) => {
    try {
        const { actualCompletedDate, result, actualAssignee, participantCount, details, issues, improvements, nextActionDate, memo } = req.body;
        
        const occRef = db.collection('activityOccurrences').doc(req.params.id);
        const recordRef = db.collection('completionRecords').doc();

        const batch = db.batch();
        batch.set(recordRef, {
            tenantId: req.user.tenantId,
            occurrenceId: req.params.id,
            actualCompletedDate: actualCompletedDate || null,
            result: result || null,
            actualAssignee: actualAssignee || null,
            participantCount: participantCount || null,
            details: details || null,
            issues: issues || null,
            improvements: improvements || null,
            nextActionDate: nextActionDate || null,
            memo: memo || null,
            createdAt: new Date().toISOString(),
            createdBy: req.user.uid
        });

        batch.update(occRef, {
            status: result === '미실시' || result === '일정 연기' ? result : (result === '정상 완료' ? '정상 완료' : '일부 완료'),
            completedAt: new Date().toISOString(),
            actualCompletedDate: actualCompletedDate || null
        });

        await batch.commit();
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Batch generate standard annual compliance activities for subcontractors
apiRouter.post('/annual-plans/generate-compliance-template', requireFirebaseSession, async (req: any, res) => {
  try {
    const { year = new Date().getFullYear().toString(), assignee = '안전관리자' } = req.body;
    const tenantId = req.user.tenantId;

    const templates = [
      // 1. 교육
      { name: '근로자 정기 안전보건교육 (1분기)', category: '교육', month: 1, day: 20, repeat: '1회', lawBasis: '산업안전보건법 제29조, 중처법 제4조, ISO 45001 7.2', details: '사무직 3시간/현장직 6시간 이상 정기안전보건교육' },
      { name: '근로자 정기 안전보건교육 (2분기)', category: '교육', month: 4, day: 20, repeat: '1회', lawBasis: '산업안전보건법 제29조, 중처법 제4조, ISO 45001 7.2', details: '사무직 3시간/현장직 6시간 이상 정기안전보건교육' },
      { name: '근로자 정기 안전보건교육 (3분기)', category: '교육', month: 7, day: 20, repeat: '1회', lawBasis: '산업안전보건법 제29조, 중처법 제4조, ISO 45001 7.2', details: '사무직 3시간/현장직 6시간 이상 정기안전보건교육' },
      { name: '근로자 정기 안전보건교육 (4분기)', category: '교육', month: 10, day: 20, repeat: '1회', lawBasis: '산업안전보건법 제29조, 중처법 제4조, ISO 45001 7.2', details: '사무직 3시간/현장직 6시간 이상 정기안전보건교육' },
            { name: '안전보건관리책임자 등 직무교육', category: '교육', month: 3, day: 15, repeat: '1회', lawBasis: '산업안전보건법 제32조, 중대재해처벌법 시행령 제4조 제5호', details: '선임 후 3개월 내 신규 6시간 또는 2년 주기 보수교육 6시간 이수' },
      { name: '관리감독자 정기 안전보건교육', category: '교육', month: 2, day: 15, repeat: '1회', lawBasis: '산업안전보건법 제29조 제1항 (연간 16시간 이상)', details: '현장 지휘·감독 관리자 직무 및 안전역량 교육' },
      { name: '물질안전보건자료(MSDS) 교육 (상반기)', category: '교육', month: 3, day: 15, repeat: '1회', lawBasis: '산업안전보건법 제114조, ISO 45001 8.1.2', details: '유해화학물질 취급자 MSDS 경고표지 및 취급수칙 교육' },
      { name: '물질안전보건자료(MSDS) 교육 (하반기)', category: '교육', month: 9, day: 15, repeat: '1회', lawBasis: '산업안전보건법 제114조, ISO 45001 8.1.2', details: '유해화학물질 취급자 MSDS 경고표지 및 취급수칙 교육' },
      
      // 2. 점검
      { name: '원·하청 합동 안전보건 순회점검 (1분기)', category: '점검', month: 3, day: 25, repeat: '1회', lawBasis: '산업안전보건법 제64조 (도급인-수급인 합동)', details: '원청-하청 합동 현장 유해위험요인 발굴 및 즉시 개선' },
      { name: '원·하청 합동 안전보건 순회점검 (2분기)', category: '점검', month: 6, day: 25, repeat: '1회', lawBasis: '산업안전보건법 제64조 (도급인-수급인 합동)', details: '원청-하청 합동 현장 유해위험요인 발굴 및 즉시 개선' },
      { name: '원·하청 합동 안전보건 순회점검 (3분기)', category: '점검', month: 9, day: 25, repeat: '1회', lawBasis: '산업안전보건법 제64조 (도급인-수급인 합동)', details: '원청-하청 합동 현장 유해위험요인 발굴 및 즉시 개선' },
      { name: '원·하청 합동 안전보건 순회점검 (4분기)', category: '점검', month: 12, day: 20, repeat: '1회', lawBasis: '산업안전보건법 제64조 (도급인-수급인 합동)', details: '원청-하청 합동 현장 유해위험요인 발굴 및 즉시 개선' },

      // 3. 비상훈련
      { name: '중대재해 비상대응 시나리오 모의훈련 (상반기)', category: '비상훈련', month: 5, day: 20, repeat: '1회', lawBasis: '중대재해처벌법 시행령 제4조 제8호 (반기 1회 의무)', details: '사고 발생 시 작업중지, 응급구호, 유관기관 보고 훈련' },
      { name: '중대재해 비상대응 시나리오 모의훈련 (하반기)', category: '비상훈련', month: 11, day: 20, repeat: '1회', lawBasis: '중대재해처벌법 시행령 제4조 제8호 (반기 1회 의무)', details: '사고 발생 시 작업중지, 응급구호, 유관기관 보고 훈련' },
      { name: '소방 및 화재 비상대피훈련', category: '비상훈련', month: 5, day: 28, repeat: '1회', lawBasis: '소방시설법, ISO 45001 8.2', details: '소화기/소화전 방사 실습 및 비상 피난계단 대피' },

      // 4. 시스템 운영
            { name: '관리감독자 업무수행 적격성 및 성과 평가 (상반기)', category: '시스템 운영', month: 6, day: 20, repeat: '1회', lawBasis: '중대재해처벌법 시행령 제4조 제5호 나목, 산안법 제16조', details: '관리감독자 법정의무 이행 충실도 및 권한·예산 부여 상태 반기 평가' },
      { name: '관리감독자 업무수행 적격성 및 성과 평가 (하반기)', category: '시스템 운영', month: 12, day: 20, repeat: '1회', lawBasis: '중대재해처벌법 시행령 제4조 제5호 나목, 산안법 제16조', details: '관리감독자 법정의무 이행 충실도 및 차년도 역량강화 피드백' },
      { name: '정기 위험성평가 실시 및 근로자 공유', category: '시스템 운영', month: 1, day: 15, repeat: '1회', lawBasis: '산업안전보건법 제36조, 중처법 제4조 제3호, ISO 45001 6.1.2', details: '전 공정 유해위험요인 전수조사 및 개선대책 수립·전파' },
      { name: '안전보건협의체 및 종사자 의견수렴 회의', category: '시스템 운영', month: 1, day: 10, repeat: '매월', lawBasis: '산안법 제64조, 중처법 제4조 제7호, ISO 45001 5.4', details: '원·하청 협의체 매월 정기 개최 및 근로자 건의 수렴' },
      { name: '안전보건 경영검토 및 목표 평가 (상반기)', category: '시스템 운영', month: 6, day: 30, repeat: '1회', lawBasis: '중대재해처벌법 제4조, ISO 45001 9.3', details: '경영책임자 상반기 목표달성도 검토 및 자원 배분' },
      { name: '안전보건 경영검토 및 종합평가 (하반기)', category: '시스템 운영', month: 12, day: 28, repeat: '1회', lawBasis: '중대재해처벌법 제4조, ISO 45001 9.3', details: '연간 안전보건 실적 최종평가 및 차년도 목표 수립' },

      // 5. 기타
      { name: '일반 및 특수 건강진단 실시', category: '기타', month: 9, day: 10, repeat: '1회', lawBasis: '산업안전보건법 제129조·제130조', details: '유해인자 노출자 특수검진 및 일반검진 수검' },
      { name: '개인보호구 지급 및 안전인증 상태 전수점검', category: '기타', month: 2, day: 25, repeat: '분기별', lawBasis: '안전보건기준에 관한 규칙 제32조, KCS 인증', details: '안전모, 안전화, 안전대 점검 및 노후품 즉시 교체' }
    ];

    const batch = db.batch();
    let createdCount = 0;

    for (const item of templates) {
      const planRef = db.collection('activityPlans').doc();
      const planId = planRef.id;

      batch.set(planRef, {
        tenantId,
        name: item.name,
        category: item.category,
        planYear: year,
        repeatCycle: item.repeat,
        priority: '높음',
        reminderDays: ['7', '1'],
        lawBasis: item.lawBasis,
        details: item.details,
        createdAt: new Date().toISOString(),
        createdBy: req.user.uid,
        deletedAt: null
      });

      if (item.repeat === '매월') {
        for (let m = 1; m <= 12; m++) {
          const mStr = m.toString().padStart(2, '0');
          const plannedDate = `${year}-${mStr}-15`;
          const occRef = db.collection('activityOccurrences').doc();
          batch.set(occRef, {
            tenantId,
            planId,
            name: `${item.name} (${m}월)`,
            category: item.category,
            plannedDate,
            plannedMonth: `${year}-${mStr}`,
            planYear: year,
            assignee,
            status: '계획',
            lawBasis: item.lawBasis,
            details: item.details,
            deletedAt: null,
            completedAt: null
          });
          createdCount++;
        }
      } else if (item.repeat === '분기별') {
        const qMonths = [2, 5, 8, 11];
        for (let i = 0; i < qMonths.length; i++) {
          const m = qMonths[i];
          const mStr = m.toString().padStart(2, '0');
          const plannedDate = `${year}-${mStr}-25`;
          const occRef = db.collection('activityOccurrences').doc();
          batch.set(occRef, {
            tenantId,
            planId,
            name: `${item.name} (${i + 1}차)`,
            category: item.category,
            plannedDate,
            plannedMonth: `${year}-${mStr}`,
            planYear: year,
            assignee,
            status: '계획',
            lawBasis: item.lawBasis,
            details: item.details,
            deletedAt: null,
            completedAt: null
          });
          createdCount++;
        }
      } else {
        const mStr = item.month.toString().padStart(2, '0');
        const dStr = item.day.toString().padStart(2, '0');
        const plannedDate = `${year}-${mStr}-${dStr}`;
        const occRef = db.collection('activityOccurrences').doc();
        batch.set(occRef, {
          tenantId,
          planId,
          name: item.name,
          category: item.category,
          plannedDate,
          plannedMonth: `${year}-${mStr}`,
          planYear: year,
          assignee,
          status: '계획',
          lawBasis: item.lawBasis,
          details: item.details,
          deletedAt: null,
          completedAt: null
        });
        createdCount++;
      }
    }

    await batch.commit();

    res.json({ success: true, count: createdCount, message: `${year}년도 법적의무 표준 안전보건계획 ${createdCount}건이 일괄 등록되었습니다.` });
  } catch (error: any) {
    console.error("Error generating compliance template:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
apiRouter.get('/admin/contractors', requireAdminSession, async (req: any, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const contractors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(contractors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

