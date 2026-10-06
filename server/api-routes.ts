import { Router } from "express";
import { db, auth } from "./firebase-admin.js";
import { requireFirebaseSession, requireAdminSession } from "./auth-middleware.js";
import { getEmailConfigStatus, sendNotificationEmail } from "./email-service.js";

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
    const settings = doc.exists ? doc.data() : { emails: [], useEmail: false, defaultReminderDays: ['7', '3', '1'], notifyOnDelay: true };
    const emailConfig = getEmailConfigStatus();
    res.json({ ...settings, emailConfig });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/settings/notifications', requireFirebaseSession, async (req: any, res) => {
  try {
    const { emails, useEmail, defaultReminderDays, notifyOnDelay, notifyCategories } = req.body;
    await db.collection('notificationSettings').doc(req.user.tenantId).set({
      emails: emails || [],
      useEmail: !!useEmail,
      defaultReminderDays: defaultReminderDays || ['7', '3', '1'],
      notifyOnDelay: notifyOnDelay !== false,
      notifyCategories: notifyCategories || ['교육', '점검', '비상훈련', '시스템 운영', '기타'],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/settings/notifications/test-email', requireFirebaseSession, async (req: any, res) => {
  try {
    const { targetEmail } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: '수신 이메일 주소를 입력해주세요.' });
    }

    const result = await sendNotificationEmail({
      to: targetEmail,
      subject: '[Safety & Health Calender] 안전보건활동 알림 서비스 테스트 메일',
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', Pretendard, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #ea580c; margin: 0; font-size: 20px;">Safety & Health Calender</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">안전보건활동 운영 관리 시스템 자동 알림</p>
          </div>
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">
            안녕하세요! <strong>Safety & Health Calender</strong> 이메일 알림 연동 테스트 메일입니다.
          </p>
          <div style="background: #fff7ed; border: 1px solid #fdba74; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #9a3412; font-weight: bold; margin: 0 0 8px; font-size: 14px;">[예시] D-7일 도래 예정 안전보건활동 안내</p>
            <ul style="color: #431407; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
              <li><strong>활동명:</strong> 3분기 현장 정기안전점검</li>
              <li><strong>분야:</strong> 점검</li>
              <li><strong>예정일:</strong> 7일 후 예정</li>
              <li><strong>법적 기준:</strong> 산업안전보건법 제64조</li>
            </ul>
          </div>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            이 메일이 정상적으로 수신되었다면, 앞으로 등록된 캘린더 일정의 D-7, D-3, D-1일 및 지연 발생 시 알림을 받으실 수 있습니다.
          </p>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; font-size: 11px; color: #94a3b8;">
            본 메일은 안전보건활동 캘린더 시스템 설정에서 발송된 테스트 메일입니다.
          </div>
        </div>
      `,
      text: 'Safety & Health Calender 알림 연동 테스트 메일입니다. 본 메일이 수신되면 활동 임박 및 지연 알림을 정상적으로 받으실 수 있습니다.'
    });

    res.json(result);
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

    // 회차별 발생 일정 목록 결정 (분기: 4회, 반기: 2회, 매월: 12회, 1회: 1회)
    const occurrencesToCreate: Array<{ round: number; label: string; date: string | null }> = [];

    if (Array.isArray(req.body.customOccurrences) && req.body.customOccurrences.length > 0) {
      req.body.customOccurrences.forEach((item: any, idx: number) => {
        if (item && item.date) {
          occurrencesToCreate.push({
            round: item.round || idx + 1,
            label: item.label || `${idx + 1}차`,
            date: item.date
          });
        }
      });
    } else if (Array.isArray(req.body.plannedDates) && req.body.plannedDates.length > 0) {
      req.body.plannedDates.forEach((d: string, idx: number) => {
        if (d) {
          occurrencesToCreate.push({
            round: idx + 1,
            label: `${idx + 1}차`,
            date: d
          });
        }
      });
    } else if (repeatCycle === '매월') {
      for (let i = 1; i <= 12; i++) {
        const mm = String(i).padStart(2, '0');
        occurrencesToCreate.push({
          round: i,
          label: `${i}차`,
          date: `${planYear}-${mm}-15`
        });
      }
    } else if (repeatCycle === '분기' || repeatCycle === '분기별') {
      const qMonths = ['03', '06', '09', '12'];
      for (let i = 0; i < 4; i++) {
        occurrencesToCreate.push({
          round: i + 1,
          label: `${i + 1}차`,
          date: `${planYear}-${qMonths[i]}-20`
        });
      }
    } else if (repeatCycle === '반기' || repeatCycle === '반기별') {
      const hMonths = ['06', '12'];
      for (let i = 0; i < 2; i++) {
        occurrencesToCreate.push({
          round: i + 1,
          label: `${i + 1}차`,
          date: `${planYear}-${hMonths[i]}-20`
        });
      }
    } else {
      occurrencesToCreate.push({
        round: 1,
        label: '1차',
        date: plannedDate || null
      });
    }

    // 만약 customOccurrences에서 유효한 일자가 없을 때 fallback
    if (occurrencesToCreate.length === 0) {
      occurrencesToCreate.push({
        round: 1,
        label: '1차',
        date: plannedDate || null
      });
    }

    occurrencesToCreate.forEach(occ => {
      const occRef = db.collection('activityOccurrences').doc();
      const nameWithRound = occurrencesToCreate.length > 1 && !name.includes(occ.label)
        ? `${name} (${occ.label})`
        : (name || '');

      batch.set(occRef, {
        tenantId: req.user.tenantId,
        planId,
        round: occ.round,
        roundLabel: occ.label,
        name: nameWithRound,
        baseName: name || '',
        category: category || '',
        repeatCycle: repeatCycle || '1회',
        plannedDate: occ.date,
        plannedMonth: occ.date ? occ.date.substring(0, 7) : (plannedMonth || null),
        planYear: planYear || (occ.date ? occ.date.substring(0, 4) : ''),
        assignee: assignee || null,
        priority: priority || '보통',
        lawBasis: lawBasis || null,
        details: details || null,
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

