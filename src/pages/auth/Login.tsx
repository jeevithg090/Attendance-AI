// ═══════════════════════════════════════════════════════════
// AttendAI — Login Page
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Shield, ScanFace, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'admin'>('student');
  
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Logged in successfully!');
      // Redirection handled by main.tsx ProtectedRoute
    } catch (error: any) {
      toast.error(error.message || 'Failed to login. Please check credentials.');
    }
  };

  const handleDemoFill = (role: 'student' | 'teacher' | 'admin') => {
    setActiveTab(role);
    if (role === 'admin') {
      setEmail('admin@bmsce.ac.in');
      setPassword('Admin@123');
    } else if (role === 'teacher') {
      setEmail('teacher1@bmsce.ac.in');
      setPassword('Teacher@123');
    } else {
      setEmail('student1@bmsce.ac.in');
      setPassword('Student@123');
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      
      {/* Left side — Animated Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-[#0A0F1E] to-[#111827] border-r border-[var(--border)]">
        {/* Animated background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-primary)] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent-info)] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse-glow" style={{ animationDelay: '1s' }} />
        
        <div className="z-10 text-center max-w-lg px-8 animate-fade-in-up">
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[var(--shadow-glow-primary)]">
            <ScanFace size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AttendAI
          </h1>
          <h2 className="text-2xl font-semibold mb-6 text-[var(--text-primary)]">
            Anti-Proxy Attendance System
          </h2>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Secure, fast, and frictionless classroom attendance powered by face recognition technology and geospatial validation.
          </p>
          
          <div className="mt-12 flex justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)]">
              <Shield size={16} className="text-emerald-400" /> Secure
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)]">
              <ScanFace size={16} className="text-indigo-400" /> AI-Powered
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-[440px] animate-fade-in">
          
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <ScanFace size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AttendAI
            </h1>
          </div>

          <Card glass padding="lg" className="w-full relative overflow-hidden">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome back</h2>
              <p className="text-[var(--text-muted)]">Sign in to your BMSCE account</p>
            </div>

            {/* Role Tabs */}
            <div className="flex p-1 mb-8 bg-[var(--bg-primary)] rounded-[var(--radius-lg)] border border-[var(--border)]">
              {(['student', 'teacher', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleDemoFill(role)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                    activeTab === role 
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--border-light)]' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input pl-10"
                    placeholder={`${activeTab}@bmsce.ac.in`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Password
                  </label>
                  <a href="#" className="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-[var(--text-muted)]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border-light)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-[var(--bg-surface)]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--text-secondary)]">
                  Remember me for 7 days
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Don't have an account?{' '}
                <a href="#" className="font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors">
                  Contact your department admin
                </a>
              </p>
            </div>
            
            {/* Demo Hint */}
            <div className="mt-6 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 text-center">
              💡 <strong>Demo tip:</strong> Click the role tabs above to auto-fill demo credentials.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
