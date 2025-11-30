import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Pill, Calendar, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Screen, NavigationParams } from '../../App';
import { supabaseClient } from '../../lib/supabase';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

export default function MedicationVerificationSummary({ navigation, route }: Props) {
  const { patientId, chartId, medicationData } = route.params;

  const [patientName, setPatientName] = useState<string>('');
  const [patientDob, setPatientDob] = useState<string>('');

  useEffect(() => {
    const loadPatient = async () => {
      if (!patientId) return;
      try {
        const { data, error } = await supabaseClient
          .from('patients')
          .select('first_name, last_name, date_of_birth')
          .eq('id', patientId)
          .single();
        if (error) throw error;
        if (!data) return;

        setPatientName(`${data.first_name} ${data.last_name}`);
        setPatientDob(
          data.date_of_birth
            ? new Date(data.date_of_birth).toLocaleDateString()
            : ''
        );
      } catch (err) {
        console.error('Error loading patient for summary', err);
      }
    };

    loadPatient();
  }, [patientId]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleConfirmVerification = () => {
    // Navigate to delivery options page
    navigation.navigate('MedicationVerificationDelivery', route.params);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">Verification Summary</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          
          {/* Context Bar */}
          <div className="bg-white rounded-2xl border border-sky-200 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-slate-900 mb-1">Review Verified Medication</h2>
                <p className="text-sm text-slate-600">Please confirm all information is correct before proceeding to delivery</p>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Patient Information
                </h3>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-2xl text-slate-900 font-semibold mb-2">
                {patientName}
              </h4>
              <p className="text-slate-600">
                DOB: {patientDob || 'Not Provided'}
              </p>
            </div>
          </div>

          {/* Verified Medication Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Verified Medication
                </h3>
              </div>
              <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                All Fields Verified
              </Badge>
            </div>

            <div className="p-6">
              {/* Medication Name */}
              <div className="mb-6">
                <h4 className="text-2xl text-slate-900 font-semibold">
                  {medicationData?.drugName} {medicationData?.strength}
                </h4>
              </div>

              <Separator className="my-6" />

              {/* Medication Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Drug Name</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-900 font-medium">{medicationData?.drugName}</p>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Strength</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-900 font-medium">{medicationData?.strength}</p>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Route</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-900 font-medium">{medicationData?.route}</p>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Frequency</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-900 font-medium">{medicationData?.frequency}</p>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Prescriber</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-900 font-medium">{medicationData?.prescriber}</p>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Scanned Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-slate-900 font-medium">{medicationData?.scannedDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Notice */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <h4 className="text-slate-900 font-medium mb-1">Confirm Verification</h4>
                <p className="text-sm text-slate-600">
                  By proceeding, you confirm that all medication information has been reviewed and is accurate. Next, you'll select delivery options.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Edit Medication
            </Button>
            <Button
              onClick={handleConfirmVerification}
              className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm & Continue to Delivery
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
