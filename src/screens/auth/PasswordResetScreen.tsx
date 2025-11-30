import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Screen, NavigationParams } from '../../App';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

export default function PasswordResetScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = () => {
    setSent(true);
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

        {!sent ? (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#0966CC] to-[#0C4A6E] flex items-center justify-center mb-4">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl text-[#0f172a] mb-2">Reset Password</h1>
              <p className="text-[#64748b] px-4">
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                  />
                </div>
              </div>

              <Button
                onClick={handleReset}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] text-white hover:opacity-90"
              >
                Send Reset Link
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-[#10B981] mb-4" />
            <h2 className="text-xl text-[#0f172a] mb-2">Check Your Email</h2>
            <p className="text-[#64748b] px-4 mb-8">
              We've sent a password reset link to {email}
            </p>
            <Button
              onClick={() => navigation.goBack()}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] text-white hover:opacity-90"
            >
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
