// ═══════════════════════════════════════════════════════════
// AttendAI — System Settings (Admin)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Settings, Save, MapPin, Shield, Clock } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function SystemSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        setSettings(data.data);
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    });
  };

  if (isLoading || !settings) {
    return <div className="animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Configure global parameters and security rules.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Geofencing Settings */}
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border)]">
            <MapPin className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold">Campus Geofencing</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] border border-[var(--border-light)]">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Enable Geofencing Validation</p>
                <p className="text-sm text-[var(--text-muted)]">Require students to be on campus to mark attendance.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="geofencingEnabled" 
                  checked={settings.geofencingEnabled} 
                  onChange={handleChange} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--border-light)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-success)]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-100 transition-opacity" style={{ opacity: settings.geofencingEnabled ? 1 : 0.5 }}>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Campus Latitude</label>
                <input type="number" step="any" name="campusLat" value={settings.campusLat} onChange={handleChange} disabled={!settings.geofencingEnabled} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Campus Longitude</label>
                <input type="number" step="any" name="campusLng" value={settings.campusLng} onChange={handleChange} disabled={!settings.geofencingEnabled} className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Allowed Radius (meters)</label>
                <input type="number" name="campusRadius" value={settings.campusRadius} onChange={handleChange} disabled={!settings.geofencingEnabled} className="input" />
                <p className="text-xs text-[var(--text-muted)] mt-1">Recommended: 200m for BMSCE campus.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border)]">
            <Shield className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold">Anti-Spoofing & Security</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Face Match Confidence Threshold (0.0 - 1.0)</label>
              <input type="number" step="0.01" min="0" max="1" name="faceMatchThreshold" value={settings.faceMatchThreshold} onChange={handleChange} className="input max-w-xs" />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Minimum score required to mark as 'Present'. Lower scores are flagged as proxy attempts. Recommended: 0.5 (50%).
              </p>
            </div>
          </div>
        </Card>

        {/* Time Settings */}
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border)]">
            <Clock className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold">Session Parameters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Attendance Window (Minutes)</label>
              <input type="number" min="1" name="attendanceWindowMinutes" value={settings.attendanceWindowMinutes} onChange={handleChange} className="input" />
              <p className="text-xs text-[var(--text-muted)] mt-1">Auto-close sessions after this time.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Late Threshold (Minutes)</label>
              <input type="number" min="0" name="lateThresholdMinutes" value={settings.lateThresholdMinutes} onChange={handleChange} className="input" />
              <p className="text-xs text-[var(--text-muted)] mt-1">Mark students as 'Late' if joining after this threshold.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" isLoading={isSaving} icon={<Save size={18} />}>
            Save All Settings
          </Button>
        </div>
        
      </form>
    </div>
  );
}
