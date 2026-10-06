import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App.tsx';
import { Loader2, ShieldCheck, Lock, User, Building, Phone, Info, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';
import { cn } from '../lib/utils.ts';

export default function Register() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  
  // 아이디 중복확인 상태
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<'idle' | 'checking' | 'available' | 'duplicated' | 'invalid'>('idle');
  const [usernameCheckMessage, setUsernameCheckMessage] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/calendar', { replace: true });
    }
  }, [user, navigate]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) {
      setPhoneNumber(raw);
    } else if (raw.length <= 7) {
      setPhoneNumber(`${raw.slice(0, 3)}-${raw.slice(3)}`);
    } else {
      setPhoneNumber(`${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`);
    }
  };

  const handlePinChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // 숫자 이외 제거
    setter(val);
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setUsernameCheckStatus('idle');
    setUsernameCheckMessage('');
    if (error.includes('아이디')) {
      setError('');
    }
  };

  // 아이디 중복 확인 요청 함수
  const checkUsernameAvailability = async (targetUsername?: string): Promise<boolean> => {
    const raw = (targetUsername !== undefined ? targetUsername : username).trim();
    if (!raw) {
      setUsernameCheckStatus('invalid');
      setUsernameCheckMessage('아이디를 입력해주세요.');
      return false;
    }
    if (raw.length < 4) {
      setUsernameCheckStatus('invalid');
      setUsernameCheckMessage('아이디는 4자 이상이어야 합니다.');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
      setUsernameCheckStatus('invalid');
      setUsernameCheckMessage('아이디는 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다.');
      return false;
    }

    setIsCheckingUsername(true);
    setUsernameCheckStatus('checking');
    setUsernameCheckMessage('');

    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (data.available) {
        setUsernameCheckStatus('available');
        setUsernameCheckMessage('사용 가능한 아이디입니다.');
        return true;
      } else {
        setUsernameCheckStatus('duplicated');
        setUsernameCheckMessage(data.message || '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
        return false;
      }
    } catch {
      setUsernameCheckStatus('invalid');
      setUsernameCheckMessage('중복 확인 중 네트워크 오류가 발생했습니다.');
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('로그인 아이디를 입력해주세요.');
      return;
    }

    if (cleanUsername.length < 4) {
      setError('아이디는 4자 이상이어야 합니다.');
      return;
    }

    if (usernameCheckStatus === 'duplicated') {
      setError('이미 존재하는 아이디입니다. 다른 아이디를 입력해주세요.');
      return;
    }

    // 중복 확인이 아직 완료되지 않았으면 자동 중복 확인 실행
    if (usernameCheckStatus !== 'available') {
      const isAvailable = await checkUsernameAvailability(cleanUsername);
      if (!isAvailable) {
        setError(usernameCheckMessage || '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
        return;
      }
    }

    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!organization.trim()) {
      setError('소속(회사/부서명)을 입력해주세요.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('올바른 휴대폰번호를 입력해주세요.');
      return;
    }

    if (!agreePrivacy) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    if (pin !== pinConfirm) {
      setError('PIN 확인값이 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: cleanUsername, 
          name: name.trim(), 
          organization: organization.trim(), 
          phoneNumber, 
          pin, 
          pinConfirm 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '회원가입에 실패했습니다.');
        if (data.error && data.error.includes('이미 존재하는 아이디')) {
          setUsernameCheckStatus('duplicated');
          setUsernameCheckMessage('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
        }
      } else {
        setSuccess(data.message || '회원가입이 완료되었습니다.');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setError('서버와 통신할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex overflow-hidden font-sans">
      {/* Left Panel */}
      <div className="hidden lg:flex w-2/5 bg-slate-50 border-r border-slate-200 p-12 flex-col justify-between relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-30" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Safety & Health<span className="text-orange-500"> Calender</span></h1>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-light text-slate-900 leading-tight">캘린더를 활용한<br/>안전보건활동 운영 관리</h2>
            <p className="text-slate-500 leading-relaxed text-sm">
              고유 아이디와 안전한 숫자 PIN으로 회원가입을 진행합니다. 입력하신 이름, 소속, 휴대폰번호는 향후 아이디 및 PIN 분실 시 본인 확인에 안전하게 활용됩니다.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">계정 보호 및 복구 지원</div>
              <div className="text-sm text-slate-600">이름·소속·휴대폰 일치 검증으로 분실 시 즉시 복구</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">암호화 보안</div>
              <div className="text-sm text-slate-600">Node.js scrypt + TimingSafeEqual 단방향 해싱</div>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <div className="text-xs text-slate-400 font-mono">SYSTEM v2.4.0-STABLE</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-3/5 h-full min-h-screen bg-white p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center overflow-y-auto">
        <div className="w-full max-w-md my-auto py-8">
          <div className="flex gap-8 mb-8 border-b border-slate-200 pb-px">
            <Link to="/login" className="pb-4 text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">로그인</Link>
            <Link to="/register" className="pb-4 text-sm font-bold uppercase tracking-widest text-orange-500 border-b-2 border-orange-500">회원가입</Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-200">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 기본 로그인 아이디 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  로그인 아이디 <span className="text-red-500">*</span>
                </label>
                {usernameCheckStatus === 'available' && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    사용 가능한 아이디
                  </span>
                )}
                {usernameCheckStatus === 'duplicated' && (
                  <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    이미 사용 중인 아이디
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={cn(
                      "w-full bg-white border rounded-lg px-4 py-3.5 text-slate-900 focus:outline-none transition-colors shadow-xs text-sm font-medium",
                      usernameCheckStatus === 'available' && "border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/10",
                      usernameCheckStatus === 'duplicated' && "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10",
                      usernameCheckStatus !== 'available' && usernameCheckStatus !== 'duplicated' && "border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    )}
                    placeholder="영문, 숫자 4자 이상"
                    autoComplete="username"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => checkUsernameAvailability(username)}
                  disabled={isCheckingUsername || !username.trim()}
                  className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isCheckingUsername ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>확인 중</span>
                    </>
                  ) : (
                    <span>중복 확인</span>
                  )}
                </button>
              </div>
              {usernameCheckMessage ? (
                <p className={cn(
                  "mt-1.5 text-xs flex items-center gap-1.5",
                  usernameCheckStatus === 'available' ? "text-emerald-600 font-medium" : "text-red-500 font-medium"
                )}>
                  {usernameCheckStatus === 'available' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {usernameCheckMessage}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  기존 가입 정보와 중복되지 않는 고유한 아이디를 입력해주세요.
                </p>
              )}
            </div>

            {/* 본인 확인 정보 (이름, 소속, 휴대폰번호) */}
            <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200/80 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-900">
                <Info className="w-4 h-4 text-orange-600 shrink-0" />
                <span>계정 복구용 본인 확인 정보 (필수)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed -mt-1">
                아이디 또는 PIN 번호를 분실했을 때 본인 확인에 사용되므로 정확히 입력해주세요.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                  이름 (성명) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-orange-200 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-2xs"
                  placeholder="예: 홍길동"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-orange-600" />
                  소속 (회사명 / 부서명) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full bg-white border border-orange-200 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-2xs"
                  placeholder="예: 대한건설 안전보건팀"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-600" />
                  휴대폰번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="w-full bg-white border border-orange-200 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-2xs font-mono"
                  placeholder="010-0000-0000"
                  autoComplete="tel"
                />
              </div>

              {/* 휴대폰번호 기입 란 아래: 개인정보동의 란 */}
              <div className="pt-3 border-t border-orange-200/70">
                <div className="flex items-center justify-between gap-2 p-3 bg-white/90 rounded-xl border border-orange-200 shadow-2xs hover:border-orange-300 transition-colors">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      id="privacyConsent"
                      checked={agreePrivacy}
                      onChange={(e) => {
                        setAgreePrivacy(e.target.checked);
                        if (error.includes('동의')) setError('');
                      }}
                      className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-400 cursor-pointer accent-orange-500"
                    />
                    <span className="text-xs text-slate-800">
                      <span className="text-red-500 font-bold">[필수]</span> <span className="font-bold">개인정보 수집 및 이용 동의</span>
                    </span>
                  </label>

                  {/* 느낌표 이모티콘 버튼: 누르면 개인정보동의서가 팝업창으로 뜸 */}
                  <button
                    type="button"
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                    title="개인정보동의서 전문 보기"
                  >
                    <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs leading-none shadow-xs">!</span>
                    <span className="text-[11px] underline">동의서 보기</span>
                  </button>
                </div>
                {!agreePrivacy && error.includes('동의') && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    개인정보 수집 및 이용에 동의해주세요.
                  </p>
                )}
              </div>
            </div>

            {/* PIN 입력 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">6~8자리 PIN <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-orange-600 font-bold hover:text-orange-700 transition-colors"
                >
                  {showPin ? "PIN 숨기기" : "PIN 보기"}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={pin}
                  onChange={handlePinChange(setPin)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors tracking-[0.4em] font-mono text-base shadow-xs"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  onPaste={(e) => { e.preventDefault(); }}
                />
              </div>
            </div>

            {/* PIN 확인 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">PIN 확인 <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={() => setShowPinConfirm(!showPinConfirm)}
                  className="text-[11px] text-orange-600 font-bold hover:text-orange-700 transition-colors"
                >
                  {showPinConfirm ? "PIN 숨기기" : "PIN 보기"}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPinConfirm ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={pinConfirm}
                  onChange={handlePinChange(setPinConfirm)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors tracking-[0.4em] font-mono text-base shadow-xs"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  onPaste={(e) => { e.preventDefault(); }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className={cn(
                "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg shadow-md shadow-orange-500/20 transition-all uppercase tracking-[0.1em] text-sm flex justify-center items-center mt-2 cursor-pointer",
                (loading || !!success) && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "회원가입 완료"}
            </button>
          </form>
        </div>
      </div>

      {/* 개인정보 수집 및 이용 동의서 팝업창 (Modal) */}
      {isPrivacyModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsPrivacyModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-orange-50/60">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-xs">!</span>
                <h3 className="font-bold text-slate-900 text-base">개인정보 수집 및 이용 동의서</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 text-slate-800 font-medium">
                『Safety & Health Calender(안전보건활동 운영 관리 시스템)』은 안전보건활동 일정 관리 및 법정 의무 준수, 신뢰성 있는 사용자 인증을 위하여 아래와 같이 개인정보를 수집·이용합니다.
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-orange-500 rounded-full inline-block"></span>
                  1. 개인정보 수집 및 이용 목적
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>회원 관리 및 식별:</strong> 서비스 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별 및 인증</li>
                  <li><strong>계정 복구 및 보안:</strong> 아이디 분실 조회 또는 PIN 번호 재설정 시 본인 일치 여부 검증</li>
                  <li><strong>안전보건활동 운영:</strong> 산업안전보건법 및 중대재해처벌법에 따른 법정 교육, 점검, 비상훈련, 위험성평가 일정 편성 및 활동 이력 관리</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-orange-500 rounded-full inline-block"></span>
                  2. 수집하는 개인정보 항목
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2 border-b border-slate-200 w-20">구분</th>
                        <th className="p-2 border-b border-slate-200">수집 항목</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold text-orange-600 bg-orange-50/30">필수항목</td>
                        <td className="p-2">
                          <strong>성명(이름), 소속(회사/부서명), 휴대폰번호, 로그인 아이디, 단방향 scrypt 암호화 PIN</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-orange-500 rounded-full inline-block"></span>
                  3. 개인정보의 보유 및 이용 기간
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>원칙:</strong> 회원 탈퇴 시까지 보유 및 이용하며, 탈퇴 요청 시 지체 없이 안전하게 파기합니다.</li>
                  <li><strong>법령 보존:</strong> 단, 산업안전보건법 제36조(위험성평가 기록 3년 보존) 및 제164조(서류의 보존) 등 관련 법령에 따른 안전보건조치 이행 서류 및 담당자 기록은 법정 보존 기한 동안 보관됩니다.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-orange-500 rounded-full inline-block"></span>
                  4. 동의 거부 권리 및 불이익 안내
                </h4>
                <p className="text-slate-600">
                  귀하는 상기 개인정보의 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 수집 항목은 안전보건활동 일정 관리 및 계정 복구를 위한 필수 기본 정보이므로, <strong>동의를 거부하실 경우 회원가입 및 시스템 이용이 불가능</strong>합니다.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreePrivacy(true);
                  setIsPrivacyModalOpen(false);
                  if (error.includes('동의')) setError('');
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>동의하고 창 닫기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
