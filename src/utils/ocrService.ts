// OCR Service for Web using Tesseract.js
import Tesseract from 'tesseract.js';

// Debug flag: set to true to enable verbose OCR logging. Disabled for performance.
const OCR_DEBUG = false;

export interface OCRResult {
  text: string;
  confidence: number;
  preprocessedImage?: string; // This is the B&W one for Tesseract
  previewImage?: string; // The full-color one for the UI
  previewImageWidth?: number;
  previewImageHeight?: number;
  isBlurry?: boolean;
  rotationCorrected?: boolean;
  preprocessingStrategy?: string;
  words?: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }>;
}

export interface MedicationInfo {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescriber: string;
  quantity: string;
  refills: string;
  instructions: string;
  confidence: number;
  image?: string; // base64 data URL of scanned image
}

/**
 * Detect if an image is blurry using Laplacian variance
 * @param imageData - Canvas image data
 * @returns Blur score (lower = more blurry, <100 is blurry)
 */
function detectBlur(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Convert to grayscale and apply Laplacian operator
  let laplacianSum = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const center = data[idx];
      
      // Simplified Laplacian kernel
      const top = data[((y - 1) * width + x) * 4];
      const bottom = data[((y + 1) * width + x) * 4];
      const left = data[(y * width + (x - 1)) * 4];
      const right = data[(y * width + (x + 1)) * 4];
      
      const laplacian = Math.abs(4 * center - top - bottom - left - right);
      laplacianSum += laplacian;
      count++;
    }
  }
  
  return (laplacianSum / count) * 10; // Scale for readability
}

/**
 * Detect text rotation angle using edge detection
 * @param ctx - Canvas context
 * @param width - Image width
 * @param height - Image height
 * @returns Rotation angle in degrees (0, 90, 180, 270)
 */
function detectRotation(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Sample horizontal and vertical edge density
  let horizontalEdges = 0;
  let verticalEdges = 0;
  
  // Sample every 10th pixel for speed
  for (let y = 10; y < height - 10; y += 10) {
    for (let x = 10; x < width - 10; x += 10) {
      const idx = (y * width + x) * 4;
      const current = data[idx];
      
      const right = data[(y * width + (x + 1)) * 4];
      const bottom = data[((y + 1) * width + x) * 4];
      
      horizontalEdges += Math.abs(current - right);
      verticalEdges += Math.abs(current - bottom);
    }
  }
  
  // If more vertical edges than horizontal, image might be rotated
  const ratio = verticalEdges / (horizontalEdges + 1);
  
  // Simple heuristic: if ratio > 1.2, likely rotated 90 or 270 degrees
  if (ratio > 1.2) {
    // Additional check: if text is typically in upper half, it's 270, else 90
    return 90; // Default to 90 degrees
  }
  
  return 0; // No rotation needed
}

/**
 * Apply intelligent preprocessing strategy
 * @param ctx - Canvas context
 * @param imageData - Image data
 * @param strategy - 'standard', 'high-contrast', 'denoise', or 'aggressive'
 */
function applyPreprocessingStrategy(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  strategy: string
): void {
  const data = imageData.data;
  
  // Convert to grayscale (all strategies)
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  
  switch (strategy) {
    case 'high-contrast':
      // Strong contrast for faded labels
      const contrastHigh = 2.0;
      const factorHigh = (259 * (contrastHigh + 255)) / (255 * (259 - contrastHigh));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factorHigh * (data[i] - 128) + 128));
        data[i + 1] = data[i];
        data[i + 2] = data[i];
      }
      // Aggressive threshold
      for (let i = 0; i < data.length; i += 4) {
        const value = data[i] > 140 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
      break;
      
    case 'denoise':
      // Gaussian-like blur then threshold (good for noisy images)
      const tempData = new Uint8ClampedArray(data);
      const width = imageData.width;
      for (let i = 4; i < data.length - 4; i += 4) {
        const avg = (
          tempData[i - 4] + tempData[i] + tempData[i + 4] +
          tempData[i - width * 4] + tempData[i + width * 4]
        ) / 5;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      // Moderate threshold
      for (let i = 0; i < data.length; i += 4) {
        const value = data[i] > 128 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
      break;
      
    case 'aggressive':
      // Maximum preprocessing for very poor images
      const contrastAgg = 2.5;
      const factorAgg = (259 * (contrastAgg + 255)) / (255 * (259 - contrastAgg));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factorAgg * (data[i] - 128) + 128));
        data[i + 1] = data[i];
        data[i + 2] = data[i];
      }
      // Sharp threshold
      for (let i = 0; i < data.length; i += 4) {
        const value = data[i] > 120 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
      break;
      
    default: // 'standard'
      // Moderate contrast
      const contrast = 1.5;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = data[i];
        data[i + 2] = data[i];
      }
      // Standard threshold
      for (let i = 0; i < data.length; i += 4) {
        const value = data[i] > 128 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Intelligent preprocessing: tries multiple strategies and picks the best result
 * @param imageSource - Base64 image string, File, or Blob
 * @returns Best preprocessed image as base64 string, with metadata
 */
async function preprocessImage(imageSource: File | Blob | string): Promise<{
  image: string;
  fullColorImage: string;
  width: number;
  height: number;
  isBlurry: boolean;
  rotationCorrected: boolean;
  strategy: string;
}> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      try {
        // Scale up small images for better recognition
        const maxDimension = Math.max(img.width, img.height);
        let scale = Math.min(2, 2000 / maxDimension);
        scale = Math.max(1, scale);
        
        const newWidth = Math.floor(img.width * scale);
        const newHeight = Math.floor(img.height * scale);
        
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw scaled image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // STEP 1: Detect rotation
        const rotationAngle = detectRotation(ctx, newWidth, newHeight);
        let rotationCorrected = false;

        if (rotationAngle !== 0) {
          rotationCorrected = true;
          const rotatedCanvas = document.createElement('canvas');
          const rotatedCtx = rotatedCanvas.getContext('2d');
          if (!rotatedCtx) {
            reject(new Error('Could not get rotated canvas context'));
            return;
          }

          if (rotationAngle === 90 || rotationAngle === 270) {
            rotatedCanvas.width = newHeight;
            rotatedCanvas.height = newWidth;
          } else {
            rotatedCanvas.width = newWidth;
            rotatedCanvas.height = newHeight;
          }

          rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
          rotatedCtx.rotate((rotationAngle * Math.PI) / 180);
          rotatedCtx.drawImage(canvas, -newWidth / 2, -newHeight / 2);

          // Copy back
          canvas.width = rotatedCanvas.width;
          canvas.height = rotatedCanvas.height;
          ctx.drawImage(rotatedCanvas, 0, 0);
        }
         
        // Store the final width/height *after* rotation
        const finalWidth = canvas.width;
        const finalHeight = canvas.height;

        const fullColorScaledImage = canvas.toDataURL('image/png');
        // STEP 2: Detect blur
        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
        const blurScore = detectBlur(imageData);
        const isBlurry = blurScore < 100;

        if (OCR_DEBUG) {
          console.log(`📊 Image analysis: Blur score=${blurScore.toFixed(1)}, Rotation=${rotationAngle}°`);
          if (isBlurry) {
            console.warn('⚠️ Image appears blurry - OCR accuracy may be reduced');
          }
        }

        // STEP 3: Try multiple preprocessing strategies intelligently
        const strategies = ['standard', 'high-contrast', 'denoise', 'aggressive'];
        const results: Array<{ strategy: string; image: string; testScore: number }> = [];

        for (const strategy of strategies) {
          const testCanvas = document.createElement('canvas');
          const testCtx = testCanvas.getContext('2d');
          if (!testCtx) continue;

          testCanvas.width = canvas.width;
          testCanvas.height = canvas.height;
          testCtx.drawImage(canvas, 0, 0);

          const testImageData = testCtx.getImageData(0, 0, canvas.width, canvas.height);
          applyPreprocessingStrategy(testCtx, testImageData, strategy);

          // Score this strategy: count strong edges (indicates good text separation)
          const scoredData = testCtx.getImageData(0, 0, canvas.width, canvas.height);
          let edgeCount = 0;
          const data = scoredData.data;

          for (let i = 4; i < data.length - 4; i += 16) {
            const diff = Math.abs(data[i] - data[i + 4]);
            if (diff > 200) edgeCount++;
          }

          const imageStr = testCanvas.toDataURL('image/png');
          results.push({ strategy, image: imageStr, testScore: edgeCount });

          if (OCR_DEBUG) {
            console.log(`  Strategy '${strategy}': Edge score=${edgeCount}`);
          }
        }

        // Pick the strategy with the most clear edges
        results.sort((a, b) => b.testScore - a.testScore);
        const bestResult = results[0];

        if (OCR_DEBUG) {
          console.log(`✅ Selected best strategy: '${bestResult.strategy}'`);
        }

        resolve({
          image: bestResult.image,
          fullColorImage: fullColorScaledImage,
          width: finalWidth,
          height: finalHeight,
          isBlurry,
          rotationCorrected,
          strategy: bestResult.strategy
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    // Load the image
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Run OCR on an image file or blob with intelligent preprocessing
 * @param imageSource - File, Blob, or base64 string
 * @returns Extracted text, confidence, and image analysis metadata
 */
export async function runOCR(imageSource: File | Blob | string): Promise<OCRResult> {
  const worker: Tesseract.Worker = await Tesseract.createWorker('eng');

  if (OCR_DEBUG) {
    await worker.setParameters({
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          if (pct % 25 === 0) {
            console.log(`OCR Progress: ${pct}%`);
          }
        }
      }
    });
  }

  try {
    const preprocessed = await preprocessImage(imageSource);

    if (OCR_DEBUG) {
      console.log(`🔍 Starting OCR with ${preprocessed.strategy} strategy...`);
      if (preprocessed.rotationCorrected) {
        console.log('🔄 Image was rotated for better recognition');
      }
    }

    const result = await worker.recognize(preprocessed.image);
    const data: any = result.data;
    
    let words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }> = [];
    
    if (data.lines && Array.isArray(data.lines)) {
      data.lines.forEach((line: any) => {
        if (line.words && Array.isArray(line.words)) {
          line.words.forEach((word: any) => {
            if (word.text && word.bbox) {
              words.push({
                text: word.text,
                bbox: word.bbox,
                confidence: word.confidence || 0
              });
            }
          });
        }
      });
    }

    await worker.terminate();

    return {
      text: data.text,
      confidence: data.confidence,
      preprocessedImage: preprocessed.image, 
      previewImage: preprocessed.fullColorImage,
      previewImageWidth: preprocessed.width,
      previewImageHeight: preprocessed.height,
      isBlurry: preprocessed.isBlurry,
      rotationCorrected: preprocessed.rotationCorrected,
      preprocessingStrategy: preprocessed.strategy,
      words: words
    };
  } catch (error) {
    console.error('OCR failed:', error);
    await worker.terminate();
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Parse a SINGLE medication from text
 */
export function parseMedicationFromText(text: string): Partial<MedicationInfo> {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const medication: Partial<MedicationInfo> = {};

  if (OCR_DEBUG) {
    console.log('🔍 Parsing OCR text for single medication...');
  }

  const dosagePatterns = [
    /\((\d+(?:\.\d+)?)\s*(?:mg|mcg|g|ml|units?)\)/i,
    /(\d+(?:\.\d+)?)\s*(?:mg|mcg|g|ml|units?)\b/i,
  ];
  
  let dosageMatch = null;
  for (const pattern of dosagePatterns) {
    const match = text.match(pattern);
    if (match) {
      dosageMatch = match;
      const number = match[1] || match[0].match(/\d+(?:\.\d+)?/)?.[0];
      const unit = match[0].match(/mg|mcg|g|ml|units?/i)?.[0];
      medication.dosage = `${number} ${unit}`;
      break;
    }
  }

  const frequencyPatterns = [
    /take\s+\d+\s+tablet/i,
    /\b(once|twice|three times?)\s+(?:daily|per day|a day|in the morning|in the evening)/i,
    /\b(QD|BID|TID|QID|Q\d+H)\b/i,
    /(?:in the|every)\s+(morning|evening|afternoon|night)/i,
  ];
  
  for (const pattern of frequencyPatterns) {
    const match = text.match(pattern);
    if (match) {
      medication.frequency = match[0].trim();
      break;
    }
  }

  const routePatterns = [
    /by\s+(mouth|injection|inhalation)/i,
    /\b(oral|topical|injection|IV|IM|sublingual|transdermal|inhalation|ophthalmic|otic)\b/i,
  ];
  
  for (const pattern of routePatterns) {
    const match = text.match(pattern);
    if (match) {
      medication.route = match[1] || match[0].trim();
      break;
    }
  }

  const prescriberPatterns = [
    /(?:Dr\.|Doctor)\s+([A-Z]\.\s*)?([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /([A-Z][a-z]+\s+[A-Z]\s+[A-Z][a-z]+)\s+(?:MD|RPh|NU|par F)/i,
  ];
  
  for (const pattern of prescriberPatterns) {
    const match = text.match(pattern);
    if (match) {
      medication.prescriber = match[0].trim();
      break;
    }
  }

  const quantityMatch = text.match(/(?:qty|quantity)\s*:?\s*(\d+)/i);
  if (quantityMatch) {
    medication.quantity = quantityMatch[1];
  }

  const refillsMatch = text.match(/(?:refills?|no refills)\s*:?\s*(\d+|remaining)/i);
  if (refillsMatch) {
    medication.refills = refillsMatch[1];
  }

  const instructionMatch = text.match(/take\s+\d+\s+tablet[^.]*\./i);
  if (instructionMatch) {
    medication.instructions = instructionMatch[0].trim();
  }

  const mixedCasePattern = /\b([a-z]+[A-Z][A-Za-z]+)\b/;
  const mixedCaseMatch = text.match(mixedCasePattern);
  
  if (mixedCaseMatch && mixedCaseMatch[1]) {
    const candidateName = mixedCaseMatch[1].trim();
    const candidateLower = candidateName.toLowerCase();
    
    const isUsedInFrequency = medication.frequency && medication.frequency.toLowerCase().includes(candidateLower);
    const isUsedInRoute = medication.route && medication.route.toLowerCase().includes(candidateLower);
    const isUsedInInstructions = medication.instructions && medication.instructions.toLowerCase().includes(candidateLower);
    const isUsedInQuantity = medication.quantity && candidateLower.includes(medication.quantity.toLowerCase());
    
    if (!isUsedInFrequency && !isUsedInRoute && !isUsedInInstructions && !isUsedInQuantity) {
      medication.name = candidateName;
      
      if (OCR_DEBUG) {
        console.log(`✅ Found medication name with mixed case pattern: "${medication.name}"`);
      }
    }
  }
  
  if (!medication.name && dosageMatch && dosageMatch.index !== undefined) {
    const textBeforeDosage = text.substring(0, dosageMatch.index).trim();
    const namePattern = /([A-Z][A-Za-z]+(?:\s+[A-Z]?[A-Za-z]+){0,2})\s*$/i;
    const nameMatch = textBeforeDosage.match(namePattern);
    
    if (nameMatch && nameMatch[1]) {
      const candidateName = nameMatch[1].trim();
      const candidateLower = candidateName.toLowerCase();
      
      const isUsedInFrequency = medication.frequency && medication.frequency.toLowerCase().includes(candidateLower);
      const isUsedInRoute = medication.route && medication.route.toLowerCase().includes(candidateLower);
      const isUsedInInstructions = medication.instructions && medication.instructions.toLowerCase().includes(candidateLower);
      const isUsedInQuantity = medication.quantity && candidateLower.includes(medication.quantity.toLowerCase());
      
      if (!isUsedInFrequency && !isUsedInRoute && !isUsedInInstructions && !isUsedInQuantity) {
        medication.name = candidateName;
        
        if (OCR_DEBUG) {
          console.log(`✅ Found medication name before dosage: "${medication.name}"`);
        }
      }
    }
  }
  
  if (!medication.name) {
    const excludePatterns = [
      /pharmacy/i, /hospital/i, /research/i, /children/i, /jude/i,
      /\d{3}[-\s]?\d{3}[-\s]?\d{4}/,
      /^\d+\s+[A-Z][a-z]+\s+(Place|Street|Road|Ave|Dr)/i,
      /Rx\s*[:#]?\s*\d+/i, /written/i, /filled/i, /test/i,
      /patient/i, /discard/i, /commonly\s+known/i,
      /no\s+refills/i, /^take\s+\d+/i, /^by\s+mouth/i,
      /MRN/i, /mersin/i, /TET/i,
    ];
    
    const drugNameLine = lines.find(line => {
      if (!/[A-Za-z]{3,}/.test(line)) return false;
      if (line.length < 3 || line.length > 40) return false;
      
      for (const pattern of excludePatterns) {
        if (pattern.test(line)) return false;
      }
      
      const letterRatio = (line.match(/[A-Za-z]/g) || []).length / line.length;
      return letterRatio > 0.6;
    });

    if (drugNameLine) {
      medication.name = drugNameLine.replace(/^\W+|\W+$/g, '').trim();
    }
  }

  if (!medication.name) {
    const commonlyKnownMatch = text.match(/commonly\s+known\s+as\s+([A-Za-z]+)/i);
    if (commonlyKnownMatch) {
      medication.name = commonlyKnownMatch[1];
    }
  }

  if (OCR_DEBUG) {
    console.log('✅ Parsed medication:', medication);
  }

  return medication;
}

/**
 * Parse multiple medications from text
 */
export function parseMultipleMedications(text: string): Partial<MedicationInfo>[] {
  const hasMultipleRxNumbers = (text.match(/Rx\s*[:#]?\s*\d{5,}/gi) || []).length > 1;
  const hasBulletPoints = /^[\*•]\s/m.test(text);
  const hasNumberedList = /^\d+\.\s+[A-Z]/m.test(text);
  
  if (!hasMultipleRxNumbers && !hasBulletPoints && !hasNumberedList) {
    if (OCR_DEBUG) {
      console.log('📋 Detected SINGLE medication label - parsing as ONE entry');
    }
    const singleMed = parseMedicationFromText(text);
    
    if (singleMed.name || singleMed.dosage || singleMed.frequency) {
      return [singleMed];
    }
    return [];
  }
  
  if (OCR_DEBUG) {
    console.log('📋 Detected MULTIPLE medications - parsing as list');
  }
  
  const medications: Partial<MedicationInfo>[] = [];
  const sections = text.split(/(?:\n\s*\n\s*\n|\d+\.\s+[A-Z])/);
  
  sections.forEach(section => {
    const trimmed = section.trim();
    if (trimmed.length > 20) {
      const med = parseMedicationFromText(trimmed);
      if (med.name && (med.dosage || med.frequency || med.route)) {
        medications.push(med);
      }
    }
  });

  if (medications.length > 0) {
    return medications;
  }
  
  if (OCR_DEBUG) {
    console.log('📋 No multiple medications found, treating as single');
  }
  return [parseMedicationFromText(text)];
}

/**
 * Get confidence score for parsed medication
 */
export function getMedicationConfidence(med: Partial<MedicationInfo>): number {
  let score = 0;
  let total = 0;

  if (med.name) { score += 30; total += 30; }
  if (med.dosage) { score += 25; total += 25; }
  if (med.frequency) { score += 20; total += 20; }
  if (med.route) { score += 10; total += 10; }
  if (med.quantity) { score += 10; total += 10; }
  if (med.instructions) { score += 5; total += 5; }

  return total > 0 ? Math.round((score / total) * 100) : 0;
}

// ============================================================================
// BARCODE SCANNING & FDA API
// ============================================================================

export interface FDAMedicationData {
  brand_name?: string;
  generic_name?: string;
  dosage_form?: string;
  route?: string[];
  active_ingredients?: Array<{
    name: string;
    strength: string;
  }>;
  product_ndc?: string;
}

export interface UPCProductData {
  title?: string;
  brand?: string;
  categories?: string[];
  imageUrl?: string;
  upc?: string;
}

/**
 * Convert barcode to possible NDC formats
 */
export function convertToNDCFormat(code: string): string[] {
  const digits = code.replace(/\D/g, '');
  const formats: string[] = [];
  
  if (code.includes('-')) {
    const segments = code.split('-');
    if (segments.length >= 2) {
      formats.push(`${segments[0]}-${segments[1]}`);
    }
    if (segments.length >= 3) {
      formats.push(code);
    }
  }
  
  if (digits.length === 11) {
    formats.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 10)}`);
    formats.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}`);
    formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 8)}-${digits.slice(8, 10)}`);
    formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 8)}`);
    formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9, 10)}`);
    formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
  }
  
  if (digits.length === 10) {
    const padded = '0' + digits;
    formats.push(`${padded.slice(0, 4)}-${padded.slice(4, 8)}-${padded.slice(8, 10)}`);
    formats.push(`${padded.slice(0, 5)}-${padded.slice(5, 8)}-${padded.slice(8, 10)}`);
  }
  
  if (digits.length === 8) {
    formats.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}`);
  }
  if (digits.length === 9) {
    formats.push(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
  }
  
  const noLeadingZeros = digits.replace(/^0+/, '');
  if (noLeadingZeros.length === 8) {
    formats.push(`${noLeadingZeros.slice(0, 4)}-${noLeadingZeros.slice(4, 8)}`);
    formats.push(`${noLeadingZeros.slice(0, 5)}-${noLeadingZeros.slice(5, 8)}`);
  }
  
  return [...new Set(formats)];
}

/**
 * Lookup medication information from FDA API using NDC code
 */
export async function lookupMedicationByNDC(code: string): Promise<FDAMedicationData | null> {
  const possibleFormats = convertToNDCFormat(code);
  
  console.log('🔍 Searching for barcode:', code);
  console.log('📋 Trying NDC formats:', possibleFormats);
  
  for (const format of possibleFormats) {
    try {
      console.log(`🔎 Attempting format: ${format}`);
      const response = await fetch(
        `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${format}"&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          console.log('✅ Found medication with format:', format);
          return data.results[0] as FDAMedicationData;
        }
      }
    } catch (err) {
      console.log(`❌ Format ${format} failed:`, err);
      continue;
    }
  }
  
  console.log('❌ No medication found for any format');
  return null;
}

/**
 * Lookup product information using a retail UPC
 */
export async function lookupProductByUPC(upc: string): Promise<UPCProductData | null> {
  const digits = upc.replace(/\D/g, '');
  if (digits.length < 8) {
    console.log('❌ UPC too short:', digits);
    return null;
  }

  const upcVariants = [
    digits,
    digits.slice(1),
    digits.padStart(13, '0'),
    digits.padStart(14, '0'),
  ];

  console.log('🔍 Trying UPC lookup with variants:', upcVariants);

  for (const variant of upcVariants) {
    try {
      const offUrl = `https://world.openfoodfacts.org/api/v2/product/${variant}.json`;
      console.log('📡 Trying OpenFoodFacts:', offUrl);
      const res = await fetch(offUrl);
      console.log('📊 OpenFoodFacts response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('📦 OpenFoodFacts data:', data);
        
        if (data && data.product && data.status === 1) {
          const p = data.product;
          console.log('✅ Product found in OpenFoodFacts:', p.product_name);
          return {
            upc: variant,
            title: p.product_name || p.generic_name || undefined,
            brand: (p.brands || '').split(',')[0]?.trim() || undefined,
            categories: (p.categories_tags || []).map((c: string) => c.replace('en:', '')),
            imageUrl: p.image_front_small_url || p.image_small_url || undefined,
          } as UPCProductData;
        }
      }
    } catch (e) {
      console.warn('❌ OpenFoodFacts lookup failed for variant:', variant, e);
    }
  }

  for (const variant of upcVariants) {
    try {
      const upcItemDbUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${variant}`;
      console.log('📡 Trying UPCItemDB:', upcItemDbUrl);
      const res = await fetch(upcItemDbUrl);
      console.log('📊 UPCItemDB response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('📦 UPCItemDB data:', data);
        
        if (data && data.items && data.items.length > 0) {
          const item = data.items[0];
          console.log('✅ Product found in UPCItemDB:', item.title);
          return {
            upc: variant,
            title: item.title || item.description,
            brand: item.brand,
            categories: item.category ? [item.category] : [],
            imageUrl: item.images?.[0],
          } as UPCProductData;
        }
      }
    } catch (e) {
      console.warn('❌ UPCItemDB lookup failed for variant:', variant, e);
    }
  }

  console.log('❌ No product found in any UPC database');
  return null;
}

/**
 * Convert FDA medication data to app's MedicationInfo format
 */
export function convertFDAToMedicationInfo(fdaData: FDAMedicationData): Partial<MedicationInfo> {
  const medication: Partial<MedicationInfo> = {
    name: fdaData.brand_name || fdaData.generic_name || 'Unknown Medication',
    dosage: fdaData.active_ingredients?.[0]?.strength || '',
    route: fdaData.route?.[0] || 'Oral',
    frequency: 'Once daily',
    prescriber: '',
    quantity: '',
    refills: '',
    instructions: `${fdaData.dosage_form || 'Medication'}`,
    confidence: 75,
  };

  return medication;
}