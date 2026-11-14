// ═══════════════════════════════════════════════════════════
// AttendAI — System Settings (Admin)
// ═══════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import { Settings, Save, MapPin, Shield, Clock } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import toast from 'react-hot-toast';
import { validateSettings, type SettingsErrors } from '../../lib/settingsValidation';
import type { SystemSettings as SystemSettingsType } from '../../types';

type NumericKey = keyof SettingsErrors;

interface NumberFieldProps {
  name: NumericKey;
  label: string;
  hint?: string;
  value: number;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  step?: string;
  min?: number;
  max?: number;
  className?: string;
}

function NumberField({ name, label, hint, value, error, className = '', ...input }: NumberFieldProps) {
  const id = `settings-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        className="input"
        value={Number.isFinite(value) ? value : ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[var(--border)]">
      <span className="text-[var(--accent-primary)]" aria-hidden="true">
        {icon}
      </span>
      <h2 className="text-lg font-semibold">{children}</h2>
    </div>
  );
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get('/settings');
      setSettings(data.data);
      setIsDirty(false);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Failed to load settings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const validation = validateSettings(settings);
    setErrors(validation);
    const firstInvalid = Object.keys(validation)[0];
    if (firstInvalid) {
      document.getElementById(`settings-${firstInvalid}`)?.focus();
      toast.error('Please fix the highlighted fields');
      return;
    }

    setIsSaving(true);
    try {
      const { id: _id, ...payload } = settings;
      const { data } = await api.put('/settings', payload);
      setSettings(data.data);
      setIsDirty(false);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update settings'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            [name]:
              type === 'checkbox'
                ? checked
                : type === 'number'
                  ? value === ''
                    ? NaN
                    : Number(value)
                  : value,
          }
        : prev,
    );
  };

  const header = (
    <PageHeader
      icon={<Settings size={24} />}
      title="System Settings"
      description="Campus-wide rules for face verification, geofencing and sessions."
    />
  );

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {header}
        <ErrorState message={loadError} onRetry={fetchSettings} />
      </div>
    );
  }

  if (isLoading || !settings) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {header}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Geofencing */}
        <Card>
          <SectionTitle icon={<MapPin size={20} />}>Campus geofencing</SectionTitle>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 p-4 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] border border-[var(--border-light)]">
              <div>
                <p id="geofence-label" className="font-medium">
                  Enable geofencing validation
                </p>
                <p id="geofence-desc" className="text-sm text-[var(--text-muted)]">
                  Students must be within the campus radius to mark attendance.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  role="switch"
                  name="geofencingEnabled"
                  checked={settings.geofencingEnabled}
                  onChange={handleChange}
                  aria-labelledby="geofence-label"
                  aria-describedby="geofence-desc"
                  className="sr-only peer"
                />
                <span
                  aria-hidden="true"
                  className="w-11 h-6 bg-[var(--border-light)] rounded-full transition-colors peer-checked:bg-[var(--accent-success-solid)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-surface)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-transform peer-checked:after:translate-x-5"
                />
              </label>
            </div>

            <fieldset
              disabled={!settings.geofencingEnabled}
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${
                settings.geofencingEnabled ? '' : 'opacity-60'
              }`}
            >
              <legend className="sr-only">Campus location</legend>
              <NumberField
                name="campusLat"
                label="Campus latitude"
                step="any"
                value={settings.campusLat}
                error={errors.campusLat}
                onChange={handleChange}
              />
              <NumberField
                name="campusLng"
                label="Campus longitude"
                step="any"
                value={settings.campusLng}
                error={errors.campusLng}
                onChange={handleChange}
              />
              <NumberField
                className="md:col-span-2"
                name="campusRadius"
                label="Allowed radius (metres)"
                min={10}
                value={settings.campusRadius}
                error={errors.campusRadius}
                hint="Distance from the campus point within which check-ins are accepted. Around 200 m suits a single campus."
                onChange={handleChange}
              />
            </fieldset>
          </div>
        </Card>

        {/* Face verification */}
        <Card>
          <SectionTitle icon={<Shield size={20} />}>Anti-spoofing and security</SectionTitle>
          <NumberField
            className="max-w-xs"
            name="faceMatchThreshold"
            label="Face match threshold (0 – 1)"
            step="0.01"
            min={0}
            max={1}
            value={settings.faceMatchThreshold}
            error={errors.faceMatchThreshold}
            hint="Minimum similarity score for a check-in to count. Lower scores are recorded as proxy attempts. Default 0.5."
            onChange={handleChange}
          />
        </Card>

        {/* Sessions */}
        <Card>
          <SectionTitle icon={<Clock size={20} />}>Session parameters</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField
              name="attendanceWindowMinutes"
              label="Attendance window (min)"
              min={1}
              value={settings.attendanceWindowMinutes}
              error={errors.attendanceWindowMinutes}
              hint="Sessions close automatically after this long."
              onChange={handleChange}
            />
            <NumberField
              name="lateThresholdMinutes"
              label="Late threshold (min)"
              min={0}
              value={settings.lateThresholdMinutes}
              error={errors.lateThresholdMinutes}
              hint="Check-ins after this are marked late."
              onChange={handleChange}
            />
            <NumberField
              name="minimumAttendancePercent"
              label="Minimum attendance (%)"
              min={0}
              max={100}
              value={settings.minimumAttendancePercent}
              error={errors.minimumAttendancePercent}
              hint="Students below this get a low-attendance alert."
              onChange={handleChange}
            />
          </div>
        </Card>

        <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-4 flex items-center justify-end gap-3 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent">
          {isDirty && <span className="text-sm text-[var(--text-muted)]">You have unsaved changes</span>}
          <Button type="submit" size="lg" isLoading={isSaving} icon={<Save size={18} aria-hidden="true" />}>
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
