import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App.tsx';
import { Loader2, ShieldCheck, Lock, User, Building, Phone, KeyRound, CheckCircle2, ArrowRight, RotateCcw, Info, Search } from 'lucide-react';
import { cn } from '../lib/utils.ts';

export default function Login() {
  const [activeMode, setActiveMode] = useState<'login' | 'find-id' | 'reset-pin'>('login');
  
  // Login states
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // Recovery states (Find ID & Reset PIN)
  const [recoveryName, setRecoveryName] = useState('');
  const [recoveryOrg, setRecoveryOrg] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showNewPinConfirm, setShowNewPinConfirm] = useState(false);

  // Result & UI states
  const [foundIdResult, setFoundIdResult] = useState<{
    username: string;
    maskedUsername: string;
    name: string;
    organization: string;
    createdAt?: string;
  } | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/calendar', { replace: true });
    }
  }, [user, navigate]);

  const handlePinChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // 숫자 이외 제거
    setter(val);
  };

  const handlePhoneChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) {
      setter(raw);
    } else if (raw.length <= 7) {
      setter(`${raw.slice(0, 3)}-${raw.slice(3)}`);
    } else {
      setter(`${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`);
    }
  };

  // 1. 로그인 제출
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.');
      } else {
        await refreshUser();
        navigate(data.redirectTo || '/');
      }
    } catch (err) {
      setError('서버와 통신할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2. 아이디 찾기 제출
  const handleFindIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFoundIdResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recoveryName.trim(),
          organization: recoveryOrg.trim(),
          phoneNumber: recoveryPhone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '일치하는 계정 정보를 찾을 수 없습니다.');
      } else {
        setFoundIdResult(data);
      }
    } catch (err) {
      setError('서버와 통신할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 3. PIN 번호 재설정 제출
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPin !== newPinConfirm) {
      setError('새 PIN 확인값이 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recoveryUsername.trim(),
          name: recoveryName.trim(),
          organization: recoveryOrg.trim(),
          phoneNumber: recoveryPhone,
          newPin,
          newPinConfirm
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'PIN 재설정에 실패했습니다.');
      } else {
        setResetSuccess(true);
        setSuccess(data.message || 'PIN 번호가 성공적으로 재설정되었습니다.');
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
              고유 아이디와 강력한 scrypt PIN 기반의 인증 시스템입니다. 아이디나 PIN을 잊어버린 경우, 가입 시 등록한 이름, 소속, 휴대폰번호로 안전하게 복구할 수 있습니다.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">계정 찾기 및 복구</div>
              <div className="text-sm text-slate-600">이름 + 소속 + 휴대폰번호 일치 인증을 통한 아이디 조회 및 PIN 재설정</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">단방향 암호화 보안</div>
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
          {/* Header Tabs: 로그인 & 회원가입 */}
          <div className="flex gap-4 sm:gap-6 mb-8 border-b border-slate-200 pb-px text-xs sm:text-sm font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => { setActiveMode('login'); setError(''); setSuccess(''); setFoundIdResult(null); }}
              className={cn(
                "pb-3 transition-colors cursor-pointer",
                activeMode === 'login' ? "text-orange-600 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              로그인
            </button>
            <Link to="/register" className="pb-3 text-slate-400 hover:text-slate-600 transition-colors ml-auto">
              회원가입
            </Link>
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

          {/* ========================================================= */}
          {/* 1. 로그인 폼 (Login Form) */}
          {/* ========================================================= */}
          {activeMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">로그인 아이디</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors shadow-xs text-sm"
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">6~8자리 PIN</label>
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
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors pr-12 tracking-[0.4em] font-mono text-base shadow-xs"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onPaste={(e) => { e.preventDefault(); }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  최대 5회 실패 시 15분간 계정이 잠깁니다.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg shadow-md shadow-orange-500/20 transition-all uppercase tracking-[0.1em] text-sm flex justify-center items-center",
                  loading && "opacity-70 cursor-not-allowed"
                )}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
              </button>

              {/* 하단 아이디 / PIN 찾기 빠른 링크 */}
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-slate-500 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => { setActiveMode('find-id'); setError(''); setFoundIdResult(null); }}
                  className="hover:text-orange-600 transition-colors cursor-pointer font-medium"
                >
                  아이디 찾기
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => { setActiveMode('reset-pin'); setError(''); setResetSuccess(false); }}
                  className="hover:text-orange-600 transition-colors cursor-pointer font-medium"
                >
                  PIN 번호 재설정
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* 2. 아이디 찾기 폼 (Find ID) */}
          {/* ========================================================= */}
          {activeMode === 'find-id' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-orange-600" />
                  아이디 찾기
                </h2>
                <button
                  type="button"
                  onClick={() => { setActiveMode('login'); setError(''); setSuccess(''); setFoundIdResult(null); }}
                  className="text-xs text-slate-500 hover:text-orange-600 font-medium transition-colors cursor-pointer"
                >
                  ← 로그인으로 돌아가기
                </button>
              </div>

              {!foundIdResult ? (
                <form onSubmit={handleFindIdSubmit} className="space-y-5">
                  <div className="p-4 bg-orange-50/70 rounded-xl border border-orange-200/80">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950 mb-1">
                      <Search className="w-4 h-4 text-orange-600" />
                      <span>가입 시 등록한 본인 확인 정보를 입력하세요</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      이름, 소속, 휴대폰번호가 모두 일치하면 회원님의 아이디를 확인할 수 있습니다.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-600" />
                      이름 (성명) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={recoveryName}
                      onChange={(e) => setRecoveryName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-xs"
                      placeholder="예: 홍길동"
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
                      value={recoveryOrg}
                      onChange={(e) => setRecoveryOrg(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-xs"
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
                      value={recoveryPhone}
                      onChange={handlePhoneChange(setRecoveryPhone)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-xs font-mono"
                      placeholder="010-0000-0000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-lg shadow-md shadow-orange-500/20 transition-all text-sm flex justify-center items-center gap-2",
                      loading && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>아이디 찾기 <Search className="w-4 h-4" /></>}
                  </button>
                </form>
              ) : (
                /* 아이디 찾기 성공 카드 */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-800 font-bold">본인 확인이 완료되었습니다</p>
                      <p className="text-sm text-slate-700 mt-1">
                        <strong className="text-slate-900">{foundIdResult.name}</strong> 님의 로그인 아이디:
                      </p>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-300 font-mono text-xl font-black text-emerald-700 tracking-wider shadow-inner">
                      {foundIdResult.username}
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1">
                      소속: {foundIdResult.organization}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUsername(foundIdResult.username);
                        setActiveMode('login');
                      }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>이 아이디로 로그인하기</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryUsername(foundIdResult.username);
                        setActiveMode('reset-pin');
                        setFoundIdResult(null);
                      }}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                      <span>PIN 번호도 잊으셨나요? PIN 재설정하기</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. PIN 번호 재설정 폼 (Reset PIN) */}
          {/* ========================================================= */}
          {activeMode === 'reset-pin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-orange-600" />
                  PIN 번호 재설정
                </h2>
                <button
                  type="button"
                  onClick={() => { setActiveMode('login'); setError(''); setSuccess(''); setResetSuccess(false); }}
                  className="text-xs text-slate-500 hover:text-orange-600 font-medium transition-colors cursor-pointer"
                >
                  ← 로그인으로 돌아가기
                </button>
              </div>

              {!resetSuccess ? (
                <form onSubmit={handleResetPinSubmit} className="space-y-5">
                  <div className="p-4 bg-orange-50/70 rounded-xl border border-orange-200/80">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950 mb-1">
                      <KeyRound className="w-4 h-4 text-orange-600" />
                      <span>본인 확인 후 새로운 PIN 번호를 설정합니다</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      아이디, 이름, 소속, 휴대폰번호가 모두 일치하면 새 PIN 번호로 즉시 변경됩니다.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">로그인 아이디 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={recoveryUsername}
                      onChange={(e) => setRecoveryUsername(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-xs"
                      placeholder="가입 시 아이디"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-orange-600" />
                        이름 (성명) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recoveryName}
                        onChange={(e) => setRecoveryName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-xs"
                        placeholder="예: 홍길동"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-orange-600" />
                        소속 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recoveryOrg}
                        onChange={(e) => setRecoveryOrg(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-xs"
                        placeholder="회사/부서명"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-orange-600" />
                      휴대폰번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={recoveryPhone}
                      onChange={handlePhoneChange(setRecoveryPhone)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm shadow-xs font-mono"
                      placeholder="010-0000-0000"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">새로운 6~8자리 PIN <span className="text-red-500">*</span></label>
                        <button
                          type="button"
                          onClick={() => setShowNewPin(!showNewPin)}
                          className="text-[11px] text-orange-600 font-bold hover:text-orange-700 transition-colors"
                        >
                          {showNewPin ? "숨기기" : "보기"}
                        </button>
                      </div>
                      <input
                        type={showNewPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        value={newPin}
                        onChange={handlePinChange(setNewPin)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors tracking-[0.4em] font-mono text-base shadow-xs"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">새 PIN 확인 <span className="text-red-500">*</span></label>
                        <button
                          type="button"
                          onClick={() => setShowNewPinConfirm(!showNewPinConfirm)}
                          className="text-[11px] text-orange-600 font-bold hover:text-orange-700 transition-colors"
                        >
                          {showNewPinConfirm ? "숨기기" : "보기"}
                        </button>
                      </div>
                      <input
                        type={showNewPinConfirm ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        value={newPinConfirm}
                        onChange={handlePinChange(setNewPinConfirm)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors tracking-[0.4em] font-mono text-base shadow-xs"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-lg shadow-md shadow-orange-500/20 transition-all text-sm flex justify-center items-center gap-2",
                      loading && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "PIN 번호 재설정 완료"}
                  </button>
                </form>
              ) : (
                /* PIN 재설정 성공 카드 */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-emerald-900">PIN 재설정 완료!</h3>
                      <p className="text-xs text-slate-600 mt-1">
                        새로운 PIN 번호가 안전하게 저장되었습니다.<br/>
                        이제 변경된 PIN으로 즉시 로그인하실 수 있습니다.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUsername(recoveryUsername);
                      setActiveMode('login');
                      setResetSuccess(false);
                      setNewPin('');
                      setNewPinConfirm('');
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>새 PIN으로 로그인하기</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Security Policy info */}
          <div className="mt-12 p-5 bg-orange-50 rounded-xl border border-orange-200">
            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-3">안전보건 계정 보안 안내</h3>
            <ul className="space-y-2 text-[11px] text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-orange-500"></span> 가입 시 입력한 이름, 소속, 휴대폰번호로 언제든 계정을 찾을 수 있습니다.</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-orange-500"></span> 5회 연속 PIN 입력 실패 시 15분간 일시 잠금 보호가 적용됩니다.</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-orange-500"></span> 비밀번호 대신 단방향 scrypt 해싱된 6~8자리 암호화 PIN을 사용합니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
