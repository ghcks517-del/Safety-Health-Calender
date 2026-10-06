import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App.tsx';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '../lib/utils.ts';

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/calendar', { replace: true });
    }
  }, [user, navigate]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // 숫자 이외 제거
    setPin(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
            <p className="text-slate-500 leading-relaxed text-sm">Firebase Custom Token과 scrypt 기반 PIN 해싱을 사용하는 강력한 인증 계층입니다. 이메일도, 비밀번호도 없이 오직 식별자만 사용합니다.</p>
          </div>
          <div className="mt-12 space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">아키텍처</div>
              <div className="text-sm text-slate-600">서버 기반 Custom Token 인증</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">암호화</div>
              <div className="text-sm text-slate-600">Node.js scrypt + TimingSafeEqual</div>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <div className="text-xs text-slate-400 font-mono">SYSTEM v2.4.0-STABLE</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-3/5 h-full min-h-screen bg-white p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex gap-8 mb-10 border-b border-slate-200 pb-px">
            <Link to="/login" className="pb-4 text-sm font-bold uppercase tracking-widest text-orange-500 border-b-2 border-orange-500">로그인</Link>
            <Link to="/register" className="pb-4 text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">회원가입</Link>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">로그인 아이디</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-orange-200 rounded-lg px-4 py-4 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors shadow-sm"
                placeholder="아이디를 입력하세요"
                autoComplete="off"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">6~8자리 PIN</label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[10px] text-orange-500 font-bold uppercase hover:text-orange-600 transition-colors"
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
                  onChange={handlePinChange}
                  className="w-full bg-white border border-orange-200 rounded-lg px-4 py-4 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors pr-12 tracking-[0.5em] font-mono text-lg shadow-sm"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  onPaste={(e) => { e.preventDefault(); }}
                />
              </div>
              <p className="mt-4 text-[11px] text-slate-500 flex items-center gap-2">
                <Lock className="w-3 h-3 text-slate-400" />
                최대 5회 실패 시 15분간 계정이 잠깁니다.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg shadow-lg shadow-orange-500/20 transition-all uppercase tracking-[0.2em] text-sm flex justify-center items-center",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
            </button>
          </form>

          <div className="mt-12 p-5 bg-orange-50 rounded-xl border border-orange-200">
            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-3">PIN 보안 정책</h3>
            <ul className="space-y-2 text-[11px] text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-orange-500"></span> 단순 반복 숫자 금지 (예: 000000)</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-orange-500"></span> 연속된 숫자 패턴 금지 (예: 123456)</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-orange-500"></span> 숫자만 허용 (문자 및 공백 불가)</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-orange-500"></span> 서버 페퍼(Pepper)가 적용된 scrypt 해시 검증</li>
            </ul>
          </div>

          <div className="mt-12 flex justify-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-[0.1em]">
            <span>관리자 승인 필요</span>
            <span>&bull;</span>
            <span>세션 시간: 12시간</span>
            <span>&bull;</span>
            <span>클라이언트 토큰 없음</span>
          </div>
        </div>
      </div>
    </div>
  );
}
