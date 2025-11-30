// OCR Service for Web using Tesseract.js
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use local worker file from public folder
// This avoids issues with dynamic imports and CDN loading
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

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

export interface PatientInfo {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  medicalRecordNumber?: string;
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
 * Convert PDF to images (one per page)
 * @param pdfFile - PDF file to convert
 * @param pageNumber - Specific page to convert (1-indexed), or undefined for ALL pages
 * @returns Array of image data URLs
 */
export async function convertPDFToImages(pdfFile: File, pageNumber?: number): Promise<string[]> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const totalPages = pdf.numPages;
  // If pageNumber specified, render that page; otherwise render ALL pages
  const pagesToRender = pageNumber ? [pageNumber] : Array.from({ length: totalPages }, (_, i) => i + 1);
  
  console.log(`📄 PDF has ${totalPages} pages, rendering ${pagesToRender.length} page(s)`);
  
  const images: string[] = [];
  
  for (const pageNum of pagesToRender) {
    if (pageNum > totalPages) {
      console.warn(`Page ${pageNum} exceeds total pages ${totalPages}`);
      continue;
    }
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }).promise;
    
    const imageDataURL = canvas.toDataURL('image/png');
    images.push(imageDataURL);
    
    console.log(`✅ Rendered PDF page ${pageNum} (${viewport.width}x${viewport.height})`);
  }
  
  return images;
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

function isCommonFalsePositive(text: string, currentMed: Partial<MedicationInfo>): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("cvshealth")) return true;
  if (lower.includes("pharmacy")) return true;
  if (/^tablets?,?\s*$/i.test(text)) return true; // "TABLETS," or "Tablets"

  // If it looks like a drug name (ends in common suffix), trust it even if it's in other fields
  // (Sometimes instructions repeat the drug name)
  const drugSuffixes = /(?:ine|ide|zol|pam|in|vir|mycin|cillin|statin|zil)$/i;
  if (drugSuffixes.test(text)) return false;

  if (currentMed.frequency && currentMed.frequency.toLowerCase().includes(lower)) return true;
  if (currentMed.route && currentMed.route.toLowerCase().includes(lower)) return true;
  if (currentMed.instructions && currentMed.instructions.toLowerCase().includes(lower)) return true;
  return false;
}


/**
 * Parse a SINGLE medication from text
 */
export function parseMedicationFromText(text: string): Partial<MedicationInfo> {
  // Normalize text for easier parsing: keep newlines but normalize spaces
  const normalizedText = text.replace(/\r\n/g, '\n');
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(Boolean);
  const medication: Partial<MedicationInfo> = {};

  if (OCR_DEBUG) {
    console.log('🔍 Parsing OCR text for single medication...');
  }

  // 1. Dosage
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

  // 2. Frequency - Improved for multi-word and multi-line
  const frequencyPatterns = [
    // Removed "take 1 tablet" as it's usually instructions
    /\b(once|twice|three times?|four times?|two times?)\s+(?:daily|per day|a day|in the morning|in the evening)/i,
    /\b(QD|BID|TID|QID|Q\d+H)\b/i,
    /(?:in the|every)\s+(morning|evening|afternoon|night)/i,
  ];

  // Check original text (with newlines) for frequency to catch split lines if needed, 
  // but usually frequency is on one line or standard phrases.
  // We replace newlines with spaces for regex search to handle "TWO TIMES \n A DAY"
  const textSingleLine = text.replace(/\n/g, ' ');

  for (const pattern of frequencyPatterns) {
    const match = textSingleLine.match(pattern);
    if (match) {
      medication.frequency = match[0].trim();
      break;
    }
  }

  // 3. Route - Improved for multi-line (e.g. "by \n mouth")
  const routePatterns = [
    /(by\s+(?:mouth|injection|inhalation))/i, // Capture "by mouth" fully
    /\b(oral|topical|injection|IV|IM|sublingual|transdermal|inhalation|ophthalmic|otic)\b/i,
  ];

  for (const pattern of routePatterns) {
    const match = textSingleLine.match(pattern);
    if (match) {
      // If we have a capture group 1, use it (for "by mouth"), otherwise use match[0]
      medication.route = match[1] || match[0].trim();
      break;
    }
  }

  // 4. Prescriber - Improved regex for all caps and middle initials
  const prescriberPatterns = [
    /(?:Dr\.|Doctor)\s+([A-Z]\.\s*)?([A-Z][a-z]+\s+[A-Z][a-z]+)/i, // Dr. John Doe
    /(?:Dr\.|Doctor)\s+([A-Z]\s+)?([A-Z]+)/i, // Dr. D INTERCOM (All caps)
    /([A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+)(?:\s*,?\s*MD|\s+MD)/i, // Patrick K Campbell, MD or Patrick K. Campbell MD
    /Prescriber:\s*([A-Za-z\s\.]+)/i,
  ];

  for (const pattern of prescriberPatterns) {
    // Create a global regex to find all matches
    const globalPattern = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));
    const matches = text.matchAll(globalPattern);

    for (const match of matches) {
      // Clean up the matched name
      let name = match[1] || match[0];

      // Check for false positives like "DR. AUTH REQUIRED"
      if (name.includes("AUTH REQUIRED") || name.includes("REFILLS") || name === "AUTH" || match[0].includes("DR. AUTH")) continue;

      // If we matched the full group including "Dr.", use it, otherwise construct it
      if (match[0].toLowerCase().startsWith("dr") || match[0].toLowerCase().startsWith("prescriber")) {
        medication.prescriber = match[0].replace(/Prescriber:\s*/i, '').trim();
      } else {
        medication.prescriber = match[0].trim();
      }
      // If we found a valid one, stop searching this pattern and other patterns? 
      // Usually we want the first VALID one.
      break;
    }
    if (medication.prescriber) break;
  }

  // 5. Quantity
  const quantityMatch = text.match(/(?:qty|quantity)\s*:?\s*(\d+)/i);
  if (quantityMatch) {
    medication.quantity = quantityMatch[1];
  } else {
    // Fallback: look for "30 Tablets" or similar standalone if not found
    const looseQtyMatch = text.match(/^(\d+)\s+(?:tablets|capsules|pills)/im);
    if (looseQtyMatch) {
      medication.quantity = looseQtyMatch[1];
    }
  }

  // 6. Refills
  const refillsMatch = text.match(/(?:refills?|no refills)\s*:?\s*(\d+|remaining)/i);
  if (refillsMatch) {
    medication.refills = refillsMatch[1];
  }

  // 7. Instructions - Improved to capture full sentences across lines
  // Look for "Take" or "Use" and capture until a period or end of block
  const instructionPattern = /(?:Take|Use)\s+(?:one|two|three|\d+)\s+(?:tablet|capsule|pill|application).+?(?:\.|$)/is;
  const instructionMatch = text.match(instructionPattern);

  if (instructionMatch) {
    // Clean up newlines in instructions
    medication.instructions = instructionMatch[0].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 8. Medication Name - Improved logic

  // Strategy A: Look for mixed case pattern (often brand names like amLODIPine)
  const mixedCasePattern = /\b([a-z]+[A-Z][A-Za-z]+)\b/;
  const mixedCaseMatch = text.match(mixedCasePattern);

  if (mixedCaseMatch && mixedCaseMatch[1]) {
    const candidateName = mixedCaseMatch[1].trim();
    // Validate it's not a common false positive
    if (!isCommonFalsePositive(candidateName, medication)) {
      medication.name = candidateName;
      if (OCR_DEBUG) console.log(`✅ Found medication name with mixed case pattern: "${medication.name}"`);
    }
  }

  // Strategy B: Look for name before dosage (e.g. "Ibuprofen 800 mg")
  if (!medication.name && dosageMatch && dosageMatch.index !== undefined) {
    // Let's try to find the line with the dosage
    const lines = text.split('\n');
    const dosageLineIndex = lines.findIndex(l => l.includes(dosageMatch![0]));

    if (dosageLineIndex !== -1) {
      const line = lines[dosageLineIndex];
      const dosageIndexInLine = line.indexOf(dosageMatch![0]);
      const potentialName = line.substring(0, dosageIndexInLine).trim();

      if (potentialName.length > 3 && !/take|use|qty/i.test(potentialName)) {
        if (OCR_DEBUG) console.log(`  Strategy B: Potential name on same line as dosage: "${potentialName}"`);
        if (!isCommonFalsePositive(potentialName, medication)) {
          medication.name = potentialName;
          if (OCR_DEBUG) console.log(`✅ Found medication name on same line as dosage: "${medication.name}"`);
        } else if (OCR_DEBUG) {
          console.log(`  Strategy B: Rejected "${potentialName}" as false positive.`);
        }
      } else if (dosageLineIndex > 0) {
        // Check previous line if current line starts with dosage
        const prevLine = lines[dosageLineIndex - 1].trim();
        if (OCR_DEBUG) console.log(`  Strategy B: Potential name on previous line: "${prevLine}"`);
        if (prevLine.length > 3 && !isCommonFalsePositive(prevLine, medication)) {
          medication.name = prevLine;
          if (OCR_DEBUG) console.log(`✅ Found medication name on previous line: "${medication.name}"`);
        } else if (OCR_DEBUG) {
          console.log(`  Strategy B: Rejected "${prevLine}" as false positive.`);
        }
      }
    }
  }

  // Strategy C: Fallback to heuristic line scanning
  if (!medication.name) {
    const excludePatterns = [
      /pharmacy/i, /hospital/i, /research/i, /children/i, /jude/i,
      /\d{3}[-\s]?\d{3}[-\s]?\d{4}/,
      /^\d+\s+[A-Z][a-z]+\s+(Place|Street|Road|Ave|Dr)/i,
      /Rx\s*[:#]?\s*\d+/i, /written/i, /filled/i, /test/i,
      /patient/i, /discard/i, /commonly\s+known/i,
      /no\s+refills/i, /^take\s+(?:\d+|one|two)/i, /^by\s+mouth/i,
      /MRN/i, /CVSHealth/i, /Health/i, /Non-Drowsy/i,
      /Questions\?/i, /TABLETS?,?\s*\d+/i
    ];

    // Prioritize lines that look like drug names (ending in common suffixes)
    const drugSuffixes = /(?:ine|ide|zol|pam|in|vir|mycin|cillin|statin|zil)$/i;

    let bestCandidate = null;
    let bestScore = 0;

    for (const line of lines) {
      if (line.length < 3 || line.length > 40) continue;
      if (excludePatterns.some(p => p.test(line))) continue;

      // Skip if it's just the dosage or frequency, BUT ONLY if it's almost the whole line
      // If the line is "IBUPROFEN 800 MG", we want to keep it.
      // If the line is "800 MG", we skip it.
      if (medication.dosage && line.includes(medication.dosage)) {
        const lineWithoutDosage = line.replace(medication.dosage, '').trim();
        if (lineWithoutDosage.length < 3) continue;
      }

      let score = 0;
      if (drugSuffixes.test(line)) score += 5;
      if (/^[A-Z\s]+$/.test(line)) score += 2; // All caps often drug name on label
      if (line.includes("TABLET") || line.includes("CAPSULE")) score += 1;

      // Penalties
      if (line.includes(" ")) score -= 1; // Single words are more likely generic names
      if (/^tablets?,?$/i.test(line)) score -= 10; // "TABLETS" alone is bad
      if (line.toLowerCase().startsWith("tablets")) score -= 5; // Starts with tablets

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = line;
      }
    }

    if (bestCandidate) {
      // Clean up "TABLET" etc from name
      // Use \b to ensure we don't match inside words, and handle start of string
      medication.name = bestCandidate.replace(/\b(?:TABLETS?|CAPSULES?|Pills)\b.*/i, '').replace(/,\s*$/, '').trim();
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

/**
 * Parse patient information from OCR text (prescription PDFs often have patient info)
 */
export function parsePatientInfoFromText(text: string): PatientInfo {
  const patientInfo: PatientInfo = {};
  
  // Clean up the text - normalize whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Name patterns - Enhanced to stop at labels like "Date of Birth", "DOB", etc.
  const namePatterns = [
    /Patient\s*Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+(?:Date|DOB|Phone|MRN|Address))/i,
    /Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+(?:Date|DOB|Phone|MRN|Address))/i,
    /For\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+(?:Date|DOB|Phone|MRN|Address))/i,
    // Fallback without lookahead
    /Patient\s*Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const fullName = match[1].trim();
      // Remove any trailing labels that might have been captured
      const cleanedName = fullName.replace(/\b(Date|DOB|Phone|MRN|Address|of|Birth).*$/i, '').trim();
      const parts = cleanedName.split(/\s+/).filter(p => p.length > 0);
      
      if (parts.length >= 2) {
        patientInfo.firstName = parts[0];
        patientInfo.lastName = parts.slice(1).join(' ');
        break;
      } else if (parts.length === 1) {
        // Single name - try next pattern
        continue;
      }
    }
  }
  
  // Date of Birth patterns - Enhanced with more formats
  const dobPatterns = [
    /DOB\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Date\s*of\s*Birth\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Birth\s*Date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /D\.?O\.?B\.?\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let dob = match[1].trim();
      // Normalize date format to MM/DD/YYYY
      const parts = dob.split(/[\/\-]/);
      if (parts.length === 3) {
        let [month, day, year] = parts;
        // Handle 2-digit years
        if (year.length === 2) {
          const yearNum = parseInt(year);
          year = yearNum > 30 ? `19${year}` : `20${year}`;
        }
        // Pad month and day
        month = month.padStart(2, '0');
        day = day.padStart(2, '0');
        dob = `${month}/${day}/${year}`;
      }
      patientInfo.dateOfBirth = dob;
      break;
    }
  }
  
  // Phone patterns - Enhanced to capture various formats and OCR errors
  const phonePatterns = [
    // Match: Phone: (480) 555-2398 or Phone: 480-555-2398
    /Phone\s*:?\s*([\(\{]?\d{3}[\)\}]?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/i,
    // Match: Tel: (480) 555-2398 (with { or ( for OCR errors)
    /Tel(?:ephone)?\s*:?\s*([\(\{]?\d{3}[\)\}]?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/i,
    // Match standalone: (480) 555-2398 or {480) 555-2398 (OCR error)
    /[\(\{](\d{3})[\)\}]\s*(\d{3})[\s\-](\d{4})/,
    // Match standalone: 480-555-2398 or 480.555.2398
    /\b(\d{3})[\s\-\.](\d{3})[\s\-\.](\d{4})\b/,
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      let phone: string;
      // If pattern has multiple capture groups (like the standalone patterns)
      if (match.length > 2 && match[2]) {
        phone = `(${match[1]}) ${match[2]}-${match[3]}`;
      } else if (match[1]) {
        // Clean up OCR errors: replace { with ( and } with )
        phone = match[1].trim().replace(/[\{\}]/g, (m) => m === '{' ? '(' : ')');
      } else {
        continue;
      }
      
      // Validate it's not an MRN or other ID
      const context = match.index !== undefined 
        ? text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20))
        : '';
      
      if (!/\b(?:MRN|ID|Record|Number)\b/i.test(context) || /\b(?:Phone|Tel)\b/i.test(context)) {
        patientInfo.phone = phone;
        break;
      }
    }
  }
  
  // Address patterns - More precise extraction from structured data
  // Look for address between specific markers, not everything
  const addressPatterns = [
    /Address\s*:?\s*([0-9]+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Terrace|Place|Way)[^,\n]*(?:,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})?)/i,
    /(?:Patient\s*)?Address\s*:?\s*([^\n]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Terrace)[^\n]*)/i,
    /\b(\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Terrace|Place)(?:,?\s+[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})?)\b/i,
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let address = match[1].trim();
      // Clean up the address - remove phone numbers and MRNs that might be included
      address = address.replace(/(?:Phone|MRN|Medical\s+Record).*$/i, '').trim();
      // Remove any trailing commas
      address = address.replace(/,\s*$/, '');
      patientInfo.address = address;
      break;
    }
  }
  
  // Medical Record Number / Patient ID - Enhanced
  const mrnPatterns = [
    /MRN\s*:?\s*([A-Z0-9]{5,15})/i,
    /Medical\s*Record\s*(?:Number|#|No\.?)\s*:?\s*([A-Z0-9]{5,15})/i,
    /Patient\s*ID\s*:?\s*([A-Z0-9]{5,15})/i,
    /\bMRN[:\s]+([0-9]{7,10})\b/i,
  ];
  
  for (const pattern of mrnPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const mrn = match[1].trim();
      // Validate it's not a phone number (no dashes/parens in MRN typically)
      if (!/[\(\)\-]/.test(mrn) || /^\d+$/.test(mrn.replace(/[\-\s]/g, ''))) {
        patientInfo.medicalRecordNumber = mrn;
        break;
      }
    }
  }
  
  if (OCR_DEBUG) {
    console.log('📋 Parsed patient info:', patientInfo);
  }
  
  return patientInfo;
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