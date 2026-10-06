import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App.tsx';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '../lib/utils.ts';

export default function Register() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  
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

  const handlePinChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // 숫자 이외 제거
    setter(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pin !== pinConfirm) {
      setError('PIN 확인값이 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin, pinConfirm })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '회원가입에 실패했습니다.');
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
            <p className="text-slate-500 leading-relaxed text-sm">고유 아이디와 강력한 숫자 PIN만으로 새로운 계정을 생성합니다. 개인정보는 전혀 수집하지 않습니다.</p>
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
            <Link to="/login" className="pb-4 text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">로그인</Link>
            <Link to="/register" className="pb-4 text-sm font-bold uppercase tracking-widest text-orange-500 border-b-2 border-orange-500">회원가입</Link>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-8 p-4 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-200">
              {success}
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
                placeholder="아이디 입력 (최소 4자)"
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
                  onChange={handlePinChange(setPin)}
                  className="w-full bg-white border border-orange-200 rounded-lg px-4 py-4 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors pr-12 tracking-[0.5em] font-mono text-lg shadow-sm"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  onPaste={(e) => { e.preventDefault(); }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">PIN 확인</label>
                <button
                  type="button"
                  onClick={() => setShowPinConfirm(!showPinConfirm)}
                  className="text-[10px] text-orange-500 font-bold uppercase hover:text-orange-600 transition-colors"
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
                  className="w-full bg-white border border-orange-200 rounded-lg px-4 py-4 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors pr-12 tracking-[0.5em] font-mono text-lg shadow-sm"
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
                "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg shadow-lg shadow-orange-500/20 transition-all uppercase tracking-[0.2em] text-sm flex justify-center items-center",
                (loading || !!success) && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "가입하기"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
