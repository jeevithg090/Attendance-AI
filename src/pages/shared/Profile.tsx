// ═══════════════════════════════════════════════════════════
// AttendAI — Profile Page (Shared)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { User, Phone, Mail, Building, Hash, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../api/client';

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const faceRec = useFaceRecognition();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [enrollmentStatus, setEnrollmentStatus] = useState<
    'idle' | 'capturing' | 'processing' | 'success' | 'error'
  >('idle');

  useEffect(() => {
    return () => {
      faceRec.stopWebcam();
    };
  }, []);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEnrollment = async () => {
    setIsEnrollingFace(true);
    setEnrollmentStatus('idle');
    setEnrollmentProgress(0);
    await faceRec.loadModels();

    setTimeout(async () => {
      const started = await faceRec.startWebcam(faceRec.videoRef.current!);
      if (!started) {
        setIsEnrollingFace(false);
        toast.error('Could not access camera');
      }
    }, 500);
  };

  const handleCaptureFaces = async () => {
    if (!faceRec.videoRef.current) return;

    setEnrollmentStatus('capturing');
    try {
      const descriptors = await faceRec.captureEnrollmentDescriptors(faceRec.videoRef.current, 5, (count) =>
        setEnrollmentProgress(count),
      );

      if (descriptors.length === 5) {
        setEnrollmentStatus('processing');

        // Save to backend
        await api.post(`/users/${user.id}/face-descriptors`, { descriptors });

        // Update local user state
        await useAuthStore.getState().loadUser();

        setEnrollmentStatus('success');
        toast.success('Face data enrolled successfully!');

        setTimeout(() => {
          setIsEnrollingFace(false);
          faceRec.stopWebcam();
        }, 2000);
      } else {
        throw new Error('Could not capture enough valid face samples');
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      setEnrollmentStatus('error');
      toast.error(getErrorMessage(error, 'Face enrollment failed. Please try again.'));
      setTimeout(() => {
        setEnrollmentStatus('idle');
        setEnrollmentProgress(0);
      }, 3000);
    }
  };

  const handleCancelEnrollment = () => {
    setIsEnrollingFace(false);
    faceRec.stopWebcam();
    setEnrollmentStatus('idle');
    setEnrollmentProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        icon={<User size={24} />}
        title="My Profile"
        description="Your account details and face enrolment."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">Personal Information</h2>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Details
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveProfile} isLoading={isSaving}>
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={isEditing ? 'profile-full-name' : undefined}
                    className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1"
                  >
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      id="profile-full-name"
                      type="text"
                      className="input"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-light)]">
                      <User size={16} className="text-[var(--text-muted)]" />
                      {user.displayName}
                    </div>
                  )}
                </div>

                <div>
                  <p className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Email Address
                  </p>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-light)] opacity-70 cursor-not-allowed">
                    <Mail size={16} className="text-[var(--text-muted)]" />
                    {user.email}
                  </div>
                </div>

                <div>
                  <p className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {user.role === 'student'
                      ? 'Enrollment ID'
                      : user.role === 'teacher'
                        ? 'Employee ID'
                        : 'Admin ID'}
                  </p>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-light)] opacity-70 cursor-not-allowed">
                    <Hash size={16} className="text-[var(--text-muted)]" />
                    {user.enrollmentId || user.employeeId || 'N/A'}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={isEditing ? 'profile-phone-number' : undefined}
                    className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1"
                  >
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      id="profile-phone-number"
                      type="tel"
                      className="input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91..."
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-light)]">
                      <Phone size={16} className="text-[var(--text-muted)]" />
                      {user.phone || <span className="text-[var(--text-muted)] italic">Not provided</span>}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <p className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Department
                  </p>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-light)] opacity-70 cursor-not-allowed">
                    <Building size={16} className="text-[var(--text-muted)]" />
                    {user.department || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Security / Face Data */}
        <div className="space-y-6">
          <Card className="text-center flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-[var(--bg-elevated)]">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-lg font-bold">{user.displayName}</h3>
            <p className="text-sm text-[var(--text-muted)] capitalize">{user.role}</p>
            <div className="mt-4 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium border border-emerald-500/20">
              Active Account
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-4 border-b border-[var(--border)] pb-3">
              Biometric data
            </h2>

            {!isEnrollingFace ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${user.faceEnrolled ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {user.faceEnrolled ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div>
                    <h3 className="font-medium">Face recognition</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 mb-3">
                      {user.faceEnrolled
                        ? 'Your face data is registered and active for attendance verification.'
                        : 'Face data not enrolled. Required for marking attendance.'}
                    </p>

                    <Button
                      variant={user.faceEnrolled ? 'outline' : 'primary'}
                      size="sm"
                      icon={<Camera size={16} />}
                      onClick={handleStartEnrollment}
                    >
                      {user.faceEnrolled ? 'Re-enroll Face Data' : 'Enroll Face Data Now'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                  {faceRec.isLoading ? (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-white/80"
                      role="status"
                    >
                      <span className="animate-pulse text-sm">Initializing camera...</span>
                    </div>
                  ) : (
                    <>
                      <video
                        aria-label="Camera preview"
                        ref={faceRec.videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />

                      {enrollmentStatus === 'capturing' && (
                        <div className="absolute inset-0 border-4 border-indigo-500/50 flex flex-col items-center justify-end p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-white font-medium mb-2">Look straight at the camera</p>
                          <div
                            className="w-full h-2 bg-white/20 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={enrollmentProgress}
                            aria-valuemin={0}
                            aria-valuemax={5}
                            aria-label="Face captures"
                          >
                            <div
                              className="h-full bg-indigo-500 transition-all duration-300"
                              style={{ width: `${(enrollmentProgress / 5) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-white/80 mt-2" aria-live="polite">
                            {enrollmentProgress} of 5 captures
                          </p>
                        </div>
                      )}

                      {enrollmentStatus === 'processing' && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                            <p className="text-white text-sm">Processing face data...</p>
                          </div>
                        </div>
                      )}

                      {enrollmentStatus === 'success' && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
                          <CheckCircle2
                            className="text-white drop-shadow"
                            size={48}
                            aria-label="Face data saved"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {enrollmentStatus === 'idle' && !faceRec.isLoading && (
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={handleCancelEnrollment}>
                      Cancel
                    </Button>
                    <Button variant="primary" className="flex-1" onClick={handleCaptureFaces}>
                      Start Capture
                    </Button>
                  </div>
                )}

                {enrollmentStatus === 'error' && (
                  <Button
                    variant="outline"
                    className="w-full border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                    onClick={handleCancelEnrollment}
                  >
                    Try Again
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
