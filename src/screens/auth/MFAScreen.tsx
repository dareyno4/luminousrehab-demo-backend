import React, { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Screen, NavigationParams } from '../../App';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

export default function MFAScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const [code, setCode] = useState('');

  const handleVerify = () => {
    if (!role) {
      alert('User role is missing');
      return;
    }

    // TODO: Verify the MFA code with backend using `code`
    // For now, just navigate based on role
    switch (role) {
      case 'clinician':
        navigation.navigate('ClinicianDashboard');
        break;
      case 'agency-admin':
        navigation.navigate('AgencyAdminDashboard');
        break;
      case 'scheduler':
        navigation.navigate('SchedulerDashboard');
        break;
      case 'super-admin':
        navigation.navigate('SuperAdminDashboard');
        break;
      default:
        // optional: show an error if role is unknown
        alert('Unknown user role');
        break;
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

        <div className="flex flex-col items-center text-center">
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#0966CC] to-[#0C4A6E] flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl text-[#0f172a] mb-2">Two-Factor Authentication</h1>
          <p className="text-[#64748b] px-4">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc] text-center text-lg tracking-widest"
            />
          </div>

          <Button
            onClick={handleVerify}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] text-white hover:opacity-90"
          >
            Verify Code
          </Button>

          <div className="text-center">
            <p className="text-sm text-[#64748b]">
              Didn&apos;t receive a code?{' '}
              <button className="text-[#0966CC] hover:underline">Resend</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
