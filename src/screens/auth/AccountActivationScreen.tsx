import React, { useState, useEffect } from 'react';
import { UserPlus, Building2, ArrowLeft, CheckCircle2, Mail, Lock, AlertCircle, User } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Screen, NavigationParams } from '../../App';
import { activateUserAccount } from '../../services/agencyAdminService';
import { supabaseClient } from '../../lib/supabase';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  params?: {
    code?: string;
    tenant?: string;
  };
}

export default function AccountActivationScreen({ navigation, params }: Props) {
  const [activationCode, setActivationCode] = useState(params?.code || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activated, setActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tenant-specific fields
  const [isTenantActivation, setIsTenantActivation] = useState(false);
  const [tenantSubdomain, setTenantSubdomain] = useState(params?.tenant || '');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tenantName, setTenantName] = useState('');

  // Check if this is tenant activation on mount
  useEffect(() => {
    if (params?.tenant || tenantSubdomain) {
      setIsTenantActivation(true);
      if (tenantSubdomain) {
        fetchTenantDetails();
      }
    }
  }, [params?.tenant, tenantSubdomain]);

  const fetchTenantDetails = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('tenants')
        .select('name')
        .eq('subdomain', tenantSubdomain)
        .single();

      if (error) throw error;
      if (data) {
        setTenantName(data.name);
      }
    } catch (err) {
      console.error('Error fetching tenant:', err);
    }
  };

  const handleUserActivate = async () => {
    setError('');
    
    // Validation
    if (!activationCode.trim()) {
      setError('Please enter your activation code');
      return;
    }
    
    if (!password.trim()) {
      setError('Please create a password');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await activateUserAccount(activationCode.trim(), password);
      setActivated(true);
    } catch (err) {
      console.error('Activation error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to activate account. Please check your activation code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantActivate = async () => {
    setError('');
    
    // Validation
    if (!tenantSubdomain.trim()) {
      setError('Please enter your tenant subdomain');
      return;
    }

    if (!activationCode.trim()) {
      setError('Please enter your activation code');
      return;
    }
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your full name');
      return;
    }
    
    if (!password.trim()) {
      setError('Please create a password');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Call server endpoint to handle activation with admin privileges
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:8080'}/api/activate-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantSubdomain: tenantSubdomain.trim(),
          activationCode: activationCode.trim(),
          email: email.trim(),
          password: password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate tenant');
      }

      setActivated(true);
    } catch (err) {
      console.error('Tenant activation error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to activate account. Please check your details.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = () => {
    if (isTenantActivation) {
      handleTenantActivate();
    } else {
      handleUserActivate();
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-6 space-y-6">
        <button
          onClick={() => navigation.goBack()}
          className="w-10 h-10 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#64748b]" />
        </button>

        {!activated ? (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#0966CC] to-[#0C4A6E] flex items-center justify-center mb-4">
                {isTenantActivation ? (
                  <Building2 className="w-10 h-10 text-white" />
                ) : (
                  <UserPlus className="w-10 h-10 text-white" />
                )}
              </div>
              <h1 className="text-2xl text-[#0f172a] mb-2">
                {isTenantActivation ? 'Activate Your Organization' : 'Activate Your Account'}
              </h1>
              <p className="text-[#64748b] px-4">
                {isTenantActivation 
                  ? (tenantName 
                      ? `Welcome to ${tenantName}! Create your admin account to get started.`
                      : 'Enter your activation details to set up your admin account')
                  : 'Enter the activation code from your welcome email and set your password'
                }
              </p>
            </div>

            {/* Toggle between user and tenant activation */}
            {!params?.tenant && !params?.code && (
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-md mx-auto">
                <button
                  onClick={() => setIsTenantActivation(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    !isTenantActivation 
                      ? 'bg-white text-[#0966CC] shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  User Invitation
                </button>
                <button
                  onClick={() => setIsTenantActivation(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    isTenantActivation 
                      ? 'bg-white text-[#0966CC] shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Organization Setup
                </button>
              </div>
            )}

            <div className="space-y-4 max-w-md mx-auto">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {isTenantActivation && (
                <>
                  <div>
                    <Label htmlFor="subdomain">Tenant Subdomain</Label>
                    <div className="relative mt-2">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                      <Input
                        id="subdomain"
                        type="text"
                        placeholder="yourcompany"
                        value={tenantSubdomain}
                        onChange={(e) => {
                          setTenantSubdomain(e.target.value);
                          if (e.target.value) fetchTenantDetails();
                        }}
                        className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                        disabled={isLoading || !!params?.tenant}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="code">Activation Code</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter activation code"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                    disabled={isLoading || !!params?.code}
                  />
                </div>
              </div>

              {isTenantActivation && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-[#64748b] mb-4">Create Your Admin Account</p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative mt-2">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="John"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <div className="relative mt-2">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@yourcompany.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password (min. 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                onClick={handleActivate}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] text-white hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading 
                  ? 'Activating...' 
                  : isTenantActivation 
                    ? 'Activate Organization' 
                    : 'Activate Account'
                }
              </Button>

              {isTenantActivation && (
                <p className="text-xs text-[#94a3b8] text-center">
                  By activating, you agree to our Terms of Service and Privacy Policy
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl text-[#0f172a] mb-2">
              {isTenantActivation ? 'Organization Activated!' : 'Account Activated!'}
            </h2>
            <p className="text-[#64748b] mb-6 px-4">
              {isTenantActivation
                ? (tenantName 
                    ? `${tenantName} is now active. You can log in with your new admin credentials.`
                    : 'Your organization is now active. You can log in with your new admin credentials.')
                : 'Your account is ready. You can now log in with your new credentials.'
              }
            </p>
            <Button
              onClick={() => navigation.navigate('Landing')}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] text-white hover:opacity-90"
            >
              Go to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
