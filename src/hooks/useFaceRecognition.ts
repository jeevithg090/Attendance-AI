// ═══════════════════════════════════════════════════════════
// AttendAI — Face Recognition Hook (face-api.js)
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';

interface FaceRecognitionState {
  isModelLoaded: boolean;
  isLoading: boolean;
  loadingProgress: string;
  error: string | null;
}

export function useFaceRecognition() {
  const [state, setState] = useState<FaceRecognitionState>({
    isModelLoaded: false,
    isLoading: false,
    loadingProgress: '',
    error: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Load Models ──────────────────────────────────────────
  const loadModels = useCallback(async () => {
    if (state.isModelLoaded) return;

    setState(s => ({ ...s, isLoading: true, loadingProgress: 'Loading face detection model...' }));

    try {
      const MODEL_URL = '/models';

      setState(s => ({ ...s, loadingProgress: 'Loading face detector...' }));
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      setState(s => ({ ...s, loadingProgress: 'Loading landmark model...' }));
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      setState(s => ({ ...s, loadingProgress: 'Loading recognition model...' }));
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      setState(s => ({
        ...s,
        isModelLoaded: true,
        isLoading: false,
        loadingProgress: 'Models loaded!',
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load face models:', error);
      setState(s => ({
        ...s,
        isLoading: false,
        error: 'Failed to load face recognition models. Please check your internet connection.',
      }));
    }
  }, [state.isModelLoaded]);

  // ── Start Webcam ─────────────────────────────────────────
  const startWebcam = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      videoElement.srcObject = stream;
      streamRef.current = stream;
      videoRef.current = videoElement;
      await videoElement.play();
      return true;
    } catch (error) {
      console.error('Webcam access error:', error);
      setState(s => ({ ...s, error: 'Camera access denied. Please allow camera permissions.' }));
      return false;
    }
  }, []);

  // ── Stop Webcam ──────────────────────────────────────────
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // ── Detect Face ──────────────────────────────────────────
  const detectFace = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!state.isModelLoaded) return null;

    const detection = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5,
      }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection;
  }, [state.isModelLoaded]);

  // ── Extract Descriptor ───────────────────────────────────
  const extractDescriptor = useCallback(async (videoElement: HTMLVideoElement): Promise<Float32Array | null> => {
    const detection = await detectFace(videoElement);
    if (!detection) return null;

    // Anti-spoofing: check face size (must be at least 20% of frame width)
    const faceWidth = detection.detection.box.width;
    const frameWidth = videoElement.videoWidth;
    if (faceWidth / frameWidth < 0.2) return null;

    return detection.descriptor;
  }, [detectFace]);

  // ── Capture Multiple Descriptors (for enrollment) ───────
  const captureEnrollmentDescriptors = useCallback(async (
    videoElement: HTMLVideoElement,
    count: number = 5,
    onProgress?: (captured: number) => void
  ): Promise<number[][]> => {
    const descriptors: number[][] = [];

    for (let i = 0; i < count; i++) {
      // Wait a moment between captures
      await new Promise(resolve => setTimeout(resolve, 800));

      const descriptor = await extractDescriptor(videoElement);
      if (descriptor) {
        descriptors.push(Array.from(descriptor));
        onProgress?.(descriptors.length);
      } else {
        i--; // Retry
      }
    }

    return descriptors;
  }, [extractDescriptor]);

  // ── Verify Face Against Stored Descriptors ──────────────
  const verifyFace = useCallback(async (
    videoElement: HTMLVideoElement,
    storedDescriptors: number[][],
    threshold: number = 0.5
  ): Promise<{ matched: boolean; score: number; distance: number }> => {
    const descriptor = await extractDescriptor(videoElement);
    if (!descriptor) {
      return { matched: false, score: 0, distance: 1 };
    }

    // Create labeled face descriptors
    const labeledDescriptors = new faceapi.LabeledFaceDescriptors(
      'student',
      storedDescriptors.map(d => new Float32Array(d))
    );

    const faceMatcher = new faceapi.FaceMatcher([labeledDescriptors], threshold);
    const match = faceMatcher.findBestMatch(descriptor);

    const distance = match.distance;
    const score = 1 - distance; // Convert distance to similarity score
    const matched = match.label !== 'unknown';

    return { matched, score, distance };
  }, [extractDescriptor]);

  // ── Draw Detection on Canvas ────────────────────────────
  const drawDetection = useCallback(async (
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    isMatched?: boolean
  ) => {
    const detection = await detectFace(videoElement);

    const displaySize = {
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
    };
    faceapi.matchDimensions(canvasElement, displaySize);

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (detection) {
      const resizedDetection = faceapi.resizeResults(detection, displaySize);
      const box = resizedDetection.detection.box;

      // Draw bounding box
      ctx.strokeStyle = isMatched === true ? '#10B981' : isMatched === false ? '#F43F5E' : '#4F46E5';
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw corner accents
      const cornerSize = 15;
      ctx.lineWidth = 4;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + cornerSize);
      ctx.lineTo(box.x, box.y);
      ctx.lineTo(box.x + cornerSize, box.y);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerSize, box.y);
      ctx.lineTo(box.x + box.width, box.y);
      ctx.lineTo(box.x + box.width, box.y + cornerSize);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.height - cornerSize);
      ctx.lineTo(box.x, box.y + box.height);
      ctx.lineTo(box.x + cornerSize, box.y + box.height);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
      ctx.stroke();

      return true;
    }
    return false;
  }, [detectFace]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    ...state,
    loadModels,
    startWebcam,
    stopWebcam,
    detectFace,
    extractDescriptor,
    captureEnrollmentDescriptors,
    verifyFace,
    drawDetection,
    videoRef,
    canvasRef,
  };
}
