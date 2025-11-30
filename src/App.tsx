import React, { useState } from 'react';
import type { MedicationInfo } from './utils/ocrService';
import { AuthProvider } from './context/AuthContext';

// Auth Screens
import LandingScreen from './screens/auth/LandingScreen';
import LoginScreen from './screens/auth/LoginScreen';
import MFAScreen from './screens/auth/MFAScreen';
import PasswordResetScreen from './screens/auth/PasswordResetScreen';
import AccountActivationScreen from './screens/auth/AccountActivationScreen';

// Clinician Screens
import ClinicianDashboard from './screens/clinician/ClinicianDashboard';
import PatientChartList from './screens/clinician/PatientChartList';
import NewPatientChart from './screens/clinician/NewPatientChart';
import NewPatientChartMedications from './screens/clinician/NewPatientChartMedications';
import NewPatientChartReview from './screens/clinician/NewPatientChartReview';
import NewPatientChartComplete from './screens/clinician/NewPatientChartComplete';
import CaptureSourceSelection from './screens/clinician/CaptureSourceSelection';
import ChartDetail from './screens/clinician/ChartDetail';
import MedicationVerification from './screens/clinician/MedicationVerification';
import ChartSummary from './screens/clinician/ChartSummary';
import ChartDelivery from './screens/clinician/ChartDelivery';
import ClinicianProfile from './screens/clinician/ClinicianProfile';
import ClinicianSettings from './screens/clinician/ClinicianSettings';

// Agency Admin Screens
import AgencyAdminDashboard from './screens/agency-admin/AgencyAdminDashboard';
import AgencyChartsView from './screens/agency-admin/AgencyChartsView';
import AgencyPatientsView from './screens/agency-admin/AgencyPatientsView';
import AgencyUsersView from './screens/agency-admin/AgencyUsersView';
import ChartDetailView from './screens/agency-admin/ChartDetailView';
import PatientDetailEdit from './screens/agency-admin/PatientDetailEdit';
import UserDetailEdit from './screens/agency-admin/UserDetailEdit';
import AgencyAdminProfile from './screens/agency-admin/AgencyAdminProfile';
import AgencyAdminSettings from './screens/agency-admin/AgencyAdminSettings';

// Scheduler Screens
import SchedulerDashboard from './screens/scheduler/SchedulerDashboard';
import SchedulerProfile from './screens/scheduler/SchedulerProfile';
import SchedulerSettings from './screens/scheduler/SchedulerSettings';

// Super Admin Screens
import SuperAdminDashboard from './screens/super-admin/SuperAdminDashboard';
import EditAgency from './screens/super-admin/EditAgency';
import AgencyAnalytics from './screens/super-admin/AgencyAnalytics';

export type Screen = 
  | 'Landing'
  | 'Login'
  | 'MFA'
  | 'PasswordReset'
  | 'AccountActivation'
  | 'ClinicianDashboard'
  | 'PatientChartList'
  | 'NewPatientChart'
  | 'NewPatientChartMedications'
  | 'NewPatientChartReview'
  | 'NewPatientChartComplete'
  | 'CaptureSourceSelection'
  | 'ChartDetail'
  | 'MedicationVerification'
  | 'MedicationVerificationSummary'
  | 'MedicationVerificationDelivery'
  | 'ChartSummary'
  | 'ChartDelivery'
  | 'ClinicianProfile'
  | 'ClinicianSettings'
  | 'AgencyAdminDashboard'
  | 'AgencyChartsView'
  | 'AgencyPatientsView'
  | 'AgencyUsersView'
  | 'ChartDetailView'
  | 'PatientDetailEdit'
  | 'UserDetailEdit'
  | 'AgencyAdminProfile'
  | 'AgencyAdminSettings'
  | 'SchedulerDashboard'
  | 'SchedulerProfile'
  | 'SchedulerSettings'
  | 'SuperAdminDashboard'
  | 'EditAgency'
  | 'AgencyAnalytics';

export interface NavigationParams {
  role?: 'clinician' | 'agency-admin' | 'scheduler' | 'super-admin';
  patientId?: string;
  chartId?: string;
  medicationId?: string;
  userId?: string;
  agencyId?: string;
  agencyName?: string;
  agencyData?: any;
  mode?: string;
  scanType?: string;
  medications?: any[];
  attachments?: File[];
  medicationData?: any;
  patientName?: string;
  scannedMedications?: Partial<MedicationInfo>[];
  openPDFScanner?: boolean;
  prefillData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    medicalRecordNumber: string;
    phone?: string;
    address?: string;
  };
  prefillMedications?: any[];
  patient?: {
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
  }; // Added patient property
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Landing');
  const [params, setParams] = useState<NavigationParams>({});
  const [history, setHistory] = useState<{ screen: Screen; params: NavigationParams }[]>([]);

  const navigate = (screen: Screen, navigationParams: NavigationParams = {}) => {
    setHistory([...history, { screen: currentScreen, params }]);
    setCurrentScreen(screen);
    setParams(navigationParams);
  };

  const goBack = () => {
    if (history.length > 0) {
      const previous = history[history.length - 1];
      setCurrentScreen(previous.screen);
      setParams(previous.params);
      setHistory(history.slice(0, -1));
    }
  };

  const navigation = { navigate, goBack };

  const renderScreen = () => {
    const screenProps = { navigation, route: { params } };

    switch (currentScreen) {
      case 'Landing':
        return <LandingScreen {...screenProps} />;
      case 'Login':
        return <LoginScreen {...screenProps} />;
      case 'MFA':
        return <MFAScreen {...screenProps} />;
      case 'PasswordReset':
        return <PasswordResetScreen {...screenProps} />;
      case 'AccountActivation':
        return <AccountActivationScreen {...screenProps} />;
      case 'ClinicianDashboard':
        return <ClinicianDashboard {...screenProps} />;
      case 'PatientChartList':
        return <PatientChartList {...screenProps} />;
      case 'NewPatientChart':
        return <NewPatientChart {...screenProps} />;
      case 'NewPatientChartMedications':
        return <NewPatientChartMedications {...screenProps} />;
      case 'NewPatientChartReview':
        return <NewPatientChartReview {...screenProps} />;
      case 'NewPatientChartComplete':
        return <NewPatientChartComplete {...screenProps} />;
      case 'CaptureSourceSelection':
        return <CaptureSourceSelection {...screenProps} />;
      case 'ChartDetail':
        return <ChartDetail {...screenProps} />;
      case 'MedicationVerification':
        return <MedicationVerification {...screenProps} />;
      case 'ChartSummary':
        return <ChartSummary {...screenProps} />;
      case 'ChartDelivery':
        return <ChartDelivery {...screenProps} />;
      case 'ClinicianProfile':
        return <ClinicianProfile {...screenProps} />;
      case 'ClinicianSettings':
        return <ClinicianSettings {...screenProps} />;
      case 'AgencyAdminDashboard':
        return <AgencyAdminDashboard {...screenProps} />;
      case 'AgencyChartsView':
        return <AgencyChartsView {...screenProps} />;
      case 'AgencyPatientsView':
        return <AgencyPatientsView {...screenProps} />;
      case 'AgencyUsersView':
        return <AgencyUsersView {...screenProps} />;
      case 'ChartDetailView':
        return <ChartDetailView {...screenProps} />;
      case 'PatientDetailEdit':
        return <PatientDetailEdit {...screenProps} />;
      case 'UserDetailEdit':
        return <UserDetailEdit {...screenProps} />;
      case 'AgencyAdminProfile':
        return <AgencyAdminProfile {...screenProps} />;
      case 'AgencyAdminSettings':
        return <AgencyAdminSettings {...screenProps} />;
      case 'SchedulerDashboard':
        return <SchedulerDashboard {...screenProps} />;
      case 'SchedulerProfile':
        return <SchedulerProfile {...screenProps} />;
      case 'SchedulerSettings':
        return <SchedulerSettings {...screenProps} />;
      case 'SuperAdminDashboard':
        return <SuperAdminDashboard {...screenProps} />;
      case 'EditAgency':
        return <EditAgency {...screenProps} />;
      case 'AgencyAnalytics':
        return <AgencyAnalytics {...screenProps} />;
      default:
        return <LandingScreen {...screenProps} />;
    }
  };

  return (
    <AuthProvider>
      <div className="h-screen w-full overflow-hidden bg-[#f8fafc]">
        {renderScreen()}
      </div>
    </AuthProvider>
  );
}
