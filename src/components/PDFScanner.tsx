import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { convertPDFToImages, runOCR, parseMultipleMedications, parsePatientInfoFromText, getMedicationConfidence, PatientInfo, MedicationInfo } from '../utils/ocrService';

interface Props {
  onPDFScanned: (medications: Partial<MedicationInfo>[], patientInfo?: PatientInfo, originalFile?: File) => void;
  onCancel: () => void;
  modal?: boolean;
}

export default function PDFScanner({ onPDFScanned, onCancel, modal = false }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [medications, setMedications] = useState<Partial<MedicationInfo>[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    setOriginalFile(file);
    setIsProcessing(true);
    setError(null);
    setMedications([]);
    setPatientInfo(null);
    setProcessingStatus('Converting PDF to images...');

    try {
      // Convert all pages
      const images = await convertPDFToImages(file);
      if (images.length === 0) {
        throw new Error('Failed to convert PDF to images');
      }

      setTotalPages(images.length);
      console.log(`✅ PDF converted to ${images.length} image(s)`);
      
      let allMedications: Partial<MedicationInfo>[] = [];
      let extractedPatientInfo: PatientInfo | null = null;

      // Process each page
      for (let i = 0; i < images.length; i++) {
        setCurrentPage(i + 1);
        setProcessingStatus(`Processing page ${i + 1} of ${images.length}...`);
        
        console.log(`🔍 Processing page ${i + 1}/${images.length}...`);
        const result = await runOCR(images[i]);
        
        console.log(`📝 Page ${i + 1} OCR text:`, result.text);
        
        // Parse medications from this page
        const parsedMeds = parseMultipleMedications(result.text);
        console.log(`📦 Page ${i + 1}: Found ${parsedMeds.length} medication(s)`, parsedMeds);
        
        // Add to overall list
        allMedications = [...allMedications, ...parsedMeds];
        
        // Extract patient info from first page only
        if (i === 0) {
          extractedPatientInfo = parsePatientInfoFromText(result.text);
          console.log('👤 Extracted patient info from first page:', extractedPatientInfo);
        }
      }

      // Add confidence scores
      const medsWithConfidence = allMedications.map(med => ({
        ...med,
        confidence: getMedicationConfidence(med),
      }));

      setMedications(medsWithConfidence);
      setPatientInfo(extractedPatientInfo);
      
      console.log(`✅ Total medications found: ${medsWithConfidence.length}`);
      console.log('Medications:', medsWithConfidence);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process PDF';
      setError(errorMessage);
      console.error('PDF Processing Error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUseMedications = () => {
    if (medications.length > 0 || patientInfo) {
      onPDFScanned(medications, patientInfo || undefined, originalFile || undefined);
    }
  };

  const handleReset = () => {
    setMedications([]);
    setPatientInfo(null);
    setOriginalFile(null);
    setError(null);
    setCurrentPage(0);
    setTotalPages(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={modal ? 'p-6' : 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6'}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">PDF Scanner</h2>
            <p className="text-sm text-slate-600 mt-1">Upload prescription PDFs to extract patient and medication information</p>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Upload Area */}
        {!isProcessing && medications.length === 0 && (
          <Card
            className="p-12 cursor-pointer hover:shadow-lg hover:border-violet-300 transition-all text-center"
            onClick={handleUploadClick}
          >
            <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload PDF File</h3>
            <p className="text-sm text-slate-600 mb-4">
              Click to select a prescription PDF from your device
            </p>
            <p className="text-xs text-slate-500">
              Supports multi-page PDFs • Automatically extracts all medications
            </p>
          </Card>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Processing State */}
        {isProcessing && (
          <Card className="p-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{processingStatus}</h3>
              {totalPages > 0 && (
                <p className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </p>
              )}
              <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: totalPages > 0 ? `${(currentPage / totalPages) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {!isProcessing && medications.length > 0 && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Extraction Complete</h3>
                  <p className="text-sm text-slate-600">
                    Found {medications.length} medication{medications.length !== 1 ? 's' : ''} 
                    {patientInfo && Object.keys(patientInfo).length > 0 && ' and patient information'}
                  </p>
                </div>
              </div>

              {/* Patient Info */}
              {patientInfo && Object.keys(patientInfo).length > 0 && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-sky-900 mb-2">Patient Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {patientInfo.firstName && (
                      <div>
                        <span className="text-sky-700 font-medium">Name:</span>{' '}
                        <span className="text-sky-900">{patientInfo.firstName} {patientInfo.lastName}</span>
                      </div>
                    )}
                    {patientInfo.dateOfBirth && (
                      <div>
                        <span className="text-sky-700 font-medium">DOB:</span>{' '}
                        <span className="text-sky-900">{patientInfo.dateOfBirth}</span>
                      </div>
                    )}
                    {patientInfo.phone && (
                      <div>
                        <span className="text-sky-700 font-medium">Phone:</span>{' '}
                        <span className="text-sky-900">{patientInfo.phone}</span>
                      </div>
                    )}
                    {patientInfo.medicalRecordNumber && (
                      <div>
                        <span className="text-sky-700 font-medium">MRN:</span>{' '}
                        <span className="text-sky-900">{patientInfo.medicalRecordNumber}</span>
                      </div>
                    )}
                    {patientInfo.address && (
                      <div className="col-span-2">
                        <span className="text-sky-700 font-medium">Address:</span>{' '}
                        <span className="text-sky-900">{patientInfo.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medications List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Medications Extracted</h4>
                {medications.map((med, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-semibold text-slate-900">{med.name || 'Unknown Medication'}</h5>
                      {med.confidence && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          {med.confidence}% confidence
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {med.dosage && (
                        <div>
                          <span className="text-slate-600">Dosage:</span>{' '}
                          <span className="text-slate-900 font-medium">{med.dosage}</span>
                        </div>
                      )}
                      {med.frequency && (
                        <div>
                          <span className="text-slate-600">Frequency:</span>{' '}
                          <span className="text-slate-900 font-medium">{med.frequency}</span>
                        </div>
                      )}
                      {med.route && (
                        <div>
                          <span className="text-slate-600">Route:</span>{' '}
                          <span className="text-slate-900 font-medium">{med.route}</span>
                        </div>
                      )}
                      {med.instructions && (
                        <div className="col-span-2">
                          <span className="text-slate-600">Instructions:</span>{' '}
                          <span className="text-slate-900 font-medium">{med.instructions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Scan Another PDF
              </Button>
              <Button
                onClick={handleUseMedications}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Use This Information
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
