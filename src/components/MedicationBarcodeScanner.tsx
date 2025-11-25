import React, { useState, useRef } from 'react';
import { 
  BrowserMultiFormatReader, 
  BrowserBarcodeReader,
  Result,
  DecodeHintType,
  BarcodeFormat
} from '@zxing/library';
import { ArrowLeft, Camera, Upload, X, AlertCircle, Check } from 'lucide-react';
import { lookupProductByUPC } from '../utils/ocrService';
import { logInfo } from '../lib/logger';
import { Button } from './ui/button';

interface FDAMedicationData {
  brand_name?: string;
  generic_name?: string;
  dosage_form?: string;
  route?: string[];
  active_ingredients?: Array<{
    name: string;
    strength: string;
  }>;
}

export interface ScannedMedication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  image?: string; // base64 data URL of scanned image
}

interface Props {
  onMedicationsScanned: (medications: ScannedMedication[]) => void;
  onCancel: () => void;
}

export default function MedicationBarcodeScanner({ onMedicationsScanned, onCancel }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [barcodeFormatStr, setBarcodeFormatStr] = useState<string>('');
  const [medication, setMedication] = useState<FDAMedicationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDebugLog = (message: string, ctx?: any) => {
    logInfo(message, ctx);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      addDebugLog('No file selected');
      return;
    }

    addDebugLog(`File selected: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    setError('');
    setBarcode('');
    setMedication(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      addDebugLog('Image loaded into memory, starting scan...');
      setImage(imageUrl);
      await scanBarcode(imageUrl);
    };
    reader.onerror = (err) => {
      addDebugLog(`FileReader error: ${err}`);
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const scanBarcode = async (imageUrl: string) => {
    setLoading(true);
    setError('');

    try {
      addDebugLog('Creating Image element...');
      const img = new Image();
      img.src = imageUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      addDebugLog(`Image loaded successfully: ${img.width}x${img.height} pixels`);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      const maxDimension = 1500;
      let width = img.width;
      let height = img.height;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
        addDebugLog(`Scaling image down to: ${Math.round(width)}x${Math.round(height)}`);
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const scaledImageUrl = canvas.toDataURL('image/jpeg', 0.95);
      const scaledImg = new Image();
      scaledImg.src = scaledImageUrl;
      
      await new Promise((resolve) => {
        scaledImg.onload = resolve;
      });
      
      addDebugLog('Image preprocessed, attempting barcode detection...');

      const hints: Map<DecodeHintType, any> = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);

      const orientedImages: Array<{angle: number; img: HTMLImageElement}> = [];
      orientedImages.push({ angle: 0, img: scaledImg });
      const angles = [90, 180, 270];
      for (const angle of angles) {
        const rc = document.createElement('canvas');
        const rctx = rc.getContext('2d');
        if (!rctx) continue;
        if (angle === 90 || angle === 270) {
          rc.width = scaledImg.height;
          rc.height = scaledImg.width;
        } else {
          rc.width = scaledImg.width;
          rc.height = scaledImg.height;
        }
        rctx.translate(rc.width / 2, rc.height / 2);
        rctx.rotate((angle * Math.PI) / 180);
        rctx.drawImage(scaledImg, -scaledImg.width / 2, -scaledImg.height / 2);
        const rotatedUrl = rc.toDataURL('image/jpeg', 0.95);
        const rotatedImg = new Image();
        rotatedImg.src = rotatedUrl;
        await new Promise((resolve) => { rotatedImg.onload = resolve; });
        orientedImages.push({ angle, img: rotatedImg });
      }

      const readers = [
        { name: 'MultiFormat', make: () => new BrowserMultiFormatReader(hints as any) },
        { name: 'UPC/EAN', make: () => new BrowserBarcodeReader() },
      ];

      for (const { name, make } of readers) {
        for (const { angle, img: tryImg } of orientedImages) {
          try {
            addDebugLog(`Trying ${name} reader at ${angle}° ...`);
            const reader = make();
            // @ts-ignore: set hints if available
            if ((reader as any).hints === undefined && name === 'MultiFormat') {
              (reader as any).hints = hints;
            }
            const result: Result = await reader.decodeFromImageElement(tryImg);
            const barcodeData = result.getText();
            const barcodeFormat = result.getBarcodeFormat();
            
            addDebugLog(`✓ BARCODE DETECTED with ${name} at ${angle}°!`);
            addDebugLog(`Format: ${BarcodeFormat[barcodeFormat]}`);
            addDebugLog(`Raw data: "${barcodeData}"`);
            addDebugLog(`Length: ${barcodeData.length} characters`);
            
            setBarcode(barcodeData);
            setBarcodeFormatStr(BarcodeFormat[barcodeFormat] || String(barcodeFormat));
            
            addDebugLog('Beginning medication/product lookup flow...');
            
            const fdaMedication = await lookupMedication(barcodeData);
            
            const isRetailFormat = [BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8].includes(barcodeFormat);
            
            if (fdaMedication) {
              addDebugLog(`✓ FDA medication found: ${fdaMedication.brand_name || fdaMedication.generic_name}`);
              setLoading(false);
              return;
            } else if (isRetailFormat) {
              addDebugLog('NDC lookup failed. Detected retail barcode format (UPC/EAN), attempting product lookup...');
              const upcProduct = await lookupProductByUPC(barcodeData);
              
              if (upcProduct) {
                addDebugLog(`✓ UPC/EAN product found: ${upcProduct.title || upcProduct.brand || 'Unnamed'}`);
                
                const scannedMed: ScannedMedication = {
                  name: upcProduct.title || upcProduct.brand || `Product ${barcodeData}`,
                  dosage: 'See package',
                  frequency: 'As directed',
                  route: 'Oral',
                };
                
                setError('');
                addDebugLog(`Passing scanned product to parent component...`);
                onMedicationsScanned([scannedMed]);
                setLoading(false);
                return;
              } else {
                addDebugLog('✗ UPC/EAN product lookup returned no data.');
                setError('Product found but not in medication database. You can continue with manual entry.');
              }
            } else {
              addDebugLog('✗ No FDA medication found and barcode is not retail format (UPC/EAN).');
              setError('Medication not found in FDA database. This may be a non-NDC barcode.');
            }

            setLoading(false);
            return;
          } catch (err: any) {
            addDebugLog(`✗ ${name} at ${angle}° failed: ${err.message || err}`);
            continue;
          }
        }
      }
      
      throw new Error('All barcode readers failed to detect the code');
      
    } catch (err: any) {
      addDebugLog(`✗✗✗ ALL BARCODE DETECTION FAILED`);
      addDebugLog(`Error: ${err.message || err}`);
      addDebugLog('Suggestions: Try a clearer image, better lighting, or crop closer to barcode');
      console.error('Full error:', err);
      setError('No barcode detected in image. Please try another image with a clear barcode.');
    } finally {
      setLoading(false);
    }
  };

  const convertToNDCFormat = (code: string): string[] => {
    const digits = code.replace(/\D/g, '');
    
    addDebugLog(`Converting barcode to NDC format...`);
    addDebugLog(`Original: "${code}"`);
    addDebugLog(`Digits only: "${digits}" (${digits.length} digits)`);
    
    const formats: string[] = [];
    
    if (code.includes('-')) {
      const segments = code.split('-');
      if (segments.length >= 2) {
        formats.push(`${segments[0]}-${segments[1]}`);
      }
    }
    
    if (digits.length === 12) {
      const ndc11 = digits.slice(1, 12);
      const ndc10 = digits.slice(1, 11);
      addDebugLog(`12-digit UPC-A detected, extracted NDC: ${ndc11}`);
      
      formats.push(`${ndc11.slice(0, 4)}-${ndc11.slice(4, 8)}`);
      formats.push(`${ndc11.slice(0, 5)}-${ndc11.slice(5, 8)}`);
      formats.push(`${ndc11.slice(0, 5)}-${ndc11.slice(5, 9)}`);
      
      formats.push(`${ndc10.slice(0, 4)}-${ndc10.slice(4, 8)}`);
      formats.push(`${ndc10.slice(0, 5)}-${ndc10.slice(5, 8)}`);
      formats.push(`${ndc10.slice(0, 5)}-${ndc10.slice(5, 9)}`);
      
      formats.push(`0${ndc10.slice(0, 4)}-${ndc10.slice(4, 8)}`);
      formats.push(`0${ndc10.slice(0, 3)}-${ndc10.slice(3, 7)}`);
    }
    
    if (digits.length === 11) {
      addDebugLog(`11-digit code detected`);
      formats.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}`);
      formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 8)}`);
      formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
      
      const d10 = digits.slice(0, 10);
      formats.push(`${d10.slice(0, 4)}-${d10.slice(4, 8)}`);
      formats.push(`${d10.slice(0, 5)}-${d10.slice(5, 8)}`);
    }
    
    if (digits.length === 10) {
      const padded = '0' + digits;
      addDebugLog(`10-digit code, padding to: ${padded}`);
      formats.push(`${padded.slice(0, 4)}-${padded.slice(4, 8)}`);
      formats.push(`${padded.slice(0, 5)}-${padded.slice(5, 8)}`);
      formats.push(`${padded.slice(0, 5)}-${padded.slice(5, 9)}`);
      formats.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}`);
      formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 8)}`);
    }
    
    if (digits.length === 8) {
      formats.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}`);
    }
    if (digits.length === 9) {
      formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
    }
    
    const noLeadingZeros = digits.replace(/^0+/, '');
    if (noLeadingZeros.length >= 8) {
      formats.push(`${noLeadingZeros.slice(0, 4)}-${noLeadingZeros.slice(4, 8)}`);
      formats.push(`${noLeadingZeros.slice(0, 5)}-${noLeadingZeros.slice(5, 8)}`);
    }
    
    const uniqueFormats = [...new Set(formats)];
    addDebugLog(`Generated ${uniqueFormats.length} NDC format(s): ${uniqueFormats.join(', ')}`);
    
    return uniqueFormats;
  };

  const lookupMedication = async (code: string) => {
    const possibleFormats = convertToNDCFormat(code);
    
    addDebugLog(`Starting FDA API lookup with ${possibleFormats.length} format(s)...`);
    
    for (let i = 0; i < possibleFormats.length; i++) {
      const format = possibleFormats[i];
      try {
        addDebugLog(`[${i + 1}/${possibleFormats.length}] Trying: ${format}`);
        const url = `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${format}"&limit=1`;
        addDebugLog(`API URL: ${url}`);
        
        const response = await fetch(url);
        
        addDebugLog(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          addDebugLog(`Response data: ${JSON.stringify(data).substring(0, 200)}...`);
          
          if (data.results && data.results.length > 0) {
            addDebugLog(`✓ SUCCESS! Found medication: ${data.results[0].brand_name || data.results[0].generic_name}`);
            setMedication(data.results[0]);
            return data.results[0];
          } else {
            addDebugLog(`✗ No results in response`);
          }
        } else {
          const errorText = await response.text();
          addDebugLog(`✗ API error: ${errorText.substring(0, 100)}`);
        }
      } catch (err: any) {
        addDebugLog(`✗ Request failed: ${err.message}`);
        continue;
      }
    }
    
    addDebugLog(`✗✗✗ ALL FORMATS FAILED - Medication not found in FDA database`);
    setError(
      `Medication not found in FDA database. This may not be an NDC barcode or the medication is not registered.`
    );
    return null;
  };

  const handleUseThisMedication = () => {
    if (!medication) return;

    const scannedMed: ScannedMedication = {
      name: medication.brand_name || medication.generic_name || 'Unknown',
      dosage: medication.active_ingredients?.[0]?.strength || 'See package',
      frequency: 'As directed',
      route: medication.route?.[0] || 'Oral',
      image: image || undefined, // Include the scanned image
    };

    onMedicationsScanned([scannedMed]);
  };

  const handleScanAnother = () => {
    setImage(null);
    setBarcode('');
    setMedication(null);
    setError('');
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onCancel} />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 relative">
            <button
              onClick={onCancel}
              className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white hover:bg-white/90 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-emerald-700" />
            </button>
            
            <div className="text-center pt-8">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Scan Medication Barcode</h2>
              <p className="text-sm text-emerald-50">
                Take a photo or upload an image of the medication barcode
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
          
          {!image && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo
                </Button>
                
                <Button
                  onClick={() => {
                    const input = fileInputRef.current;
                    if (input) {
                      input.removeAttribute('capture');
                      input.click();
                    }
                  }}
                  variant="outline"
                  className="h-14 rounded-xl border-2 border-slate-300 hover:bg-slate-50 font-medium"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload from Gallery
                </Button>
              </div>
            </div>
          )}

          {image && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Scanned Image</h3>
                <button
                  onClick={handleScanAnother}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <img 
                src={image} 
                alt="Medication barcode" 
                className="w-full max-h-96 object-contain rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Scanning barcode...</p>
              <p className="text-sm text-slate-500 mt-2">This may take a few seconds</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-red-900 font-semibold mb-1">Medication Not Found</h4>
                    <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                  </div>
                  {barcode && (
                    <div className="bg-white p-3 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detected Barcode</p>
                          <p className="mt-1 font-mono text-sm text-slate-900">{barcode}</p>
                        </div>
                        {barcodeFormatStr && (
                          <span className="text-xs px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-medium">{barcodeFormatStr}</span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">The format {barcodeFormatStr || 'Unknown'} may be a retail UPC and not an FDA NDC.</p>
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                    <p className="text-amber-800 text-sm font-medium">Searching multiple databases:</p>
                    <ul className="text-amber-700 text-xs space-y-1 list-disc pl-4">
                      <li>Checking OpenFoodFacts database...</li>
                      <li>Checking UPCItemDB for retail products...</li>
                      <li>Checking Barcode Spider database...</li>
                      <li>Trying multiple barcode format variations...</li>
                    </ul>
                    <p className="text-amber-700 text-xs mt-2">
                      If not found after extensive search, try scanning a different barcode on the package or use OCR scan instead.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleScanAnother}
                      className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                    >
                      Try Another Image
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {barcode && !loading && !medication && !error && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-blue-900 font-semibold mb-1">Barcode Detected</h4>
                  <p className="text-blue-700 font-mono text-sm bg-white px-3 py-2 rounded-lg border border-blue-200 mt-2">
                    {barcode}
                  </p>
                  <p className="text-blue-600 text-sm mt-2">Looking up medication information...</p>
                </div>
              </div>
            </div>
          )}

          {medication && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900">Medication Found!</h3>
                    <p className="text-sm text-emerald-700">Review the information below</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Barcode (NDC)
                  </label>
                  <p className="mt-1 text-slate-900 font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg">
                    {barcode}
                  </p>
                </div>

                {medication.brand_name && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Brand Name
                    </label>
                    <p className="mt-1 text-lg text-slate-900 font-semibold">
                      {medication.brand_name}
                    </p>
                  </div>
                )}
                
                {medication.generic_name && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Generic Name
                    </label>
                    <p className="mt-1 text-slate-900">
                      {medication.generic_name}
                    </p>
                  </div>
                )}
                
                {medication.dosage_form && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Dosage Form
                    </label>
                    <p className="mt-1 text-slate-900">
                      {medication.dosage_form}
                    </p>
                  </div>
                )}
                
                {medication.route && medication.route.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Route
                    </label>
                    <p className="mt-1 text-slate-900">
                      {medication.route[0]}
                    </p>
                  </div>
                )}
                
                {medication.active_ingredients && medication.active_ingredients.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                      Active Ingredients
                    </label>
                    <div className="space-y-2">
                      {medication.active_ingredients.map((ingredient, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 text-slate-900 bg-slate-50 px-3 py-2 rounded-lg"
                        >
                          <span className="text-emerald-600">•</span>
                          <span className="font-medium">{ingredient.name}</span>
                          <span className="text-slate-500">—</span>
                          <span className="text-slate-700">{ingredient.strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-amber-800">
                    <strong className="font-semibold">Note:</strong> This information is retrieved from the FDA database for reference. Please verify all details and complete dosage and frequency information.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleScanAnother}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-2 border-slate-300 hover:bg-slate-50 font-medium"
                >
                  Scan Another
                </Button>
                <Button
                  onClick={handleUseThisMedication}
                  className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Add This Medication
                </Button>
              </div>
            </div>
          )}

          {!image && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                Tips for Best Results
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Ensure the barcode is clearly visible and in focus</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Use good lighting to avoid shadows on the barcode</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Hold the camera steady and close enough to read the barcode</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Works with NDC (National Drug Code) barcodes on medication bottles</span>
                </li>
              </ul>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}