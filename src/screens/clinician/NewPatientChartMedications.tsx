import React, { useState } from 'react';
import { ArrowLeft, Plus, Pill, ChevronRight, Trash2, Edit2, Camera, FileText, Upload, Scan, Barcode, Check, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Screen, NavigationParams } from '../../App';
import { Paperclip } from 'lucide-react';
import MedicationBarcodeScanner, { ScannedMedication } from '../../components/MedicationBarcodeScanner';
import MedicationOCRScanner from '../../components/MedicationOCRScanner';
import { MedicationInfo } from '../../utils/ocrService';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
}

const ROUTES = ['Oral', 'Topical', 'Inhalation', 'Injection', 'IV', 'Sublingual', 'Rectal', 'Transdermal'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'Weekly', 'Monthly'];

export default function NewPatientChartMedications({ navigation, route }: Props) {
  const scannedMedications = route?.params?.scannedMedications || [];
  const scanType = route?.params?.scanType;

  // Initialize with scanned medications if available
  const [medications, setMedications] = useState<Medication[]>(
    scannedMedications.map((med: any, index: number) => ({
      id: `scanned-${index}`,
      ...med
    }))
  );
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCaptureOptions, setShowCaptureOptions] = useState(false);
  const [showScanBanner, setShowScanBanner] = useState(scannedMedications.length > 0);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  
  // Form state
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [medRoute, setMedRoute] = useState('');


  // Initialize attachments from route params (preserves PDF from previous screen)
  const [attachments, setAttachments] = useState<File[]>(route?.params?.attachments || []);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    setAttachments(Array.from(e.target.files));
  }
};

  const resetForm = () => {
    setMedName('');
    setDosage('');
    setFrequency('');
    setMedRoute('');
    setIsAdding(false);
    setEditingId(null);
    setShowCaptureOptions(false);
  };

  const handleScanOption = (scanType: string) => {
    setShowCaptureOptions(false);
    
    if (scanType === 'Barcode') {
      setShowBarcodeScanner(true);
    } else if (scanType === 'Bottle OCR') {
      setShowOCRScanner(true);
    } else {
      // For Import PDF, show placeholder for now
      alert(`${scanType} capture will be implemented.`);
    }
  };

  const handleManualEntry = () => {
    setShowCaptureOptions(false);
    setIsAdding(true);
  };

  const handleBarcodeScanned = (meds: ScannedMedication[]) => {
    const newMeds: Medication[] = meds.map((med, index) => ({
      id: `barcode-${Date.now()}-${index}`,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      route: med.route,
    }));
    setMedications([...medications, ...newMeds]);
    setShowBarcodeScanner(false);
  };

  const handleOCRScanned = (meds: Partial<MedicationInfo>[]) => {
    const newMeds: Medication[] = meds.map((med, index) => ({
      id: `ocr-${Date.now()}-${index}`,
      name: med.name || '',
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      route: med.route || '',
    }));
    setMedications([...medications, ...newMeds]);
    setShowOCRScanner(false);
  };

  const handleAddMedication = () => {
    if (medName && dosage && frequency && medRoute) {
      const newMed: Medication = {
        id: Date.now().toString(),
        name: medName,
        dosage,
        frequency,
        route: medRoute,
      };
      setMedications([...medications, newMed]);
      resetForm();
    }
  };

  const handleUpdateMedication = () => {
    if (editingId && medName && dosage && frequency && medRoute) {
      setMedications(
        medications.map((med) =>
          med.id === editingId
            ? { ...med, name: medName, dosage, frequency, route: medRoute }
            : med
        )
      );
      resetForm();
    }
  };

  const handleEditMedication = (med: Medication) => {
    setMedName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setMedRoute(med.route);
    setEditingId(med.id);
    setIsAdding(true);
  };

  const handleDeleteMedication = (id: string) => {
    setMedications(medications.filter((med) => med.id !== id));
  };

  const handleContinue = () => {
    navigation.navigate('NewPatientChartReview', { 
      ...route.params,
      medications,
      attachments,
    });
  };

  const handleSkip = () => {
    // Skip medications and go to review
    navigation.navigate('NewPatientChartReview', route.params);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">New Patient Chart</h1>
          <button
            onClick={() => navigation.navigate('ClinicianDashboard')}
            className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 flex items-center gap-2 transition-colors text-white text-sm font-medium"
            aria-label="Exit to dashboard"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          
          {/* Context Bar */}
          <div className="bg-white rounded-2xl border border-sky-200 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <Pill className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-slate-900 mb-1">Current Medications</h2>
                <p className="text-sm text-slate-600">Add patient's current medications (optional — can be completed later)</p>
              </div>
            </div>
          </div>

          {/* Scan Success Banner */}
          {showScanBanner && scanType && medications.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl shadow-sm border border-emerald-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[15px] text-emerald-900 font-medium">
                      {medications.length} Medication{medications.length > 1 ? 's' : ''} Captured via {scanType}
                    </p>
                    <p className="text-sm text-emerald-700">
                      Review and verify scanned medications, or add more as needed.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScanBanner(false)}
                  className="w-8 h-8 rounded-lg hover:bg-emerald-200 flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4 text-emerald-700" />
                </button>
              </div>
            </div>
          )}

          {/* Medications List */}
          {medications.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Added Medications ({medications.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-200">
                {medications.map((med) => (
                  <div key={med.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          <h4 className="text-slate-900 font-medium">{med.name}</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-slate-500">Dosage:</span>
                            <p className="text-slate-700 font-medium">{med.dosage}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Frequency:</span>
                            <p className="text-slate-700 font-medium">{med.frequency}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Route:</span>
                            <p className="text-slate-700 font-medium">{med.route}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMedication(med)}
                          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedication(med.id)}
                          className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
         {/* Attachments section */}
          <div className="mt-8 bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Attachments</h2>
                  <p className="text-xs text-slate-500">
                    Optional documents to upload with this chart.
                  </p>
                </div>
              </div>
            </div>

            {/* ⬇️ This is the actual upload button */}
            <label className="mt-3 ml-14 bg-[#0966CC] hover:bg-[#0C4A6E] text-white px-4 py-2 rounded-xl cursor-pointer inline-flex items-center">
              <Upload className="w-4 h-4 mr-2" />
              Choose files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentChange}
              />
            </label>

            {attachments.length > 0 && (
              <ul className="mt-4 space-y-2 text-xs text-slate-700">
                {attachments.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <span className="truncate max-w-xs">{file.name}</span>
                    <span className="text-slate-400 text-[11px]">
                      {Math.round(file.size / 1024)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Capture Options Modal */}
          {showCaptureOptions && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Choose Capture Method
                  </h3>
                  <button
                    onClick={() => setShowCaptureOptions(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Select how you want to add medication information
                </p>

                {/* Manual Entry Option */}
                <button
                  onClick={handleManualEntry}
                  className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-sky-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-colors">
                      <Plus className="w-6 h-6 text-sky-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-slate-900 font-medium mb-1">Manual Entry</h4>
                      <p className="text-sm text-slate-600">Type medication details manually</p>
                    </div>
                  </div>
                </button>

                {/* Barcode Scan Option */}
                <button
                  onClick={() => handleScanOption('Barcode')}
                  className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-emerald-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                      <Barcode className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-slate-900 font-medium mb-1">Scan Barcode</h4>
                      <p className="text-sm text-slate-600">Scan medication barcode for quick lookup</p>
                    </div>
                  </div>
                </button>

                {/* Bottle OCR Option */}
                <button
                  onClick={() => handleScanOption('Bottle OCR')}
                  className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-violet-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                      <Camera className="w-6 h-6 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-slate-900 font-medium mb-1">Scan Bottle (OCR)</h4>
                      <p className="text-sm text-slate-600">Capture text from medication bottle labels</p>
                    </div>
                  </div>
                </button>

                {/* Import PDF Option */}
                <button
                  onClick={() => handleScanOption('Import PDF')}
                  className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-amber-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                      <Upload className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-slate-900 font-medium mb-1">Import PDF/Image</h4>
                      <p className="text-sm text-slate-600">Upload existing PDF or image files</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Add Medication Form */}
          {isAdding ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 space-y-5">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  {editingId ? 'Edit Medication' : 'Add Medication'}
                </h3>
                
                <div>
                  <Label htmlFor="medName" className="text-slate-700">
                    Medication Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="medName"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g., Lisinopril"
                    className="mt-2 h-12 rounded-xl border-2 border-slate-200 bg-slate-50 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <Label htmlFor="dosage" className="text-slate-700">
                    Dosage <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dosage"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g., 10mg"
                    className="mt-2 h-12 rounded-xl border-2 border-slate-200 bg-slate-50 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <Label htmlFor="frequency" className="text-slate-700">
                    Frequency <span className="text-red-500">*</span>
                  </Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="mt-2 h-12 rounded-xl border-2 border-slate-200 bg-slate-50 focus:ring-sky-200">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {freq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="medRoute" className="text-slate-700">
                    Route <span className="text-red-500">*</span>
                  </Label>
                  <Select value={medRoute} onValueChange={setMedRoute}>
                    <SelectTrigger className="mt-2 h-12 rounded-xl border-2 border-slate-200 bg-slate-50 focus:ring-sky-200">
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-2 border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingId ? handleUpdateMedication : handleAddMedication}
                    disabled={!medName || !dosage || !frequency || !medRoute}
                    className="flex-1 h-12 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
                  >
                    {editingId ? 'Update' : 'Add'} Medication
                  </Button>
                </div>
              </div>
            </div>
          ) : !showCaptureOptions ? (
            <button
              onClick={() => setShowCaptureOptions(true)}
              className="w-full p-6 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-400 hover:bg-sky-50/50 transition-all group"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-slate-600 group-hover:text-sky-600" />
                </div>
                <span className="text-slate-700 font-medium">Add Medication</span>
              </div>
            </button>
          ) : null}

          {/* Helper Text */}
          {medications.length === 0 && !isAdding && (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">
                No medications added yet. You can add them now or skip this step.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 h-12 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-sm"
            >
              Continue to Review
            </Button>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <MedicationBarcodeScanner
          onMedicationsScanned={handleBarcodeScanned}
          onCancel={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* OCR Scanner Modal */}
      {showOCRScanner && (
        <MedicationOCRScanner
          onMedicationsScanned={handleOCRScanned}
          onCancel={() => setShowOCRScanner(false)}
          modal={true}
        />
      )}
    </div>
  );
}
