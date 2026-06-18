import React from 'react';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-12 border border-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-red-50 mb-8 mx-auto shadow-inner">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0-6V7m0 10a9 9 0 110-18 9 9 0 010 18z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-black text-center text-slate-900 mb-4 tracking-tight">Access Denied</h1>
          <p className="text-center text-slate-500 font-bold mb-10 text-sm leading-relaxed max-w-sm mx-auto opacity-80">
            You don't have permission to view this specific segment.
            Please sign in with authorized credentials to continue.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-base shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98]"
            >
              Sign In to Account
            </button>

            <button
              onClick={() => navigate('/register')}
              className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 font-bold text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              Create Enterprise ID
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-400 mt-10 font-bold tracking-wide uppercase opacity-70">
            Need Priority Access? <br />
            <a href="mailto:support@paypoint.io" className="text-emerald-600 hover:underline">
              Contact Systems Administrator
            </a>
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center">
          <div className="bg-emerald-500 rounded-[3rem] p-10 text-black shadow-2xl shadow-emerald-200 transform rotate-[-4deg] hover:rotate-0 transition-all duration-700 border-8 border-white">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6">
              <div className="w-5 h-5 bg-white rotate-45" />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">Secure Segment</h2>
            <p className="text-sm font-bold opacity-80 leading-relaxed">
              This area is protected by multi-tenant vault kernels.
              Only authorized terminal nodes can establish a connection.
            </p>
            <div className="mt-8 space-y-3">
              <div className="bg-black/5 rounded-xl p-3 text-[11px] font-black border border-black/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-black/40 animate-pulse" />
                PCI-DSS LEVEL 1 COMPLIANT
              </div>
              <div className="bg-black/5 rounded-xl p-3 text-[11px] font-black border border-black/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-black/40 animate-pulse" />
                ENCRYPTED KERNEL ACCESS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
