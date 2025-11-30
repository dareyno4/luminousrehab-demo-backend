import React from 'react';
import { CheckCircle2, User, Pill, ArrowRight, Home } from 'lucide-react';
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

export default function NewPatientChartComplete({ navigation, route }: Props) {
  // Patient passed from previous screen; use safe fallback
  const patient = route.params?.patient || {
    first_name: 'Unknown',
    last_name: 'Patient',
    dob: 'N/A',
    phone: 'N/A',
    address1: 'N/A',
    address2: '',
    city: 'N/A',
    state: 'N/A',
    zip_code: 'N/A',
    notes: 'N/A',
  };

  const chartId = route.params?.chartId;
  const patientId = route.params?.patientId;
  const isNewPatient = route.params?.isNewPatient ?? true; // Default to true if not provided
  const existingChartFound = route.params?.existingChartFound ?? false;

  const handleGoToDashboard = () => {
    navigation.navigate('ClinicianDashboard');
  };

  // After chart creation, allow clinician to start capturing medications
  const handleStartMedicationCapture = () => {
    if (!patientId || !chartId) {
      // You can swap this to a toast if you prefer
      alert('Missing patient or chart information.');
      return;
    }

    navigation.navigate('CaptureSourceSelection', {
      patientId,
      chartId,
    });
  };

  const handleViewPatientList = () => {
    navigation.navigate('PatientChartList');
  };

  const calculateAge = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return null;

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const age = calculateAge(patient.dob);

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="w-10" />
          <h1 className="text-lg text-white">Chart Created</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Success Animation Area */}
          <div className="pt-8 pb-6 flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-75" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl">
                <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h2 className="text-3xl text-slate-900 font-semibold mt-8 mb-3 text-center">
              {isNewPatient ? 'Patient Chart Created!' : 'New Chart Added!'}
            </h2>
            <p className="text-slate-600 text-center max-w-md">
              {isNewPatient 
                ? 'Successfully created patient chart. You can now add medications through scanning or continue to the dashboard.'
                : 'Successfully created a new chart for this existing patient. You can now add medications through scanning or continue to the dashboard.'
              }
            </p>
          </div>

          {/* Chart Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Chart Summary
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    {isNewPatient ? 'Patient Created' : 'Patient (Existing)'}
                  </p>
                  <p className="text-slate-900 font-medium">
                    {patient.first_name} {patient.last_name}
                  </p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {age !== null ? `Age: ${age} • ` : null}
                    DOB: {patient.dob}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-green-700" />
                  <span className="text-xs font-medium text-green-700">
                    #CHT-{Date.now().toString().slice(-6)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Next Steps
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={handleStartMedicationCapture}
                className="w-full p-4 bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 rounded-xl transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium group-hover:text-sky-700 transition-colors">
                      Start Medication Capture
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Scan or manually enter medications
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors" />
                </div>
              </button>

              <button
                onClick={handleViewPatientList}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 rounded-xl transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium group-hover:text-slate-700 transition-colors">
                      View Patient List
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      See all patients and charts
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Button
            onClick={handleGoToDashboard}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
