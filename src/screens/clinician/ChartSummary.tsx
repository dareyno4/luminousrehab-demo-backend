import React from 'react';
import { ArrowLeft, CheckCircle2, Pill, Calendar, User, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
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

// Match the patient shape we used in NewPatientChartReview
interface Patient {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
}

export default function ChartSummary({ navigation, route }: Props) {
  const { patient: rawPatient, medications = [], patientId, chartId } = route.params || {};

  // Safe patient object with sensible defaults
  const patient: Patient = {
    first_name: '',
    last_name: '',
    dob: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    ...(rawPatient || {}),
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleExit = () => {
  navigation.navigate('ClinicianDashboard');
  };

  const handleConfirmVerification = () => {
    navigation.navigate('ChartDelivery', { patient, patientId, chartId, medications });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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
          <h1 className="text-lg text-white">Chart Summary</h1>
         <Button
          onClick={handleExit}
          variant="ghost"
          size="sm"
          className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Exit
        </Button>
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
                <h2 className="text-slate-900 mb-1">Review Complete Chart</h2>
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
      {patient.first_name} {patient.last_name}
    </h4>
    {patient.dob && (
      <p className="text-slate-600">
        Age {calculateAge(patient.dob)} • DOB: {formatDate(patient.dob)}
      </p>
    )}
  </div>
</div>

          {/* Verified Medications Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Verified Medications
                </h3>
              </div>
              <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {medications?.length || 0} Medications
              </Badge>
            </div>

            <div className="divide-y divide-slate-200">
              {medications?.map((med: any, index: number) => (
                <div key={index} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-sky-600">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      {/* Medication Name */}
                      <div className="mb-3">
                        <h4 className="text-lg text-slate-900 font-semibold">
                          {med.drugName} {med.strength}
                        </h4>
                      </div>

                      <Separator className="my-3" />

                      {/* Medication Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Drug Name</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-900 font-medium">{med.drugName}</p>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Strength</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-900 font-medium">{med.strength}</p>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Route</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-900 font-medium">{med.route}</p>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Frequency</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-900 font-medium">{med.frequency}</p>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Prescriber</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-900 font-medium">{med.prescriber}</p>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Scanned Date</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-sm text-slate-900 font-medium">{med.scannedDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation Notice */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <h4 className="text-slate-900 font-medium mb-1">Confirm Complete Chart</h4>
                <p className="text-sm text-slate-600">
                  By proceeding, you confirm that all {medications?.length || 0} medication(s) have been reviewed and are accurate. Next, you'll select delivery options.
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
              Back to Chart
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
