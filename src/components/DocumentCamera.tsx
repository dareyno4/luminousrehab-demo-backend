import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RotateCw, Download } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export default function DocumentCamera({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageDataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;

    // Convert data URL to File
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `document_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white text-lg font-semibold">Scan Document</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Camera/Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {error ? (
          <div className="text-center text-white">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">{error}</p>
            <Button onClick={startCamera} variant="outline" className="text-white border-white">
              Try Again
            </Button>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured document" 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="relative w-full h-full max-w-4xl max-h-[70vh]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain rounded-lg"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 border-white/50 rounded-lg" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-full">
                Position document within frame
              </div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50">
        {capturedImage ? (
          <div className="flex gap-3 justify-center max-w-md mx-auto">
            <Button
              onClick={retakePhoto}
              variant="outline"
              className="flex-1 text-white border-white hover:bg-white/20"
            >
              <RotateCw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            <Button
              onClick={confirmPhoto}
              className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white"
            >
              <Check className="w-5 h-5 mr-2" />
              Use Photo
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              onClick={capturePhoto}
              disabled={!!error}
              size="lg"
              className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 text-black p-0"
            >
              <Camera className="w-8 h-8" />
            </Button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="px-6 pb-4 text-center">
        <p className="text-white/70 text-sm">
          💡 Ensure good lighting and the document is flat and in focus
        </p>
      </div>
    </div>
  );
}
