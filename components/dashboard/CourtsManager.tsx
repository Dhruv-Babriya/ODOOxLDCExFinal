'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { createCourtAction, updateCourtAction } from '@/actions/bookings';
import {
  Plus,
  Edit3,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  MapPin,
} from 'lucide-react';

interface CourtData {
  id: string;
  name: string;
  sport_type: string;
  hourly_rate: number;
  is_indoor: boolean;
  is_active: boolean;
}

interface CourtsManagerProps {
  initialCourts: CourtData[];
  canManage: boolean;
}

export function CourtsManager({ initialCourts, canManage }: CourtsManagerProps) {
  const [courts, setCourts] = useState(initialCourts);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [newName, setNewName] = useState('');
  const [newSport, setNewSport] = useState<'TENNIS' | 'CRICKET'>('TENNIS');
  const [newRate, setNewRate] = useState('');
  const [newIndoor, setNewIndoor] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editIndoor, setEditIndoor] = useState(false);
  const [editActive, setEditActive] = useState(true);

  const handleCreate = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await createCourtAction({
        name: newName,
        sportType: newSport,
        hourlyRate: Number(newRate),
        isIndoor: newIndoor,
        isActive: true,
      });

      if (result.success) {
        setSuccess(result.message || 'Court created!');
        setShowCreateForm(false);
        setNewName('');
        setNewRate('');
        setNewIndoor(false);
        // Optimistically add to list
        setCourts([...courts, {
          id: result.data.courtId,
          name: newName,
          sport_type: newSport,
          hourly_rate: Number(newRate),
          is_indoor: newIndoor,
          is_active: true,
        }]);
      } else {
        setError(result.error);
      }
    });
  };

  const handleStartEdit = (court: CourtData) => {
    setEditingId(court.id);
    setEditName(court.name);
    setEditRate(String(court.hourly_rate));
    setEditIndoor(court.is_indoor);
    setEditActive(court.is_active);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateCourtAction({
        id: editingId,
        name: editName,
        hourlyRate: Number(editRate),
        isIndoor: editIndoor,
        isActive: editActive,
      });

      if (result.success) {
        setSuccess('Court updated successfully.');
        setEditingId(null);
        // Update local state
        setCourts(courts.map(c =>
          c.id === editingId
            ? { ...c, name: editName, hourly_rate: Number(editRate), is_indoor: editIndoor, is_active: editActive }
            : c
        ));
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 flex items-center gap-2 text-sm text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Create Court Button */}
      {canManage && !showCreateForm && (
        <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          Add New Court
        </Button>
      )}

      {/* Create Court Form */}
      {showCreateForm && (
        <Card className="border-emerald-800/50 bg-emerald-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-emerald-300">Create New Court</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Court Name *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tennis Court 3"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Sport Type *</label>
                <select
                  value={newSport}
                  onChange={(e) => setNewSport(e.target.value as 'TENNIS' | 'CRICKET')}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 h-10"
                >
                  <option value="TENNIS">Tennis</option>
                  <option value="CRICKET">Cricket</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Hourly Rate (₹) *</label>
                <Input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="600"
                  className="text-xs"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIndoor}
                    onChange={(e) => setNewIndoor(e.target.checked)}
                    className="rounded"
                  />
                  Indoor Court
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleCreate} isLoading={isPending}>
                Create Court
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courts.map((court) => (
          <Card
            key={court.id}
            className={cn(
              'border-zinc-800 bg-zinc-900/50 transition-all',
              !court.is_active && 'opacity-60'
            )}
          >
            {editingId === court.id ? (
              // Edit Mode
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Hourly Rate (₹)</label>
                  <Input type="number" value={editRate} onChange={(e) => setEditRate(e.target.value)} className="text-xs" />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={editIndoor} onChange={(e) => setEditIndoor(e.target.checked)} className="rounded" />
                    Indoor
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded" />
                    Active
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleUpdate} isLoading={isPending}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            ) : (
              // Display Mode
              <>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <Badge variant={court.sport_type === 'TENNIS' ? 'default' : 'warning'}>
                      {court.sport_type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Badge variant={court.is_active ? 'success' : 'destructive'} className="text-[10px]">
                        {court.is_active ? 'Operational' : 'Maintenance'}
                      </Badge>
                      {canManage && (
                        <button
                          onClick={() => handleStartEdit(court)}
                          className="text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-base text-white mt-2">{court.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Hourly Rate
                    </span>
                    <span className="font-semibold text-emerald-400">{formatCurrency(court.hourly_rate)} / hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Facility
                    </span>
                    <span className="text-zinc-300">{court.is_indoor ? 'Indoor Arena' : 'Outdoor Court'}</span>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
