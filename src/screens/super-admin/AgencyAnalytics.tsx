import React from 'react';
import { ArrowLeft, FileText, CheckCircle, Clock, Users, Image, FileUp, Pill } from 'lucide-react';
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

export default function AgencyAnalytics({ navigation, route }: Props) {
  const agencyName = route.params.agencyName || 'Agency';

  // Mock data - in real app this would be fetched based on agencyId
  const analyticsData = {
    totalCharts: 0,
    finalized: 0,
    pending: 0,
    activeUsers: 0,
    ocrSuccessRates: {
      bottleScan: 0.0,
      pdfImport: 0.0,
      imageUpload: 0.0,
    },
    monthlyActivity: {
      chartsCreated: 0,
    },
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigation.goBack()}
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl text-[#0f172a] truncate">{agencyName}</h1>
              <p className="text-sm text-[#64748b] truncate">Analytics & Performance Metrics</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-8 space-y-6 sm:space-y-8">
        {/* Chart Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#0966CC]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl text-[#0f172a] mb-1">{analyticsData.totalCharts}</p>
            <p className="text-xs sm:text-sm text-[#64748b]">Total Charts</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#10B981]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl text-[#0f172a] mb-1">{analyticsData.finalized}</p>
            <p className="text-xs sm:text-sm text-[#64748b]">Finalized</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl text-[#0f172a] mb-1">{analyticsData.pending}</p>
            <p className="text-xs sm:text-sm text-[#64748b]">Pending</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#0966CC]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl text-[#0f172a] mb-1">{analyticsData.activeUsers}</p>
            <p className="text-xs sm:text-sm text-[#64748b]">Active Users</p>
          </div>
        </div>

        {/* OCR Success Rates */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl text-[#0f172a] mb-4 sm:mb-6">OCR Success Rates by Source</h2>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Bottle Scan */}
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                    <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-[#0966CC]" />
                  </div>
                  <span className="text-sm sm:text-base text-[#0f172a]">Bottle Scan</span>
                </div>
                <span className="text-sm sm:text-base text-[#0f172a]">{analyticsData.ocrSuccessRates.bottleScan.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0966CC] rounded-full transition-all"
                  style={{ width: `${analyticsData.ocrSuccessRates.bottleScan}%` }}
                />
              </div>
            </div>

            {/* PDF Import */}
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
                    <FileUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626]" />
                  </div>
                  <span className="text-sm sm:text-base text-[#0f172a]">PDF Import</span>
                </div>
                <span className="text-sm sm:text-base text-[#0f172a]">{analyticsData.ocrSuccessRates.pdfImport.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#DC2626] rounded-full transition-all"
                  style={{ width: `${analyticsData.ocrSuccessRates.pdfImport}%` }}
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                    <Image className="w-4 h-4 sm:w-5 sm:h-5 text-[#10B981]" />
                  </div>
                  <span className="text-sm sm:text-base text-[#0f172a]">Image Upload</span>
                </div>
                <span className="text-sm sm:text-base text-[#0f172a]">{analyticsData.ocrSuccessRates.imageUpload.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full transition-all"
                  style={{ width: `${analyticsData.ocrSuccessRates.imageUpload}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl text-[#0f172a] mb-3 sm:mb-4">Monthly Activity</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#0966CC]" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl text-[#0f172a]">{analyticsData.monthlyActivity.chartsCreated}</p>
              <p className="text-xs sm:text-sm text-[#64748b]">charts created this month</p>
            </div>
          </div>
        </div>

        {/* HIPAA Compliance Notice */}
        <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-xl border border-[#F59E0B] p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base text-[#0f172a] mb-1 sm:mb-2">HIPAA Compliance Notice</h3>
              <p className="text-xs sm:text-sm text-[#64748b]">
                Note: This dashboard displays aggregated, non-PHI metrics only. Individual patient data is not accessible to Super Admins per HIPAA compliance.
              </p>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
