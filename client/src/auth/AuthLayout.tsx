import { Github } from 'lucide-react';
import { Outlet } from 'react-router';
const AuthLayout = ({ children }: { children: any }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      </div>

      {/* Main container with two sections side by side */}
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Left section - Purple branding */}
          <section className="lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500 p-12 flex flex-col justify-between text-white">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Github className="w-10 h-10" />
                <h1 className="text-3xl font-bold">OSS Discovery Engine</h1>
              </div>
              <h2 className="text-4xl font-bold mb-4">Find Your Perfect Project</h2>
              <p className="text-purple-100 text-lg">
                Search across millions of open-source repositories to start contributing today.
              </p>
            </div>
            
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>🔥 Trending Projects</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>🚀 Good First Issues</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>💎 Hidden Gems</span>
              </div>
            </div>
          </section>

          {/* Right section - Form area */}
          <section className="lg:w-1/2 p-8 lg:p-12 flex items-center">
            <div className="w-full max-w-md mx-auto">
              {/* Mobile logo - only shows on small screens */}
              <div className="lg:hidden flex items-center gap-2 mb-6">
                <Github className="w-8 h-8 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">OSS Discovery</h1>
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