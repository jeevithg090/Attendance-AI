// ═══════════════════════════════════════════════════════════
// AttendAI — Mark Attendance Page (Student)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ScanFace, MapPin, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MarkAttendance() {
  const { user } = useAuthStore();
  const { activeSessions, fetchActiveSessions, markAttendance } = useAttendanceStore();
  const navigate = useNavigate();
  const faceRec = useFaceRecognition();
  
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'pending' | 'success' | 'failed'>('pending');
  const [submitting, setSubmitting] = useState(false);

  // Initialize
  useEffect(() => {
    fetchActiveSessions();
    faceRec.loadModels();

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError(null);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setLocationError('Location access denied. This may flag your attendance.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }

    return () => {
      faceRec.stopWebcam();
    };
  }, []);

  // Set default session if only one exists
  useEffect(() => {
    if (activeSessions.length === 1 && !selectedSessionId) {
      setSelectedSessionId(activeSessions[0].id);
    }
  }, [activeSessions]);

  const handleStartScan = async () => {
    if (!selectedSessionId) {
      toast.error('Please select a session first');
      return;
    }
    
    if (!user?.faceEnrolled || !user.faceDescriptors?.length) {
      toast.error('Face data not enrolled. Please update your profile first.');
      navigate('/profile');
      return;
    }

    setIsScanning(true);
    setScanResult('pending');
    
    setTimeout(async () => {
      const started = await faceRec.startWebcam(faceRec.videoRef.current!);
      if (!started) {
        setIsScanning(false);
      }
    }, 100);
  };

  const processScan = async () => {
    if (!faceRec.videoRef.current || !faceRec.canvasRef.current || !user?.faceDescriptors) return;

    try {
      setSubmitting(true);
      
      // Draw initial box
      await faceRec.drawDetection(faceRec.videoRef.current, faceRec.canvasRef.current);
      
      // Verify face against stored descriptors
      const { matched, score, distance } = await faceRec.verifyFace(
        faceRec.videoRef.current,
        user.faceDescriptors
      );
      
      // Draw result box
      await faceRec.drawDetection(faceRec.videoRef.current, faceRec.canvasRef.current, matched);

      // We send the score to the backend to make the final decision based on thresholds
      const result = await markAttendance({
        sessionId: selectedSessionId,
        faceMatchScore: score,
        latitude: location?.lat,
        longitude: location?.lng,
        deviceInfo: navigator.userAgent,
      });

      setScanResult(result.status === 'proxy_detected' ? 'failed' : 'success');
      
      if (result.flagged) {
        toast.error(`Attendance flagged: ${result.flagReason}`, { duration: 6000 });
      } else {
        toast.success(`Attendance marked successfully as ${result.status}`);
      }

      // Stop webcam after short delay to show result
      setTimeout(() => {
        faceRec.stopWebcam();
        setIsScanning(false);
      }, 2000);

    } catch (error: any) {
      console.error('Scan error:', error);
      const serverMessage = error.response?.data?.error;
      toast.error(serverMessage || error.message || 'Failed to process scan');
      setScanResult('failed');
      setTimeout(() => {
        faceRec.stopWebcam();
        setIsScanning(false);
        setSubmitting(false);
      }, 2000);
    }
  };

  // Video play handler to process scan automatically
  const handleVideoPlay = () => {
    if (isScanning && scanResult === 'pending' && !submitting) {
      // Give camera time to adjust exposure, then scan
      setTimeout(processScan, 1500);
    }
  };

  if (faceRec.isLoading && !faceRec.isModelLoaded) {
    return <LoadingSpinner variant="face" message={faceRec.loadingProgress} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
          <ScanFace size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Verify your identity using face recognition.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column - Setup */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold mb-4 border-b border-[var(--border)] pb-2">1. Select Class</h2>
            
            {activeSessions.length === 0 ? (
              <div className="p-4 rounded-lg bg-[var(--bg-elevated)] text-center text-[var(--text-muted)] text-sm">
                No active sessions found for your enrolled subjects.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedSessionId === session.id
                        ? 'bg-indigo-500/10 border-indigo-500 text-[var(--text-primary)]'
                        : 'bg-[var(--bg-elevated)] border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="font-medium">{session.subjectName}</div>
                    <div className="flex justify-between mt-1 text-xs opacity-80">
                      <span>{session.subjectCode}</span>
                      <span>By {session.teacherName}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-4 border-b border-[var(--border)] pb-2">2. Geolocation</h2>
            
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-full ${location ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {location ? <MapPin size={16} /> : <AlertTriangle size={16} />}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {location ? 'Location acquired' : 'Location required'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {locationError || (location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'Requesting location access...')}
                </p>
                {locationError && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">
                    Note: Marking attendance without location will flag your entry as a potential proxy.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Scanner */}
        <div>
          <Card className="h-full flex flex-col">
            <h2 className="text-base font-semibold mb-4 border-b border-[var(--border)] pb-2">3. Face Scan</h2>
            
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
              
              {!isScanning ? (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                    <ScanFace size={32} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
                    Position your face clearly in the camera frame in a well-lit area.
                  </p>
                  
                  <Button 
                    size="lg" 
                    onClick={handleStartScan}
                    disabled={!selectedSessionId || activeSessions.length === 0}
                    className="w-full"
                  >
                    Start Face Scan
                  </Button>
                </div>
              ) : (
                <div className="w-full relative">
                  <div className={`relative rounded-xl overflow-hidden aspect-[4/3] bg-black ${
                    scanResult === 'success' ? 'border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                    scanResult === 'failed' ? 'border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' :
                    'face-scan-ring'
                  }`}>
                    <video
                      ref={faceRec.videoRef}
                      onPlay={handleVideoPlay}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <canvas
                      ref={faceRec.canvasRef}
                      className="absolute inset-0 w-full h-full transform scale-x-[-1]"
                    />
                    
                    {/* Scanning Animation Overlay */}
                    {scanResult === 'pending' && (
                      <div className="scan-overlay">
                        <div className="scan-line" />
                      </div>
                    )}
                    
                    {/* Result Overlays */}
                    {scanResult === 'success' && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm animate-fade-in">
                        <div className="bg-[var(--bg-surface)] rounded-full p-3 shadow-lg">
                          <CheckCircle className="text-emerald-500" size={48} />
                        </div>
                      </div>
                    )}
                    
                    {scanResult === 'failed' && (
                      <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center backdrop-blur-sm animate-fade-in">
                        <div className="bg-[var(--bg-surface)] rounded-full p-3 shadow-lg">
                          <AlertTriangle className="text-rose-500" size={48} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {submitting && scanResult === 'pending' ? (
                      <>
                        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={16} />
                        <span className="text-sm font-medium animate-pulse">Verifying identity...</span>
                      </>
                    ) : scanResult === 'success' ? (
                      <span className="text-sm font-medium text-emerald-400">Identity verified successfully</span>
                    ) : scanResult === 'failed' ? (
                      <span className="text-sm font-medium text-rose-400">Verification failed</span>
                    ) : (
                      <span className="text-sm text-[var(--text-muted)]">Align face and keep still</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
