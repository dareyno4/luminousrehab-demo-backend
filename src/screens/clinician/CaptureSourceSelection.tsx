import React from 'react';
import { ArrowLeft, Camera, FileText, Upload, Scan } from 'lucide-react';
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

export default function CaptureSourceSelection({ navigation, route }: Props) {
  const { patientId, chartId } = route.params;

  const handleScanOption = (scanType: string) => {
    // Navigate to appropriate scanning screen based on type
    // For now, navigate to chart detail with mock data
    navigation.navigate('ChartDetail', { patientId, chartId, scanType });
  };

  const scanOptions = [
    {
      id: 'bottle',
      title: 'Bottle Photo',
      description: 'Scan medication bottle labels',
      icon: Camera,
      color: 'from-[#0966CC] to-[#0C4A6E]',
      bgColor: 'bg-[#E0F2FE]',
      iconColor: 'text-[#0966CC]',
    },
    {
      id: 'document',
      title: 'Document Scan',
      description: 'Scan paper documents (DC summary, PCP med list, referrals)',
      icon: Scan,
      color: 'from-[#10B981] to-[#059669]',
      bgColor: 'bg-[#D1FAE5]',
      iconColor: 'text-[#10B981]',
    },
    {
      id: 'import',
      title: 'Import PDF/Image',
      description: 'Import a PDF or photo of a document',
      icon: Upload,
      color: 'from-[#F59E0B] to-[#D97706]',
      bgColor: 'bg-[#FEF3C7]',
      iconColor: 'text-[#F59E0B]',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">Scan Feature</h1>
          <div className="w-10" />
        </div>

        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl text-white mb-2">Luminous Home Health • Anna (Clinician)</h2>
          <p className="text-sm text-white/80">New Patient</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title */}
          <div className="text-center mb-6">
            <h3 className="text-xl text-[#0f172a] mb-2">Choose a scan option to begin</h3>
            <p className="text-sm text-[#64748b]">Select how you want to capture medication information</p>
          </div>

          {/* Scan Options */}
          <div className="space-y-4">
            {scanOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleScanOption(option.id)}
                  className="w-full bg-white rounded-2xl border-2 border-[#e2e8f0] p-6 hover:border-[#0966CC] hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-xl ${option.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <IconComponent className={`w-8 h-8 ${option.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg text-[#0f172a] mb-2">{option.title}</h4>
                      <p className="text-sm text-[#64748b]">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search charts by patient name..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] placeholder:text-[#94a3b8]"
              />
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
