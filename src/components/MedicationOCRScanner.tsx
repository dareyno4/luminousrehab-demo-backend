import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, CheckCircle, AlertCircle, Loader2, FileText, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useOCR } from '../hooks/useOCR';
import { MedicationInfo, PatientInfo } from '../utils/ocrService';

interface Props {
  onMedicationsScanned: (medications: Partial<MedicationInfo>[], patientInfo?: PatientInfo, originalFile?: File) => void;
  onCancel: () => void;
  modal?: boolean;
}

export default function MedicationOCRScanner({ onMedicationsScanned, onCancel, modal = false }: Props) {
  const { isProcessing, error, medications, patientInfo, ocrResult, scanImage, scanFromCamera, reset } = useOCR();
  const [preview, setPreview] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [annotations, setAnnotations] = useState<Array<{ searchText: string; color: string; field: string }>>([]);
  const [highlightBoxes, setHighlightBoxes] = useState<Array<{ bbox: { x0: number; y0: number; x1: number; y1: number }; color: string }>>([]);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ocrResult?.previewImage) {
      setPreview(ocrResult.previewImage);
    }
  }, [ocrResult]);

  // Generate annotations (for legend) AND highlight boxes (for drawing)
  useEffect(() => {
    if (medications.length > 0 && ocrResult?.words) {
      const med = medications[0]; // For single medication
      const newAnnotations: Array<{ searchText: string; color: string; field: string }> = [];
      const newBoxes: Array<{ bbox: { x0: number; y0: number; x1: number; y1: number }; color: string }> = [];

      // Define fields and colors
      const fieldsToHighlight = [
        { field: 'Medication Name', text: med.name, color: '#0966CC' },
        { field: 'Dosage', text: med.dosage, color: '#10B981' },
        { field: 'Frequency', text: med.frequency, color: '#F59E0B' },
        { field: 'Route', text: med.route, color: '#8B5CF6' },
        { field: 'Quantity', text: med.quantity?.toString(), color: '#EC4899' },
        { field: 'Instructions', text: med.instructions, color: '#F97316' },
        { field: 'Prescriber', text: med.prescriber, color: '#06B6D4' },
      ];

      fieldsToHighlight.forEach(({ field, text, color }) => {
        if (text) {
          // Add to legend
          newAnnotations.push({ searchText: text, color, field });
          
          // Find matching words
          const cleanSearchText = text.toLowerCase().replace(/[^a-z0-9]/g, '');

          ocrResult.words?.forEach((word) => {
            const cleanWordText = word.text.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Match if the clean word is part of the clean search text
            if (cleanWordText && cleanSearchText.includes(cleanWordText)) {
              newBoxes.push({ bbox: word.bbox, color });
            }
          });
        }
      });

      setAnnotations(newAnnotations);
      setHighlightBoxes(newBoxes);
    }
  }, [medications, ocrResult]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store original file
    setOriginalFile(file);
    
    // Scan the image
    await scanImage(file);
  };

  const handleCameraClick = async () => {
    await scanFromCamera();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUseMedications = () => {
    if (medications.length > 0) {
      // Include the scanned image with each medication
      const medsWithImage = medications.map(med => ({
        ...med,
        image: preview || undefined,
      }));
      onMedicationsScanned(medsWithImage, patientInfo || undefined, originalFile || undefined);
    }
  };

  const handleReset = () => {
    reset();
    setPreview(null);
    setAnnotations([]);
    setHighlightBoxes([]);
    setOriginalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Use a different outer container depending on whether we're rendering in a modal
  const outerContainerClass = modal
    ? 'p-0'
    : 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6';

  const body = (
    <div className={outerContainerClass}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Medication OCR Scanner</h1>
            <p className="text-sm text-slate-600">Scan medication labels to auto-fill information</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

  {/* Main Content */}
  <div className="space-y-6">
          {/* Scan Options - Show when no preview */}
          {!preview && !isProcessing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className="p-8 cursor-pointer hover:shadow-lg hover:border-[#0966CC] transition-all group"
                onClick={handleCameraClick}
              >
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-[#E0F2FE] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-[#0966CC]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Take Photo</h3>
                  <p className="text-sm text-slate-600">
                    Use your camera to scan medication labels
                  </p>
                </div>
              </Card>

              <Card
                className="p-8 cursor-pointer hover:shadow-lg hover:border-[#10B981] transition-all group"
                onClick={handleUploadClick}
              >
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-[#D1FAE5] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload File</h3>
                  <p className="text-sm text-slate-600">
                    Choose a photo or PDF from your device
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Processing State */}
          {isProcessing && (
            <Card className="p-8">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#0966CC] animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Processing Image...</h3>
                <p className="text-sm text-slate-600">
                  Extracting medication information using OCR
                </p>
              </div>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview and Results */}
          {preview && !isProcessing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image Preview */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Scanned Image
                  </h3>
                  {/* Annotation Toggle */}
                  {annotations.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-annotations"
                        checked={showAnnotations}
                        onCheckedChange={setShowAnnotations}
                      />
                      <Label
                        htmlFor="show-annotations"
                        className="text-xs text-slate-600 cursor-pointer flex items-center gap-1"
                      >
                        {showAnnotations ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Annotations
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Annotations
                          </>
                        )}
                      </Label>
                    </div>
                  )}
                </div>
                
                {/* Image with HTML Overlay - Fixed dimensions */}
                <div className="relative w-full max-h-[60vh] rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  {/* Base Image */}
                  <img
                    src={preview}
                    alt="Scanned medication"
                    className="w-full h-auto max-h-[60vh] object-contain block"
                  />
                  
                  {/* Highlight Overlays */}
                  {showAnnotations && highlightBoxes.length > 0 && ocrResult?.previewImageWidth && ocrResult?.previewImageHeight && (
                    <div className="absolute top-0 left-0 w-full h-full">
                      {highlightBoxes.map((box, idx) => {
                        // Calculate percentage-based position and size
                        const width = (box.bbox.x1 - box.bbox.x0) / ocrResult.previewImageWidth! * 100;
                        const height = (box.bbox.y1 - box.bbox.y0) / ocrResult.previewImageHeight! * 100;
                        const left = (box.bbox.x0 / ocrResult.previewImageWidth!) * 100;
                        const top = (box.bbox.y0 / ocrResult.previewImageHeight!) * 100;

                        return (
                          <span
                            key={idx}
                            className="absolute border-2"
                            style={{
                              backgroundColor: box.color + '40', // ~25% opacity
                              borderColor: box.color,
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${width}%`,
                              height: `${height}%`,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Color Legend */}
                {showAnnotations && annotations.length > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">Color Legend:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {annotations.map((annotation, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm border"
                            style={{ backgroundColor: annotation.color, borderColor: annotation.color }}
                          />
                          <span className="text-slate-600">{annotation.field}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="w-full mt-3"
                >
                  <X className="w-4 h-4 mr-2" />
                  Scan Different Image
                </Button>
              </Card>

              {/* Results */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#10B981]" />
                  Extracted Information
                </h3>

                {medications.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">
                      No medication information detected. Try a clearer image.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medications.map((med, index) => (
                      <div
                        key={index}
                        className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200"
                      >
                        {/* Medication Name */}
                        {med.name && (
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Medication Name
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {med.name}
                            </span>
                          </div>
                        )}

                        {/* Dosage */}
                        {med.dosage && (
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Dosage
                            </span>
                            <span className="text-sm text-slate-900">{med.dosage}</span>
                          </div>
                        )}

                        {/* Frequency */}
                        {med.frequency && (
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Frequency
                            </span>
                            <span className="text-sm text-slate-900">{med.frequency}</span>
                          </div>
                        )}

                        {/* Route */}
                        {med.route && (
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Route
                            </span>
                            <span className="text-sm text-slate-900 capitalize">{med.route}</span>
                          </div>
                        )}

                        {/* Quantity */}
                        {med.quantity && (
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Quantity
                            </span>
                            <span className="text-sm text-slate-900">{med.quantity}</span>
                          </div>
                        )}

                        {/* Instructions */}
                        {med.instructions && (
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Instructions
                            </span>
                            <span className="text-sm text-slate-900">{med.instructions}</span>
                          </div>
                        )}

                        {/* Confidence Badge */}
                        {med.confidence !== undefined && (
                          <div className="pt-2 border-t border-slate-200">
                            <Badge
                              className={
                                med.confidence >= 75
                                  ? 'bg-[#D1FAE5] text-[#10B981] border-[#10B981]'
                                  : med.confidence >= 50
                                  ? 'bg-[#FEF3C7] text-[#F59E0B] border-[#F59E0B]'
                                  : 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]'
                              }
                            >
                              {med.confidence}% Confidence
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Use Medications Button */}
                    <Button
                      onClick={handleUseMedications}
                      className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Use {medications.length} Medication{medications.length !== 1 ? 's' : ''}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Instructions */}
          <Card className="p-6 bg-[#E0F2FE] border-[#0966CC]/30">
            <h4 className="text-sm font-semibold text-[#0966CC] mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tips for Best Results
            </h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-6 list-disc">
              <li>Ensure the medication label is clearly visible and in focus</li>
              <li>Use good lighting - avoid shadows and glare</li>
              <li>Capture the entire label with medication name, dosage, and instructions</li>
              <li>Hold the camera steady or use a flat surface</li>
              <li>Review and edit extracted information before saving</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );

  if (modal) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onCancel} />

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 overflow-y-auto">{body}</div>
          </div>
        </div>
      </>
    );
  }

  return body;
}
