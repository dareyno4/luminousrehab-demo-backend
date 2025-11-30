import React, { useState } from 'react';
import { Activity, LogIn, Mail, Lock } from 'lucide-react';
import { Screen, NavigationParams } from '../../App';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

export default function LandingScreen({ navigation }: Props) {
  const { login, user } = useAuth(); // <-- Only call useAuth() here
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      const loggedInUser = await login(email, password);
      // The navigation will be handled based on the user's role from the database
      const dashboardRoutes: { [key: string]: Screen } = {
        'clinician': 'ClinicianDashboard',
        'agency_admin': 'AgencyAdminDashboard',
        'scheduler': 'SchedulerDashboard',
        'super_admin': 'SuperAdminDashboard'
      };
      if (loggedInUser && dashboardRoutes[loggedInUser.role]) {
        navigation.navigate(dashboardRoutes[loggedInUser.role]);
      } else {
        setError('Unable to determine user role');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[#f8fafc] via-white to-[#E0F2FE]">
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E0F2FE] to-[#D1FAE5] text-[#0C4A6E] px-4 py-2 rounded-full text-xs">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Home Health Medication Management</span>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0966CC] to-[#10B981] flex items-center justify-center shadow-xl">
                <Activity className="w-9 h-9 text-white" />
              </div>
              <h1 className="text-4xl text-[#0f172a] leading-tight">Luminous Rehab</h1>
            </div>

            <p className="text-[#64748b] text-sm px-4">
              Sign in to access your portal
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl p-8 border border-[#e2e8f0] shadow-lg space-y-6">
            <div>
              <h2 className="text-2xl text-[#0f172a] mb-2">Welcome back</h2>
              <p className="text-sm text-[#64748b]">Enter your credentials to continue</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-[#0f172a]">Email Address</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="your.email@example.com"
                    className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] focus:border-[#0966CC]"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-[#0f172a]">Password</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your password"
                    className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] focus:border-[#0966CC]"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-[#0966CC] to-[#10B981] hover:from-[#075592] hover:to-[#059669] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              {/* Additional Links */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => navigation.navigate('PasswordReset')}
                  className="text-[#0966CC] hover:underline"
                >
                  Forgot password?
                </button>
                <button
                  onClick={() => navigation.navigate('AccountActivation')}
                  className="text-[#0966CC] hover:underline"
                >
                  Activate your account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
