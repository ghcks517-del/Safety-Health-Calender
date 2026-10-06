import * as XLSX from 'xlsx';

export interface ExportPlanItem {
  id: string;
  name: string;
  category: string;
  plannedDate?: string;
  plannedMonth?: string;
  repeatCycle?: string;
  lawBasis?: string;
  details?: string;
  assignee?: string;
  status: string;
  completedAt?: string;
  actualCompletedDate?: string;
  result?: string;
  resultDetails?: string;
}

/**
 * Parses raw activity details to extract execution instructions and document requirements
 */
function parsePlanDetails(plan: ExportPlanItem) {
  const rawDetails = (plan.details || '').trim();
  let content = rawDetails;
  let docs = '-';

  if (rawDetails.includes('[필수 증빙서류]') || rawDetails.includes('[필수 구비/증빙 서류]') || rawDetails.includes('[필수 구비 서류]')) {
    const parts = rawDetails.split(/\[필수 (?:구비\/)?증빙서류(?:\s*요건)?\]/);
    if (parts.length > 1) {
      const afterTag = parts[1];
      const nextTagIdx = afterTag.indexOf('\n\n[');
      if (nextTagIdx !== -1) {
        docs = afterTag.substring(0, nextTagIdx).trim();
        content = (parts[0] + '\n' + afterTag.substring(nextTagIdx)).replace(/\n\n+/g, '\n').trim();
      } else {
        docs = afterTag.trim();
        content = parts[0].trim();
      }
    }
  }

  // Clean up content tags for clean document presentation
  content = content
    .replace(/^\[세부 실행 요건\]\s*/gm, '')
    .replace(/^\[법적 기준(?:\s*및\s*대상)?\]\s*/gm, '기준: ')
    .replace(/^\[공통 법령\]\s*/gm, '')
    .trim();

  if (!content) {
    content = `${plan.name} 관련 산업안전보건 법령 및 사내 안전규정 준수 시행`;
  }

  if (!docs || docs === '-') {
    // Provide sensible regulatory standard documentation requirement
    if (plan.category === '교육') {
      docs = '안전보건교육 일지, 자필 서명부, 교육 교재 사본, 현장 교육 사진대장, 평가결과표';
    } else if (plan.category === '점검') {
      docs = '안전보건 점검표(체크리스트), 지적사항 개선조치 전·후 사진대장, 시정확인서';
    } else if (plan.category === '비상훈련') {
      docs = '비상대응 훈련 시나리오, 훈련 결과보고서, 평가 및 개선대책서, 훈련 사진대지';
    } else if (plan.category === '시스템 운영') {
      docs = '위험성평가표, 근로자 참여 서명부, 개선계획서, 회의록 및 결재문서 (3년 보존)';
    } else {
      docs = '실행 계획서, 실시 결과보고서, 근로자 확인 서명부';
    }
  }

  return { content, docs };
}

export function exportAnnualPlanToExcel({
  year,
  companyName,
  plans,
}: {
  year: string;
  companyName?: string;
  plans: ExportPlanItem[];
}) {
  const completedCount = plans.filter(p => p.status === '정상 완료' || p.status === '일부 완료' || p.status === '지연 완료').length;
  const overdueCount = plans.filter(p => p.status === '기한 초과').length;
  const incompleteCount = plans.length - completedCount;
  const completionRate = plans.length > 0 ? Math.round((completedCount / plans.length) * 100) : 0;
  const businessName = companyName || '안전보건관리 협력사업장';

  // Build Array of Arrays (AOA) - Single Sheet (내용 중심 공식 서식)
  // Columns (Total 8 Columns: A to H)
  // A (0): 연번
  // B (1): 대분류
  // C (2): 중분류 (추진 과제명)
  // D (3): 법적 및 규정 근거
  // E (4): 세부 실행 기준 및 계획 내용
  // F (5): 필수 구비 증빙서류 (감독·심사 제출용)
  // G (6): 담당자 (주관)
  // H (7): 추진 실적 및 이행 결과

  const data: any[][] = [];

  // Row 0 (Excel 1) - Formal Document Title & Signature Header
  data.push([
    `[ ${year}년도 안전보건관리 연간 종합계획서 ]`, '', '', '',
    '결  재', '작  성  자', '검  토  자', '승  인  자'
  ]);

  // Row 1 (Excel 2) - Business Metadata & Signature Stamp Area 1
  data.push([
    `■ 사업장명: ${businessName}   |   ■ 대상연도: ${year}년도   |   ■ 문서구분: 안전보건관리계획`, '', '', '',
    '', '( 서  명 )', '( 서  명 )', '( 서 명 / 인 )'
  ]);

  // Row 2 (Excel 3) - Purpose & Signature Stamp Area 2
  data.push([
    `■ 수립목적: 중대재해 Zero화 및 산업안전보건법·중대재해처벌법 법적 의무 이행 체계 확립`, '', '', '',
    '', '', '', ''
  ]);

  // Row 3 (Excel 4) - Leadership & Approval Dates
  data.push([
    `■ 총괄책임자: 현장소장 / 대표이사   |   ■ 주관부서: 안전보건관리팀   |   ■ 수립일자: ${year}년 01월`, '', '', '',
    '', `${year}.    .    .`, `${year}.    .    .`, `${year}.    .    .`
  ]);

  // Row 4 (Excel 5) - Overall KPI & Implementation Status Banner
  data.push([
    `■ 종합 추진 현황: 총 계획 과제 ${plans.length}건  |  이행 완료 ${completedCount}건  |  추진 중 ${incompleteCount}건  |  지연·초과 ${overdueCount}건  |  종합 달성률: ${completionRate}%`,
    '', '', '', '', '', '', ''
  ]);

  // Row 5 (Excel 6) - Spacing Row
  data.push(['', '', '', '', '', '', '', '']);

  // Row 6 (Excel 7) - Main Table Headers (일정 컬럼 제외, 내용 중심)
  data.push([
    '연번',
    '대분류',
    '중분류 (추진 과제명)',
    '법적 및 규정 근거',
    '세부 실행 기준 및 계획 내용',
    '필수 구비 증빙서류 (감독·심사 제출용)',
    '담당자 (주관)',
    '추진 실적 및 이행 결과'
  ]);

  // Row 7+ (Excel 8+) - Data Rows
  plans.forEach((plan, idx) => {
    const { content, docs } = parsePlanDetails(plan);

    // Format performance text cleanly for official documentation
    let performanceText = '계획 수립 (정상 추진 중)';
    if (plan.completedAt || plan.actualCompletedDate) {
      const finishDate = plan.actualCompletedDate || (plan.completedAt ? plan.completedAt.substring(0, 10) : '');
      const res = plan.result || plan.status || '정상 완료';
      performanceText = `[이행완료] ${finishDate} ${res}`;
      if (plan.resultDetails) {
        performanceText += `\n- 비고: ${plan.resultDetails}`;
      }
    } else if (plan.status === '기한 초과') {
      performanceText = '[기한초과] 즉시 개선조치 및 이행 필요';
    } else if (plan.status === '임박') {
      performanceText = '[기한임박] 중점 관리 및 사전 준비 중';
    }

    data.push([
      idx + 1,
      plan.category || '기타',
      plan.name || '-',
      plan.lawBasis || '산업안전보건법 및 중대재해처벌법 관련 조항',
      content,
      docs,
      plan.assignee || '안전관리자',
      performanceText
    ]);
  });

  // Summary Row at the bottom
  data.push([
    '합계',
    `총 ${plans.length}개 과제`,
    '',
    '법정 안전보건 의무 사항 전수 반영',
    `완료 ${completedCount}건  |  추진 중 ${incompleteCount}건  |  초과 ${overdueCount}건`,
    '전 항목 필수 증빙서류 구비 및 현장 비치 관리',
    '전담 안전관리조직',
    `종합 달성률: ${completionRate}% (${completedCount}/${plans.length}건 완료)`
  ]);

  // Regulatory Declaration & 3-year preservation note
  data.push([
    `※ 법적 효력 및 보존 규정: 본 계획서는 산업안전보건법 제14조(안전보건관리책임자), 제29조(안전보건교육), 제36조(위험성평가) 및 중대재해처벌법 시행령 제4조에 의거 수립되었으며, 근로자 대표 의견 수렴을 거쳐 현장 게시 및 TBM을 통해 전 근로자에게 주지시키고 관련 증빙서류를 3년간 의무 보존합니다.`,
    '', '', '', '', '', '', ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merged Cells Configuration
  const totalRows = data.length;
  ws['!merges'] = [
    // Header Left Merges: Row 0 to 3, Columns A-D (0,0 to 0,3)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Business Metadata
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Purpose
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, // Manager & Date
    
    // Top Right Signature Block Merges:
    // "결재" header merge vertically: Row 0 to 3, Column E (0,4 to 3,4)
    { s: { r: 0, c: 4 }, e: { r: 3, c: 4 } },
    // Signature stamping area: Row 1 to 2 for F, G, H
    { s: { r: 1, c: 5 }, e: { r: 2, c: 5 } }, // 작성자 서명 공간
    { s: { r: 1, c: 6 }, e: { r: 2, c: 6 } }, // 검토자 서명 공간
    { s: { r: 1, c: 7 }, e: { r: 2, c: 7 } }, // 승인자 서명 공간

    // Summary KPI Banner: Row 4, Columns A-H (4,0 to 4,7)
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },

    // Bottom Summary row merges:
    { s: { r: totalRows - 2, c: 1 }, e: { r: totalRows - 2, c: 2 } }, // 합계 과제명
    
    // Regulatory Declaration Note merge: Last row, Columns A-H
    { s: { r: totalRows - 1, c: 0 }, e: { r: totalRows - 1, c: 7 } }
  ];

  // Column Widths for Clear Document Layout (A to H)
  ws['!cols'] = [
    { wch: 7 },  // A: 연번
    { wch: 14 }, // B: 대분류
    { wch: 36 }, // C: 중분류 (추진 과제명)
    { wch: 36 }, // D: 법적 및 규정 근거
    { wch: 54 }, // E: 세부 실행 기준 및 계획 내용
    { wch: 42 }, // F: 필수 구비 증빙서류
    { wch: 15 }, // G: 담당자 (주관)
    { wch: 34 }  // H: 추진 실적 및 이행 결과
  ];

  // Row Heights for Professional Layout
  const rowHeights: { hpt: number }[] = [
    { hpt: 30 }, // Row 0: Title & Top Sign Header
    { hpt: 26 }, // Row 1: Sign Stamping Area Top
    { hpt: 26 }, // Row 2: Sign Stamping Area Bottom (총 52pt의 넉넉한 서명/직인란)
    { hpt: 24 }, // Row 3: Manager & Date Row
    { hpt: 26 }, // Row 4: KPI Summary Banner
    { hpt: 10 }, // Row 5: Spacing Row
    { hpt: 30 }, // Row 6: Main Table Column Headers
  ];

  // Set standard comfortable height for all data rows
  for (let i = 7; i < totalRows - 2; i++) {
    rowHeights.push({ hpt: 36 });
  }
  // Summary & Declaration Row heights
  rowHeights.push({ hpt: 28 }); // Summary row
  rowHeights.push({ hpt: 34 }); // Regulatory Declaration Note

  ws['!rows'] = rowHeights;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${year}년 안전보건계획서`);

  // Download file as `[해당 연도] 안전보건활동 계획서.xlsx`
  const fileName = `[${year}년] 안전보건활동 계획서.xlsx`;
  XLSX.writeFile(wb, fileName);
}
