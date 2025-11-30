import { useState, useCallback } from 'react';
import { runOCR, parseMedicationFromText, parseMultipleMedications, getMedicationConfidence, MedicationInfo, OCRResult, convertPDFToImages, parsePatientInfoFromText, PatientInfo } from '../utils/ocrService';

export interface UseOCRResult {
  isProcessing: boolean;
  error: string | null;
  ocrResult: OCRResult | null;
  medications: Partial<MedicationInfo>[];
  patientInfo: PatientInfo | null;
  scanImage: (file: File) => Promise<void>;
  scanFromCamera: () => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for OCR medication scanning
 */
export function useOCR(): UseOCRResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [medications, setMedications] = useState<Partial<MedicationInfo>[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);

  const scanImage = useCallback(async (file: File) => {
    if (!file) {
      setError('No file provided');
      return;
    }

    // Validate file type (now accepts images AND PDFs)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please provide a valid image or PDF file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setMedications([]);
    setPatientInfo(null);

    try {
      let allMedications: Partial<MedicationInfo>[] = [];
      let combinedOCRResult: OCRResult | null = null;
      let patientInfoFromPDF: PatientInfo | null = null;
      
      // If PDF, convert ALL pages to images and process each
      if (file.type === 'application/pdf') {
        console.log('📄 Converting PDF to images...');
        const images = await convertPDFToImages(file); // Gets all pages
        if (images.length === 0) {
          throw new Error('Failed to convert PDF to images');
        }
        console.log(`✅ PDF converted to ${images.length} image(s)`);
        
        // Process each page
        for (let i = 0; i < images.length; i++) {
          console.log(`🔍 Processing page ${i + 1}/${images.length}...`);
          const result = await runOCR(images[i]);
          
          // Store first page's OCR result for preview
          if (i === 0) {
            combinedOCRResult = result;
          }
          
          console.log(`📝 Page ${i + 1} OCR text:`, result.text);
          
          // Parse medications from this page
          const parsedMeds = parseMultipleMedications(result.text);
          console.log(`📦 Page ${i + 1}: Found ${parsedMeds.length} medication(s)`);
          
          // Add to overall list
          allMedications = [...allMedications, ...parsedMeds];
          
          // Extract patient info from first page only
          if (i === 0) {
            patientInfoFromPDF = parsePatientInfoFromText(result.text);
          }
        }
      } else {
        // Regular image processing
        const result = await runOCR(file);
        combinedOCRResult = result;
        
        console.log('📝 Raw OCR text:', result.text);
        
        // Parse medications from text
        allMedications = parseMultipleMedications(result.text);
        console.log(`📦 Parsed ${allMedications.length} medication(s)`);
        
        // Parse patient information
        patientInfoFromPDF = parsePatientInfoFromText(result.text);
      }
      
      setOcrResult(combinedOCRResult);

      // Add confidence scores
      const medsWithConfidence = allMedications.map(med => ({
        ...med,
        confidence: getMedicationConfidence(med),
      }));

      setMedications(medsWithConfidence);
      
      // Set patient info if found
      if (patientInfoFromPDF && Object.keys(patientInfoFromPDF).length > 0) {
        setPatientInfo(patientInfoFromPDF);
        console.log('👤 Parsed patient info:', patientInfoFromPDF);
      }
      
      // Log results for debugging
      medsWithConfidence.forEach((med, idx) => {
        console.log(`  Medication ${idx + 1}:`, {
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          confidence: med.confidence
        });
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      setError(errorMessage);
      console.error('OCR Error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const scanFromCamera = useCallback(async () => {
    try {
      // Check if browser supports camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported in this browser');
        return;
      }

      // Create file input to trigger camera on mobile
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera on mobile

      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          await scanImage(file);
        }
      };

      input.click();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      console.error('Camera Error:', err);
    }
  }, [scanImage]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setError(null);
    setOcrResult(null);
    setMedications([]);
    setPatientInfo(null);
  }, []);

  return {
    isProcessing,
    error,
    ocrResult,
    medications,
    patientInfo,
    scanImage,
    scanFromCamera,
    reset,
  };
}