import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Activity, Building2, FileText, Shield } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Screen, NavigationParams } from '../../App';
import { useAuth } from '../../context/AuthContext';

// handle login screen for different user roles
// handle navigation to respective dashboards upon login
interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

export default function LoginScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { login } = useAuth(); // use login from AuthContext
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getRoleConfig = () => {
    switch (role) {
      case 'clinician':
        return {
          title: 'Clinician Login',
          colors: { from: '#0966CC', to: '#0C4A6E' },
          icon: Activity,
          placeholder: 'clinician@luminous.com',
        };
      case 'agency-admin':
        return {
          title: 'Agency Admin Login',
          colors: { from: '#10B981', to: '#059669' },
          icon: Building2,
          placeholder: 'admin@agency.com',
        };
      case 'scheduler':
        return {
          title: 'Scheduler Login',
          colors: { from: '#F59E0B', to: '#D97706' },
          icon: FileText,
          placeholder: 'scheduler@agency.com',
        };
      case 'super-admin':
        return {
          title: 'Super Admin Login',
          colors: { from: '#DC2626', to: '#B91C1C' },
          icon: Shield,
          placeholder: 'admin@luminous.com',
        };
      default:
        return {
          title: 'Login',
          colors: { from: '#0966CC', to: '#0C4A6E' },
          icon: Activity,
          placeholder: 'your.email@example.com',
        };
    }
  };

  const config = getRoleConfig();
  const IconComponent = config.icon;

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // login returns the user object (from AuthContext/authService)
      const user = await login(email, password);

      const dashboardScreens = {
        clinician: 'ClinicianDashboard',
        agency_admin: 'AgencyAdminDashboard',
        scheduler: 'SchedulerDashboard',
        super_admin: 'SuperAdminDashboard',
      } as const;

      const dashboardScreen = dashboardScreens[user.role as keyof typeof dashboardScreens];

      if (dashboardScreen) {
        navigation.navigate(dashboardScreen as Screen);
      } else {
        setError('Invalid user role');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748b]" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div
              className="w-18 h-18 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: `linear-gradient(135deg, ${config.colors.from}, ${config.colors.to})`,
              }}
            >
              <IconComponent className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl text-[#0f172a] mb-2">{config.title}</h1>
            <p className="text-[#64748b]">Sign in to access your dashboard</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="space-y-4 max-w-md mx-auto">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <Input
                id="email"
                type="email"
                placeholder={config.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-[#64748b]" />
                ) : (
                  <Eye className="w-5 h-5 text-[#64748b]" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm cursor-pointer">
                Remember me
              </Label>
            </div>
            <button
              onClick={() => navigation.navigate('PasswordReset')}
              className="text-sm hover:underline"
              style={{ color: config.colors.from }}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-12 rounded-xl text-white"
            style={{
              background: `linear-gradient(135deg, ${config.colors.from}, ${config.colors.to})`,
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-[#64748b]">
            First time user?{' '}
            <button
              onClick={() => navigation.navigate('AccountActivation')}
              className="hover:underline"
              style={{ color: config.colors.from }}
            >
              Activate your account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
