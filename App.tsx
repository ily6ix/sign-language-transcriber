
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppStatus } from './types';
import { transcribeGesture } from './services/geminiService';
import HandIcon from './components/HandIcon';

const TRANSCRIPTION_INTERVAL = 1500; // ms

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcription, setTranscription] = useState<string>('');
  const [lastRecognizedGesture, setLastRecognizedGesture] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingFrame = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopCamera();
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }
    isProcessingFrame.current = false;
  }, [stopCamera]);
  
  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const captureAndTranscribe = useCallback(async () => {
    if (isProcessingFrame.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    isProcessingFrame.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Set canvas dimensions to match video to avoid distortion
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const result = await transcribeGesture(base64Image);

      if (result && result !== lastRecognizedGesture) {
        setTranscription(prev => `${prev}${result} `);
        setLastRecognizedGesture(result);
      }
    }

    isProcessingFrame.current = false;
  }, [lastRecognizedGesture]);

  const startTranscription = useCallback(() => {
    setStatus(AppStatus.TRANSCRIBING);
    if(transcriptionIntervalRef.current) clearInterval(transcriptionIntervalRef.current);
    transcriptionIntervalRef.current = setInterval(captureAndTranscribe, TRANSCRIPTION_INTERVAL);
  }, [captureAndTranscribe]);
  
  const handleToggleCamera = useCallback(async () => {
    if (status === AppStatus.TRANSCRIBING) {
      cleanup();
      setStatus(AppStatus.IDLE);
      return;
    }

    setError(null);
    setStatus(AppStatus.STARTING_CAMERA);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startTranscription();
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      let errorMessage = "Could not access camera. Please check permissions.";
      if (err instanceof Error && err.name === 'NotAllowedError') {
          errorMessage = "Camera access was denied. Please allow camera access in your browser settings.";
      }
      setError(errorMessage);
      setStatus(AppStatus.ERROR);
      cleanup();
    }
  }, [status, cleanup, startTranscription]);

  const getButtonState = () => {
    switch (status) {
      case AppStatus.IDLE:
      case AppStatus.ERROR:
        return { text: 'Start Transcribing', color: 'bg-cyan-500 hover:bg-cyan-600', disabled: false };
      case AppStatus.STARTING_CAMERA:
        return { text: 'Starting Camera...', color: 'bg-gray-500', disabled: true };
      case AppStatus.TRANSCRIBING:
        return { text: 'Stop Transcribing', color: 'bg-red-500 hover:bg-red-600', disabled: false };
      default:
        return { text: 'Start', color: 'bg-cyan-500 hover:bg-cyan-600', disabled: false };
    }
  };
  
  const buttonState = getButtonState();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <header className="w-full max-w-5xl mx-auto flex items-center justify-center sm:justify-start gap-4 mb-6">
        <HandIcon className="w-10 h-10 text-cyan-400" />
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Sign Language Transcriber
        </h1>
      </header>

      <main className="flex-grow w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2 flex flex-col bg-gray-800/50 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden border border-gray-700">
          <div className="p-4 bg-gray-900/50 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-center">Camera Feed</h2>
          </div>
          <div className="relative aspect-video flex-grow flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
             {status !== AppStatus.TRANSCRIBING && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                <HandIcon className="w-16 h-16 text-gray-500 mb-4" />
                <p className="text-gray-400">
                  {status === AppStatus.IDLE && "Camera is off. Press 'Start' to begin."}
                  {status === AppStatus.STARTING_CAMERA && "Initializing camera..."}
                  {status === AppStatus.ERROR && "Camera not available."}
                </p>
              </div>
            )}
            {status === AppStatus.TRANSCRIBING && (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-600/80 text-white text-xs font-bold px-2 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                LIVE
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-1/2 flex flex-col bg-gray-800/50 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden border border-gray-700">
          <div className="p-4 bg-gray-900/50 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-center">Transcription</h2>
          </div>
          <div className="p-6 flex-grow relative">
            <p className="text-lg leading-relaxed whitespace-pre-wrap font-mono">
              {transcription}
              {isProcessingFrame.current && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1" />}
            </p>
            {transcription === '' && !isProcessingFrame.current && (
                <p className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Your transcribed text will appear here...
                </p>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-5xl mx-auto mt-6 flex flex-col items-center gap-4">
        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-center">
                <strong>Error:</strong> {error}
            </div>
        )}
        <button
          onClick={handleToggleCamera}
          disabled={buttonState.disabled}
          className={`px-8 py-4 w-full sm:w-auto text-xl font-bold text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 ${buttonState.color} ${buttonState.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {buttonState.text}
        </button>
      </footer>
      
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};

export default App;
