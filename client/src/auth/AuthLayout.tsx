import React from 'react';
import { Github } from 'lucide-react';
import { Outlet } from 'react-router'; // Assuming react-router-dom is used

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-900 font-['DM_Sans',_sans_serif] text-slate-300 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FF8559]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#E65447]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
      </div>

      {/* Main container with two sections side by side */}
      <div className="relative w-full max-w-6xl bg-slate-800/50 backdrop-blur-md border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Left section - Branding */}
          <section className="lg:w-1/2 bg-gradient-to-br from-[#E65447]/20 via-slate-900 to-slate-900 p-12 flex flex-col justify-between text-white">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Github className="w-10 h-10 text-[#FF8559]" />
                <h1 className="text-3xl font-bold">OSS Discovery Engine</h1>
              </div>
              <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">Find Your Perfect Project</h2>
              <p className="text-slate-300 text-lg">
                Search across millions of open-source repositories to start contributing today.
              </p>
            </div>
            
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 bg-slate-700/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
                <div className="w-2 h-2 bg-[#FF8559] rounded-full"></div>
                <span>🔥 Trending Projects</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-700/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
                <div className="w-2 h-2 bg-[#FFB578] rounded-full"></div>
                <span>🚀 Good First Issues</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-700/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
                <div className="w-2 h-2 bg-[#CF5376] rounded-full"></div>
                <span>💎 Hidden Gems</span>
              </div>
            </div>
          </section>

          {/* Right section - Form area */}
          <section className="lg:w-1/2 p-8 lg:p-12 flex items-center bg-slate-800">
            <div className="w-full max-w-md mx-auto">
              {/* Mobile logo - only shows on small screens */}
              <div className="lg:hidden flex items-center gap-2 mb-6">
                <Github className="w-8 h-8 text-[#E65447]" />
                <h1 className="text-xl font-bold text-slate-100">OSS Discovery</h1>
              </div>

              {/* Your AuthForm component will render here */}
              <Outlet/>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

