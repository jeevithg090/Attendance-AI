// ═══════════════════════════════════════════════════════════
// AttendAI — Mark Attendance Page (Student)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { ScanFace, MapPin, CheckCircle, AlertTriangle, Loader2, Clock, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../api/client';

export default function MarkAttendance() {
  const { user } = useAuthStore();
  const {
    activeSessions,
    fetchActiveSessions,
    markAttendance,
    isLoading: sessionsLoading,
  } = useAttendanceStore();
  const [lastResult, setLastResult] = useState<{ subject: string; status: string } | null>(null);
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
        () => {
          setLocationError('Location access was denied or timed out.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
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

    if (!user?.faceEnrolled) {
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
    if (!faceRec.videoRef.current || !faceRec.canvasRef.current) return;

    try {
      setSubmitting(true);

      // Draw initial box
      await faceRec.drawDetection(faceRec.videoRef.current, faceRec.canvasRef.current);

      // Capture a live descriptor; the server matches it against the enrolled face.
      const faceDescriptor = await faceRec.captureDescriptor(faceRec.videoRef.current);
      if (!faceDescriptor) {
        throw new Error('No face detected. Move closer to the camera in good lighting and try again.');
      }

      const result = await markAttendance({
        sessionId: selectedSessionId,
        faceDescriptor,
        latitude: location?.lat,
        longitude: location?.lng,
        deviceInfo: navigator.userAgent,
      });

      const verified = result.status !== 'proxy_detected';
      await faceRec.drawDetection(faceRec.videoRef.current, faceRec.canvasRef.current, verified);
      setScanResult(verified ? 'success' : 'failed');

      if (result.flagged) {
        toast.error(`Attendance flagged: ${result.flagReason}`, { duration: 6000 });
      } else {
        toast.success(`Attendance marked as ${result.status}`);
      }
      if (verified) {
        const subject = activeSessions.find((s) => s.id === selectedSessionId)?.subjectName ?? 'your class';
        setLastResult({ subject, status: result.status });
      }

      // Stop webcam after short delay to show result
      setTimeout(() => {
        faceRec.stopWebcam();
        setIsScanning(false);
        setSubmitting(false);
      }, 2000);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to process scan'));
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
      <PageHeader
        icon={<ScanFace size={24} />}
        title="Mark Attendance"
        description="Pick your class, allow location access, then verify your face."
      />

      {!user?.faceEnrolled && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10"
        >
          <AlertTriangle className="text-amber-400 shrink-0" size={20} aria-hidden="true" />
          <p className="text-sm text-[var(--text-primary)] flex-1">
            Your face is not enrolled yet. Enrol it once from your profile before marking attendance.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-2 min-h-9 px-3 rounded-[var(--radius-md)] text-sm font-medium bg-[var(--accent-primary-solid)] hover:bg-[var(--accent-primary-solid-hover)] text-white"
          >
            <Camera size={16} aria-hidden="true" /> Enrol face
          </Link>
        </div>
      )}

      {lastResult && !isScanning && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10"
        >
          <CheckCircle className="text-emerald-400 shrink-0" size={20} aria-hidden="true" />
          <p className="text-sm text-[var(--text-primary)] flex-1">
            You were marked <strong>{lastResult.status}</strong> for {lastResult.subject}.
          </p>
          <Link
            to="/student/my-attendance"
            className="text-sm font-medium text-[var(--accent-primary)] hover:underline underline-offset-2"
          >
            View history
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Setup */}
        <div className="space-y-6">
          <Card>
            <h2 id="step-class" className="text-base font-semibold mb-4 border-b border-[var(--border)] pb-3">
              1. Select class
            </h2>

            {sessionsLoading && activeSessions.length === 0 ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading sessions">
                <div className="skeleton h-16" />
              </div>
            ) : activeSessions.length === 0 ? (
              <EmptyState
                icon={<Clock size={22} />}
                title="No open sessions"
                description="When your teacher starts a session for one of your subjects it shows up here."
                action={
                  <Button variant="secondary" size="sm" onClick={() => fetchActiveSessions()}>
                    Check again
                  </Button>
                }
                className="py-4 px-0"
              />
            ) : (
              <div className="space-y-3" role="group" aria-labelledby="step-class">
                {activeSessions.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    aria-pressed={selectedSessionId === session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedSessionId === session.id
                        ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-elevated)] border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="font-medium">{session.subjectName}</div>
                    <div className="flex flex-wrap justify-between gap-x-3 mt-1 text-xs">
                      <span>{session.subjectCode}</span>
                      <span>By {session.teacherName}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-4 border-b border-[var(--border)] pb-3">2. Location</h2>

            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 p-1.5 rounded-full ${location ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
              >
                {location ? (
                  <MapPin size={16} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={16} aria-hidden="true" />
                )}
              </div>
              <div aria-live="polite">
                <p className="text-sm font-medium">
                  {location
                    ? 'Location acquired'
                    : locationError
                      ? 'Location unavailable'
                      : 'Getting your location…'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {locationError ||
                    (location
                      ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`
                      : 'Allow location access when your browser asks.')}
                </p>
                {locationError && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">
                    You can still check in, but your entry will be flagged for your teacher to review.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Scanner */}
        <div>
          <Card className="h-full flex flex-col">
            <h2 className="text-base font-semibold mb-4 border-b border-[var(--border)] pb-3">
              3. Face scan
            </h2>

            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
              {!isScanning ? (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                    <ScanFace size={32} className="text-[var(--text-muted)]" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
                    Face the camera in good light. The scan starts automatically and takes a few seconds.
                  </p>

                  <Button
                    size="lg"
                    onClick={handleStartScan}
                    disabled={!selectedSessionId || activeSessions.length === 0 || !user?.faceEnrolled}
                    className="w-full"
                    icon={<Camera size={18} aria-hidden="true" />}
                  >
                    Start face scan
                  </Button>
                </div>
              ) : (
                <div className="w-full relative">
                  <div
                    className={`relative rounded-xl overflow-hidden aspect-[4/3] bg-black ${
                      scanResult === 'success'
                        ? 'border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : scanResult === 'failed'
                          ? 'border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                          : 'face-scan-ring'
                    }`}
                  >
                    <video
                      aria-label="Camera preview"
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
                      aria-hidden="true"
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
                          <CheckCircle className="text-emerald-400" size={48} aria-hidden="true" />
                        </div>
                      </div>
                    )}

                    {scanResult === 'failed' && (
                      <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center backdrop-blur-sm animate-fade-in">
                        <div className="bg-[var(--bg-surface)] rounded-full p-3 shadow-lg">
                          <AlertTriangle className="text-rose-400" size={48} aria-hidden="true" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="mt-4 flex items-center justify-center gap-2"
                    role="status"
                    aria-live="polite"
                  >
                    {submitting && scanResult === 'pending' ? (
                      <>
                        <Loader2
                          className="animate-spin text-[var(--accent-primary)]"
                          size={16}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium">Verifying identity…</span>
                      </>
                    ) : scanResult === 'success' ? (
                      <span className="text-sm font-medium text-emerald-400">
                        Identity verified successfully
                      </span>
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
