export interface ComplianceSubOption {
  id: string;
  name: string;
  badge?: string; // e.g. "16시간", "1단계", "2단계"
  summary: string;
  legalStandard: string;
  requiredDocs: string;
  lawBasis?: string;
  target?: string;
  assignee?: string;
}

export interface ComplianceStandard {
  id: string;
  name: string;
  category: '교육' | '점검' | '비상훈련' | '시스템 운영' | '기타';
  recommendedCycle: '매일' | '매주' | '매월' | '분기 1회' | '반기 1회' | '연 1회' | '수시';
  defaultMonth?: number; // 1 to 12 recommended
  repeatCycle: '1회' | '매월' | '분기별' | '반기별';
  priority: '높음' | '보통';
  
  // Legal & Standards
  oshaBasis: string;     // 산업안전보건법
  sapaBasis: string;     // 중대재해처벌법
  isoBasis: string;      // ISO 45001 (안전보건경영시스템)
  
  summary: string;       // 한눈에 보는 핵심 요약
  legalStandard: string; // 법적 기준 및 시간/자격/주기 요건
  requiredDocs: string;  // 필수 구비 서류 / 증빙 자료
  penalties: string;     // 위반 시 제재 / 벌칙

  // Sub options when detailed specialization is available
  subOptionsLabel?: string;
  subOptions?: ComplianceSubOption[];
}

export const SAFETY_CATEGORIES = ['교육', '점검', '비상훈련', '시스템 운영', '기타'] as const;
export type SafetyCategory = typeof SAFETY_CATEGORIES[number];

export const COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  // ==========================================
  // 1. 교육 (Education & Training)
  // ==========================================
  {
    id: 'edu-regular-worker',
    name: '근로자 정기 안전보건교육 (분기별)',
    category: '교육',
    recommendedCycle: '분기 1회',
    repeatCycle: '분기별',
    priority: '높음',
    oshaBasis: '산업안전보건법 제29조 제1항 및 시행규칙 제26조 별표4',
    sapaBasis: '중대재해처벌법 시행령 제4조 제5호 (안전보건교육 및 역량강화)',
    isoBasis: 'ISO 45001 7.2 (적격성) & 7.3 (인식)',
    summary: '모든 현장 및 사무직 근로자를 대상으로 분기마다 의무 실시하는 정기 교육',
    legalStandard: '사무직·판매직: 매분기 3시간 이상 / 사무직 외(생산·현장직): 매분기 6시간 이상',
    requiredDocs: '교육일지, 교육자료, 참석자 서명부(자필), 현장 교육사진, 평가결과',
    penalties: '미실시 시 근로자 1인당 최대 50만원 과태료 부과 (위반 횟수별 가중)'
  },
  {
    id: 'edu-safety-manager',
    name: '안전보건관리책임자 등 직무교육',
    category: '교육',
    recommendedCycle: '연 1회',
    repeatCycle: '1회',
    defaultMonth: 3,
    priority: '높음',
    oshaBasis: '산업안전보건법 제32조 (직무교육) 및 시행규칙 제29조~제30조 별표4·별표5',
    sapaBasis: '중대재해처벌법 시행령 제4조 제5호 (안전보건관리책임자등의 역량 및 교육 이수)',
    isoBasis: 'ISO 45001 7.2 (적격성 Competence)',
    summary: '사업장의 총괄 안전보건관리책임자(공장장, 현장소장 등)가 의무적으로 이수해야 하는 전문 직무교육',
    legalStandard: '신규교육: 선임된 날부터 3개월 이내 6시간 이상 이수 / 보수교육: 신규(또는 보수) 이수 후 매 2년이 되는 날 전후 6개월 이내 6시간 이상 이수',
    requiredDocs: '전문 직무교육기관(안전보건공단 등) 수료증 사본, 직무교육 이수 보고서, 선임 신고서 대조본',
    penalties: '미실시 시 대상자 1인당 500만원 이하 과태료 부과 (산업안전보건법 제175조)'
  },

  {
    id: 'edu-supervisor',
    name: '관리감독자 정기 안전보건교육',
    category: '교육',
    recommendedCycle: '연 1회',
    repeatCycle: '1회',
    defaultMonth: 2,
    priority: '높음',
    oshaBasis: '산업안전보건법 제29조 제1항 및 시행규칙 제26조',
    sapaBasis: '중대재해처벌법 시행령 제4조 제3호 (관리감독자 업무수행 권한·예산 부여 및 평가)',
    isoBasis: 'ISO 45001 5.3 (조직의 역할, 책임 및 권한)',
    summary: '생산 및 작업현장을 직접 지휘·감독하는 직책자의 안전보건 역량 강화 교육',
    legalStandard: '연간 16시간 이상 (전년도 무재해 사업장은 8시간 감면 가능, 우편·원격통신 시 50% 이상 집체 필수)',
    requiredDocs: '전문기관 수료증 또는 사내 자체교육 결과보고서, 참석자 명단',
    penalties: '미실시 시 대상자 1인당 최대 500만원 과태료'
  },
  {
    id: 'edu-special',
    name: '유해·위험작업 특별안전보건교육',
    category: '교육',
    recommendedCycle: '수시',
    repeatCycle: '1회',
    priority: '높음',
    oshaBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 (40종 유해위험작업)',
    sapaBasis: '중대재해처벌법 시행령 제4조 제5호 (유해위험요인 통제 절차 준수)',
    isoBasis: 'ISO 45001 8.1 (운영 기획 및 통제)',
    summary: '밀폐공간, 2m 이상 고소작업, 타워크레인 등 법정 40종 고위험 작업 배치 전 교육',
    legalStandard: '총 16시간 이상 (최초 작업 전 4시간 이상, 잔여 12시간은 3개월 내 분할 실시 가능 / 단기·일용 2시간)',
    requiredDocs: '특별교육 일지, 해당 작업자 명단, 작업별 특별 위험교재, 자필 서명부, 평가표',
    penalties: '미실시 시 작업자 1인당 최대 500만원 과태료',
    subOptionsLabel: '특별안전보건교육 대상 유해·위험작업 선택 (산안법 별표5 제1호 라목 40종 중 택1)',
    subOptions: [
      {
        id: 'special-confined-space',
        name: '밀폐공간 질식재해 예방 및 산소결핍 장소 작업',
        badge: '별표5 제38호',
        summary: '맨홀, 탱크, 반응기, 정화조 등 산소결핍 및 유해가스 중독 위험 장소 진입·작업자 특별교육',
        legalStandard: '총 16시간 이상 (최초 작업투입 전 4시간 이상 필수 이수 / 1주일 이하 단기작업 및 일용직 2시간)',
        requiredDocs: '특별안전보건교육 일지, 자필 서명부, 산소 및 유해가스 농도측정기록, 밀폐공간 안전작업허가서, 환기팬 점검표',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 제26조 별표5 제1호 라목 제38호, 안전보건규칙 제619조'
      },
      {
        id: 'special-scaffolding-height',
        name: '높이 2m 이상 고소작업 및 비계 조립·해체·변경 작업',
        badge: '별표5 제5호',
        summary: '강관비계, 시스템비계, 달비계 등의 조립·해체·변경 및 추락위험 2m 이상 고소작업자 특별교육',
        legalStandard: '총 16시간 이상 (최초 작업 전 4시간 필수 / 단기·간헐적 작업 2시간)',
        requiredDocs: '특별교육일지, 서명부, 비계 조립도 및 안전성 검토서, 안전대/추락방지망 점검일지, 고소작업허가서',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제5호, 안전보건규칙 제54조~제68조'
      },
      {
        id: 'special-tower-crane-signal',
        name: '타워크레인 등 양중기 설치·해체 및 줄걸이·신호 작업',
        badge: '별표5 제37·39호',
        summary: '타워크레인, 이동식크레인 신호수 및 양중 와이어로프·샤클 줄걸이 작업 종사자 필수 교육',
        legalStandard: '타워크레인 신호수: 8시간 이상 (공단 또는 전문기관 위탁/사내교육) / 크레인 설치·해체: 16시간',
        requiredDocs: '특별안전보건교육 이수증, 신호수 지정서, 줄걸이 와이어로프 및 섬유벨트 일일점검표, 표준 신호수칙 게시물',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제37호, 제39호, 안전보건규칙 제146조'
      },
      {
        id: 'special-hot-work-welding',
        name: '화기·용접·용단 및 아세틸렌·가스용접 작업',
        badge: '별표5 제26호',
        summary: '불꽃 및 고열이 발생하는 가스용접, 아크용접, 금속절단 작업 시 화재·폭발 예방 특별교육',
        legalStandard: '총 16시간 이상 (최초 투입 전 4시간 / 단기작업 2시간)',
        requiredDocs: '화기작업 특별교육일지, 화기작업허가서, 화재감시자 배치확인서, 불티 비산방지포 및 소화기(소형 2개) 비치 사진',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제26호, 안전보건규칙 제236조~제241조'
      },
      {
        id: 'special-aerial-work-platform',
        name: '고소작업대(시저형 렌탈, 차량탑재형 스카이) 조종 및 탑승 작업',
        badge: '별표5 제40호',
        summary: '고소작업대 조종자 및 작업대 탑승자의 협착, 추락, 전도 방지를 위한 필수 안전교육',
        legalStandard: '조종 자격 미보유자 2시간 이상 특별교육 / 탑승 작업자 특별안전수칙 교육',
        requiredDocs: '고소작업대 특별교육일지, 장비 일일점검표(과상승방지봉, 아웃트리거), 안전대 체결 확인 사진, 장비등록증',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제40호, 안전보건규칙 제186조'
      },
      {
        id: 'special-chemical-substances',
        name: '관리대상 유해물질 및 특정유기화합물 취급 작업',
        badge: '별표5 제22호',
        summary: '유기용제(시너, 톨루엔 등), 산·알칼리 등 170여종 유해물질 취급 공정 근로자 특별교육',
        legalStandard: '총 16시간 이상 (최초 4시간 / 단기작업 2시간)',
        requiredDocs: '특별교육일지, 서명부, 취급 화학물질 MSDS, 국소배기장치 자체검사표, 방독마스크·화학보호복 지급대장',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제22호, 안전보건규칙 제420조~제451조'
      },
      {
        id: 'special-excavation-trench',
        name: '지반 굴착작업 및 흙막이 지보공 조립·해체 작업',
        badge: '별표5 제2호',
        summary: '깊이 2m 이상 지반 굴착, 암반 파쇄, 흙막이판 및 버팀대 시공 작업 시 붕괴 방지 교육',
        legalStandard: '총 16시간 이상 (최초 4시간 / 단기 2시간)',
        requiredDocs: '특별교육일지, 굴착작업계획서, 지반 및 흙막이 변위 계측일지, 작업지휘자 일일점검표',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제2호, 안전보건규칙 제338조~제347조'
      },
      {
        id: 'special-heavy-machinery',
        name: '중량물 취급 및 지게차·화물운반기계 하역 작업',
        badge: '별표5 제36호',
        summary: '100kg 이상 중량물 인력/기계 운반 및 지게차 하역 시 협착·전도·낙하사고 예방 특별교육',
        legalStandard: '총 16시간 이상 (단기작업 2시간)',
        requiredDocs: '중량물 취급 특별교육일지, 중량물 운반 작업계획서, 지게차 작업계획서 및 전담 유도자 지정서',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제36호, 안전보건규칙 제38조~제39조'
      },
      {
        id: 'special-formwork-concrete',
        name: '거푸집 동바리 조립·해체 및 콘크리트 타설 작업',
        badge: '별표5 제3호',
        summary: '콘크리트 타설 압력 및 편심하중에 의한 동바리 붕괴사고 예방을 위한 가설구조 특별교육',
        legalStandard: '총 16시간 이상',
        requiredDocs: '특별교육일지, 동바리 구조검토서, 콘크리트 타설계획서, 조립 검측체크리스트',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제3호, 안전보건규칙 제332조'
      },
      {
        id: 'special-asbestos-removal',
        name: '석면 해체·제거 및 분진 발생 작업',
        badge: '별표5 제32호',
        summary: '석면 건축자재 해체, 뿜칠석면 제거 등 1급 발암물질 석면분진 비산방지 및 건강보호 교육',
        legalStandard: '총 16시간 이상 (신규 종사 전 이수)',
        requiredDocs: '석면해체 특별교육일지, 음압기 가동일지, 석면농도 측정결과서, 전동식 방진마스크 밀착도 검사표',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제32호, 제122조'
      },
      {
        id: 'special-live-wire-electrical',
        name: '전압 75V 이상 활선 및 정전선로 점검·보수 작업',
        badge: '별표5 제28호',
        summary: '저압·고압·특고압 전로 인근 작업 시 감전사고 예방, 절연용 보호구 착용 및 정전절차 교육',
        legalStandard: '총 16시간 이상 (단기작업 2시간)',
        requiredDocs: '전기 특별교육일지, 정전작업 승인서, 활선근접작업 안전계획서, 절연장갑·절연화 내전압시험 성적서',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제28호, 안전보건규칙 제319조~제324조'
      },
      {
        id: 'special-press-shear',
        name: '프레스 및 전단기 조작·금형 세팅 작업',
        badge: '별표5 제12호',
        summary: '동력 프레스 및 전단기 사용 시 손끼임(협착) 방지 및 안전블록 체결 수칙 특별교육',
        legalStandard: '총 16시간 이상',
        requiredDocs: '프레스 특별교육일지, 방호장치(광전자식, 양수조작식) 유효성 점검일지, 금형교체 안전수칙 게시',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제12호, 안전보건규칙 제103조~제115조'
      },
      {
        id: 'special-industrial-robot',
        name: '산업용 로봇 조작·티칭(Teaching) 및 정비 작업',
        badge: '별표5 제31호',
        summary: '협동로봇 및 제조용 로봇 작업 반경 내 진입, 티칭펜던트 조작 시 충돌·협착 예방 특별교육',
        legalStandard: '총 16시간 이상',
        requiredDocs: '로봇 특별교육일지, 안전매트/라이트커튼 점검표, 인터록 게이트 작동검사서, 2인1조 작업기록',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제31호, 안전보건규칙 제223조'
      },
      {
        id: 'special-chemical-vessel-cleaning',
        name: '화학설비·반응기 및 배관 개방·청소·점검 작업',
        badge: '별표5 제25호',
        summary: '인화성·폭발성 물질이 잔류할 수 있는 화학설비 개방 시 LOTO 차단 및 가스퍼지 특별교육',
        legalStandard: '총 16시간 이상 (단기 2시간)',
        requiredDocs: '특별교육일지, LOTO 잠금장치 표지, 배관 개방작업 승인서(PSSR), 방폭공구 사용확인서',
        lawBasis: '산업안전보건법 제29조 제3항 및 시행규칙 별표5 제1호 라목 제25호, 안전보건규칙 제255조'
      }
    ]
  },
  {
    id: 'edu-msds',
    name: '물질안전보건자료(MSDS) 교육',
    category: '교육',
    recommendedCycle: '반기 1회',
    repeatCycle: '반기별',
    priority: '보통',
    oshaBasis: '산업안전보건법 제114조 (물질안전보건자료의 게시 및 교육)',
    sapaBasis: '중대재해처벌법 시행령 제4조 제5호 (화학물질 취급 안전)',
    isoBasis: 'ISO 45001 8.1.2 (위험요인 제거 및 안전보건 리스크 감소)',
    summary: '도료, 세척제, 시너 등 화학물질 취급 근로자의 유해성 인지 및 보호구 착용 교육',
    legalStandard: '화학물질 취급 공정 배치 전 및 새로운 물질 반입 시 즉시 실시, 반기 1회 재확인 권장',
    requiredDocs: 'MSDS 교육일지, 사업장 내 비치된 MSDS 사본, 서명부',
    penalties: '미실시 시 1인당 최대 300만원 과태료'
  },

  // ==========================================
  // 2. 점검 (Inspection & Monitoring)
  // ==========================================
  {
    id: 'insp-patrol-joint',
    name: '원·하청 합동 안전보건 순회점검',
    category: '점검',
    recommendedCycle: '분기 1회',
    repeatCycle: '분기별',
    priority: '높음',
    oshaBasis: '산업안전보건법 제64조 (도급에 따른 안전보건조치) 제1항 제3호',
    sapaBasis: '중대재해처벌법 제4조 및 제5조 (도급·용역·위탁 관계에서의 안전보건 확보 의무)',
    isoBasis: 'ISO 45001 8.1.4 (조달 및 도급인 관리)',
    summary: '도급인(원청)과 수급인(협력사) 사업주가 공동으로 현장을 순회하여 유해위험요인 개선 점검',
    legalStandard: '건설업 및 조선업: 2개월에 1회 이상 / 기타 사업: 분기 1회 이상 의무 실시',
    requiredDocs: '합동점검 결과보고서, 지적사항 개선조치 전·후 사진, 참석자 서명',
    penalties: '미실시 시 최대 500만원 과태료'
  },
  {
    id: 'insp-equipment-check',
    name: '위험 기계·기구 자체점검 및 법정 안전검사',
    category: '점검',
    recommendedCycle: '매월',
    repeatCycle: '매월',
    priority: '높음',
    oshaBasis: '산업안전보건법 제93조 (안전검사) 및 제134조 (방호조치)',
    sapaBasis: '중대재해처벌법 시행령 제4조 제5호 (위험 기계·기구 안전성 확보)',
    isoBasis: 'ISO 45001 8.1.3 (변경 관리) & 9.1 (모니터링 및 측정)',
    summary: '크레인, 리프트, 지게차, 고압가스설비 등 사업장 내 핵심 장비의 안전상태 사전 확인',
    legalStandard: '작업 전 매일 점검 + 월간 정기 자체점검표 작성 + 법정 주기(1~2년) 공인검사',
    requiredDocs: '장비별 자체점검표, 공인 안전검사 합격증명서, 이상 발견 시 정비기록',
    penalties: '미검사 기계 사용 시 1년 이하 징역 또는 1천만원 이하 벌금'
  },

  // ==========================================
  // 3. 비상훈련 (Emergency Drills)
  // ==========================================
  {
    id: 'drill-emergency-plan',
    name: '중대재해 및 비상상황 대응 시나리오 훈련',
    category: '비상훈련',
    recommendedCycle: '반기 1회',
    repeatCycle: '반기별',
    priority: '높음',
    oshaBasis: '산업안전보건법 제44조 (공정안전보고서) 및 안전보건규칙',
    sapaBasis: '중대재해처벌법 시행령 제4조 제8호 (비상대응 매뉴얼 마련 및 반기 1회 이상 점검·훈련)',
    isoBasis: 'ISO 45001 8.2 (비상사태 대비 및 대응)',
    summary: '사고 발생 시 즉시 작업중지, 근로자 대피, 유관기관 신고 및 응급구호 체계 실전 훈련',
    legalStandard: '연 2회(반기 1회) 이상 의무 실시 및 미흡점 보완 절차 수행 필수',
    requiredDocs: '비상대응 매뉴얼, 훈련 시나리오, 훈련 결과보고서, 평가 및 개선대책서, 사진',
    penalties: '중대재해처벌법 시행령 제4조 제8호 위반으로 중대재해 수사 시 핵심 과실 인정'
  },
  {
    id: 'drill-fire-evac',
    name: '소방 및 화재·폭발 대비 비상대피훈련',
    category: '비상훈련',
    recommendedCycle: '연 1회',
    repeatCycle: '1회',
    defaultMonth: 5,
    priority: '높음',
    oshaBasis: '화재예방법 제37조 및 산업안전보건기준에 관한 규칙 제242조',
    sapaBasis: '중대재해처벌법 시행령 제4조 제8호',
    isoBasis: 'ISO 45001 8.2 (비상사태 대응)',
    summary: '화재 발생 초기 소화기·소화전 사용법 숙지 및 비상계단 피난 대피 훈련',
    legalStandard: '상시근로자 10인 이상 전원 참여 권장, 소방시설 점검 병행 실시',
    requiredDocs: '소방훈련 실시 결과서, 소화설비 점검표, 훈련 사진대지',
    penalties: '소방안전 및 산업안전 미흡 시 시정명령 및 과태료'
  },

  // ==========================================
  // 4. 시스템 운영 (System Operations)
  // ==========================================
  {
    id: 'sys-supervisor-competency-eval',
    name: '관리감독자 업무수행 적격성 및 성과 평가',
    category: '시스템 운영',
    recommendedCycle: '반기 1회',
    repeatCycle: '반기별',
    priority: '높음',
    oshaBasis: '산업안전보건법 제16조 (관리감독자의 유해·위험 방지 업무) 및 제15조',
    sapaBasis: '중대재해처벌법 시행령 제4조 제5호 나목 (관리감독자 업무 충실 수행 평가 기준 마련 및 반기 1회 이상 평가·관리)',
    isoBasis: 'ISO 45001 5.3 (조직의 역할, 책임 및 권한) & 9.1 (모니터링, 측정 및 성과평가)',
    summary: '관리감독자가 산업안전보건법상 법정 업무(TBM 주관, 방호조치 점검, 보호구 착용 지도 등)를 충실히 수행하는지 반기 1회 이상 체계적으로 평가·관리',
    legalStandard: '반기 1회(연 2회) 이상 의무 평가 실시, 업무 수행에 필요한 권한 및 예산 부여 여부 확인, 미흡 시 시정 및 역량 강화 조치 필수',
    requiredDocs: '관리감독자 평가 기준서, 반기별 관리감독자 업무수행 평가표(체크리스트), 평가결과 보고서, 인사 및 개선 피드백 기록',
    penalties: '중대재해처벌법 제4조 위반으로 형사처벌 및 중대재해 발생 시 경영책임자 핵심 관리상의 과실 인정 요건'
  },

  {
    id: 'sys-risk-assessment-reg',
    name: '정기 위험성평가 실시 및 근로자 공유',
    category: '시스템 운영',
    recommendedCycle: '연 1회',
    repeatCycle: '1회',
    defaultMonth: 1,
    priority: '높음',
    oshaBasis: '산업안전보건법 제36조 (위험성평가의 실시) 및 고용노동부 고시 제2023-19호',
    sapaBasis: '중대재해처벌법 시행령 제4조 제3호 (유해·위험요인의 확인·개선 절차)',
    isoBasis: 'ISO 45001 6.1.2 (위험요인 식별 및 리스크와 기회 평가)',
    summary: '사업장 내 모든 기계, 작업 공정의 위험요인을 찾아 개선대책을 세우고 근로자에게 전파',
    legalStandard: '매년 1회 이상 정기 실시 (사전준비 → 유해요인파악 → 위험성결정 → 감소대책 → 근로자 공유)',
    requiredDocs: '위험성평가표, 근로자 참여 서명부, 개선조치 전·후 사진대장, 3년간 보존 의무',
    penalties: '미실시 또는 보존의무 위반 시 최대 1,000만원 과태료 및 중처법 핵심 입증자료 부재',
    subOptionsLabel: '위험성평가 세부 절차 및 평가 기법 선택 (산안법 제36조 고시)',
    subOptions: [
      {
        id: 'risk-step-1-prep',
        name: '[1단계] 사전준비 및 평가대상 확정 (실시규정·팀구성·공정목록)',
        badge: '절차 1단계',
        summary: '위험성평가 실시규정 제정, 평가팀 및 책임자 구성, 대상 공정 및 기계·기구 전수 목록표 작성',
        legalStandard: '사업장 안전보건관리규정 및 위험성평가 실시규정에 의거 사전준비 완료 (근로자 참여 보장)',
        requiredDocs: '위험성평가 실시규정, 평가 추진팀 조직도, 전 공정 기계·기구 목록표, 근로자 참여 계획서',
        lawBasis: '산업안전보건법 제36조 제2항, 고용노동부 고시 제2023-19호 제6조~제7조'
      },
      {
        id: 'risk-step-2-identify',
        name: '[2단계] 유해·위험요인 파악 및 발굴 (현장순회·근로자 면담)',
        badge: '절차 2단계',
        summary: '현장 순회점검, 아차사고 발굴, 작업자 인터뷰, 물질안전보건자료 분석을 통한 잠재 위험요인 전수 발굴',
        legalStandard: '현장 근로자 및 관리감독자가 직접 참여하여 실제 작업 조건에서의 위험요인 누락 없이 파악',
        requiredDocs: '유해·위험요인 도출표(파악서), 현장 순회점검 일지, 아차사고 발굴 카드, 작업자 인터뷰 기록부',
        lawBasis: '산업안전보건법 제36조, 고용노동부 고시 제8조 (유해·위험요인 파악)'
      },
      {
        id: 'risk-step-3-estimate',
        name: '[3단계] 위험성 추정 및 결정 (위험도 판정 및 허용가능 여부 검토)',
        badge: '절차 3단계',
        summary: '발굴된 위험요인에 대해 사고 발생 가능성(빈도)과 중대성(강도) 또는 3단계 수준 판단을 거쳐 위험성 허용 여부 결정',
        legalStandard: '사업장 기준에 따라 허용 가능한 위험(Acceptable Risk)과 허용 불가 위험을 명확히 구분 판정',
        requiredDocs: '위험성 추정 및 결정 평가표, 위험도 매트릭스 산정 근거자료, 허용불가 위험 개선 우선순위 목록',
        lawBasis: '산업안전보건법 제36조, 고용노동부 고시 제9조 (위험성 결정)'
      },
      {
        id: 'risk-step-4-reduction',
        name: '[4단계] 위험성 감소대책 수립 및 실행 (제거·대체·공학적·관리적 개선)',
        badge: '절차 4단계',
        summary: '허용 불가능한 위험에 대해 본질적 안전(제거·대체) → 공학적 대책 → 관리적 대책 → 개인보호구 우선순위 개선대책 실행',
        legalStandard: '감소대책 실행 후 남아있는 잔여 위험성이 허용 가능한 수준인지 재평가 필수 확인',
        requiredDocs: '위험성 감소대책 실행계획서, 시설·설비 개선 전·후 사진대장, 개선조치 완료 보고서, 예산 집행 증빙',
        lawBasis: '산업안전보건법 제36조, 중대재해처벌법 시행령 제4조 제3호, 고용노동부 고시 제10조'
      },
      {
        id: 'risk-step-5-record-share',
        name: '[5단계] 평가결과 기록·보존 및 근로자 공유·TBM 전파',
        badge: '절차 5단계',
        summary: '평가 결과를 게시·공람하고 작업 전 TBM(툴박스미팅)을 통해 일선 작업자에게 위험요인과 개선대책 전파 및 3년간 보존',
        legalStandard: '평가 결과는 3년간 의무 보존해야 하며, 근로자에게 주지시키지 않을 시 시정명령 및 중처법 위반 적용',
        requiredDocs: '위험성평가 최종 결과보고서, TBM 교육 전파 일지, 근로자 공유 및 의견수렴 서명부 (3년 보존)',
        lawBasis: '산업안전보건법 제36조 제3항 및 시행규칙 제37조 (결과의 기록 및 보존), 고용노동부 고시 제11조~제13조'
      },
      {
        id: 'risk-method-3step',
        name: '[평가기법] 3단계 판단법 (상·중·하 직관적 위험성평가 - 고용노동부 개정 권장)',
        badge: '3단계 판단법',
        summary: '복잡한 계산 대신 위험성을 상(긴급개선)·중(개선계획)·하(유지관리) 3단계로 직관적 판별하여 중소기업 및 협력사 현장에 신속 적용',
        legalStandard: '고용노동부 개정 고시(2023-19호)에 따라 상(즉시 개선), 중(계획 수립 후 개선), 하(현상태 유지) 판정',
        requiredDocs: '3단계 위험성평가표, 개선 전·후 사진대장, 상·중 등급 개선조치 이행계획서',
        lawBasis: '고용노동부 고시 제2023-19호 제9조 제2항 (위험성 결정의 방법)'
      },
      {
        id: 'risk-method-checklist',
        name: '[평가기법] 체크리스트(Checklist) 위험성평가법',
        badge: '체크리스트법',
        summary: '설비 기준 및 법정 안전기준을 체크리스트로 작성하여 적합/부적합 판정을 통해 위험요인을 신속 발굴 및 조치',
        legalStandard: '표준 작업공정 및 안전보건규칙 준수 여부를 항목별 O/X로 확인하여 미흡항목 집중 개선',
        requiredDocs: '공정별/설비별 체크리스트 평가표, 부적합 항목 시정조치 요구서 및 확인서',
        lawBasis: '고용노동부 고시 제2023-19호 제9조'
      },
      {
        id: 'risk-method-key-questions',
        name: '[평가기법] 핵심질문(Key Questions) 위험성평가법',
        badge: '핵심질문법',
        summary: '"어디서 다칠 수 있는가?", "안전장치는 있는가?" 등 직관적 핵심 질문으로 소규모 현장 및 일용 근로자와 함께 즉시 개선',
        legalStandard: '현장 TBM과 연계하여 관리감독자와 근로자가 대화형으로 위험요인을 도출하고 개선',
        requiredDocs: '핵심질문 워크시트, 현장 근로자 면담기록, 즉시 개선조치 결과서',
        lawBasis: '고용노동부 고시 제2023-19호 제9조'
      },
      {
        id: 'risk-method-frequency-intensity',
        name: '[평가기법] 빈도·강도 매트릭스법 (전통적 5x4 또는 3x3 정량평가)',
        badge: '빈도·강도법',
        summary: '사고 발생 빈도(가능성)와 피해 강도(중대성)를 곱하여 위험성을 1~20점으로 수치화하는 정밀 평가 기법',
        legalStandard: '위험도 등급 기준표에 따라 기준치(예: 8점 이상) 초과 항목에 대해 의무 개선계획 수립',
        requiredDocs: '빈도·강도 산정 평가표, 위험성 매트릭스 도표, 고위험 항목 개선계획서',
        lawBasis: '산업안전보건법 제36조, 고용노동부 고시 제9조'
      },
      {
        id: 'risk-comprehensive-annual',
        name: '[종합] 전 공정 연간 정기 위험성평가 종합 실시',
        badge: '연간 종합평가',
        summary: '사업장 내 모든 공정·설비에 대해 사전준비부터 감소대책 및 근로자 공유까지 1~5단계 전 과정을 아우르는 연간 정기평가 총괄',
        legalStandard: '연 1회 이상 전 사업장 의무 실시 (사업주 및 근로자 대표 참여, 결과 3년 보존)',
        requiredDocs: '연간 위험성평가 종합보고서, 전 근로자 참여 서명부, 개선조치 이행대장, 경영책임자 결재문서',
        lawBasis: '산업안전보건법 제36조, 중대재해처벌법 제4조, ISO 45001 6.1.2'
      }
    ]
  },
  {
    id: 'sys-risk-assessment-occ',
    name: '수시 위험성평가 (신규설비·공정변경·사고발생 시)',
    category: '시스템 운영',
    recommendedCycle: '수시',
    repeatCycle: '1회',
    priority: '높음',
    oshaBasis: '산업안전보건법 제36조 및 고용노동부 고시 제15조',
    sapaBasis: '중대재해처벌법 시행령 제4조 제3호',
    isoBasis: 'ISO 45001 8.1.3 (변경 관리)',
    summary: '새로운 기계 도입, 작업공정 변경, 아차사고 또는 재해 발생 시 즉시 추가 평가 실시',
    legalStandard: '공정 변경 전 착수 및 완료 즉시 현장 적용',
    requiredDocs: '수시 위험성평가 결과보고서, 공정변경 확인서, 현장 교육기록',
    penalties: '위험요인 미조치로 재해 발생 시 사업주 직접 가중 처벌'
  },
  {
    id: 'sys-committee-council',
    name: '안전보건협의체 및 근로자 의견수렴 회의',
    category: '시스템 운영',
    recommendedCycle: '매월',
    repeatCycle: '매월',
    priority: '높음',
    oshaBasis: '산업안전보건법 제64조 (안전보건협의체 구성 및 운영) & 제24조 (산안위)',
    sapaBasis: '중대재해처벌법 시행령 제4조 제7호 (종사자 의견 청취 절차 마련 및 개선이행)',
    isoBasis: 'ISO 45001 5.4 (근로자의 협의 및 참여)',
    summary: '원청-하청 간 또는 사측-노측 간 현장의 위험요소와 건의사항을 협의·개선하는 월간 회의',
    legalStandard: '안전보건협의체: 매월 1회 이상 정기 회의 개최 / 산업안전보건위원회: 매분기 1회',
    requiredDocs: '회의록, 회의 사진, 지적사항 이행 계획서 및 조치결과서',
    penalties: '협의체 미운영 시 500만원 과태료'
  },
  {
    id: 'sys-management-review',
    name: '안전보건 목표 및 실행계획 경영검토 (ISO 45001)',
    category: '시스템 운영',
    recommendedCycle: '반기 1회',
    repeatCycle: '반기별',
    priority: '보통',
    oshaBasis: '산업안전보건법 제14조 (이사회 보고 및 승인 등)',
    sapaBasis: '중대재해처벌법 시행령 제4조 제1호·제2호 (경영책임자의 안전보건 경영방침 및 목표 수립)',
    isoBasis: 'ISO 45001 9.3 (경영검토) & 6.2 (안전보건 목표 달성 기획)',
    summary: '대표이사 및 최고경영진이 연간 안전보건 목표 달성도와 이행현황을 직접 평가·의사결정',
    legalStandard: '반기 1회 이상 검토 권장, 개선을 위한 자원(예산 및 인력) 배분 결정',
    requiredDocs: '경영검토 보고서, 안전보건 목표 대비 실적 보고서, 대표이사 서명',
    penalties: '중대재해처벌법상 경영책임자의 관심 및 의무 이행 증빙 불인정 시 가중 처벌'
  },

  // ==========================================
  // 5. 기타 (Others & Health/Improvement)
  // ==========================================
  {
    id: 'etc-health-checkup',
    name: '일반 및 특수 건강진단 실시',
    category: '기타',
    recommendedCycle: '연 1회',
    repeatCycle: '1회',
    defaultMonth: 9,
    priority: '높음',
    oshaBasis: '산업안전보건법 제129조(일반) 및 제130조(특수건강진단)',
    sapaBasis: '중대재해처벌법 시행령 별표2 (직업성 질병 목록 관리)',
    isoBasis: 'ISO 45001 8.1 (보건관리 리스크 통제)',
    summary: '소음, 분진, 유기용제 등 유해인자 노출 작업자 특수검진 및 전 근로자 일반검진',
    legalStandard: '일반검진: 사무직 2년 1회, 비사무직 1년 1회 / 특수검진: 법정 유해인자별 6개월~1년 주기',
    requiredDocs: '건강진단 실시결과표, 유소견자(D1, D2) 사후관리 조치 대장',
    penalties: '미실시 시 대상 근로자 1인당 최대 1,000만원 과태료'
  },
  {
    id: 'etc-near-miss',
    name: '아차사고(Near Miss) 발굴 및 개선활동',
    category: '기타',
    recommendedCycle: '매월',
    repeatCycle: '매월',
    priority: '보통',
    oshaBasis: '산업안전보건법 제36조 (위험성평가 시 사고사례 연계)',
    sapaBasis: '중대재해처벌법 시행령 제4조 제3호 (재발방지 대책 수립)',
    isoBasis: 'ISO 45001 10.2 (사건, 부적합 및 시정조치)',
    summary: '사고로 이어질 뻔했던 잠재적 위험상황을 근로자가 신고하고 즉각 보완하는 자율안전 활동',
    legalStandard: '월별 우수 제안자 포상 및 위험성평가 개선 과제로 반영',
    requiredDocs: '아차사고 접수 대장, 위험 개선 전·후 사진, 포상 내역서',
    penalties: '적극적 아차사고 발굴 시 정부 감독 및 인증 심사 가점 요소'
  },
  {
    id: 'etc-ppe-inspection',
    name: '개인보호구 지급 및 안전인증 점검',
    category: '기타',
    recommendedCycle: '분기 1회',
    repeatCycle: '분기별',
    priority: '높음',
    oshaBasis: '산업안전보건기준에 관한 규칙 제32조 (보호구의 지급 등)',
    sapaBasis: '중대재해처벌법 시행령 제4조 제4호 (안전보건 예산의 적정 편성 및 집행)',
    isoBasis: 'ISO 45001 8.1.2 (개인보호구 제공)',
    summary: '안전모, 안전화, 안전대, 방진마스크 등 KCS 안전인증 정품 지급 및 노후 교체',
    legalStandard: '작업 특성에 적합한 보호구 무상 지급 및 올바른 착용 상태 상시 감시',
    requiredDocs: '보호구 지급대장(수령자 자필서명), 안전인증서(KCS) 사본',
    penalties: '보호구 미지급 상태에서 작업 중 사고 시 5년 이하 징역 또는 5천만원 벌금'
  }
];
