'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { onboardStaffAction, createStaffAction } from '@/actions/staff';
import {
  UserPlus,
  UserCheck,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  KeyRound,
  Mail,
  Phone,
  User,
  BadgePercent,
  Calendar,
} from 'lucide-react';
import { DEPARTMENTS } from '@/types/shared';

interface StaffFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const STAFF_ROLES = [
  { value: 'FRONT_DESK', label: 'Front Desk / Receptionist', defaultDept: 'FRONT_DESK', defaultPos: 'Front Desk Executive' },
  { value: 'SHOP_STAFF', label: 'Pro Shop Specialist', defaultDept: 'SHOP', defaultPos: 'Pro Shop Associate' },
  { value: 'BAR_STAFF', label: 'Bar & Cafeteria / Barista', defaultDept: 'BAR', defaultPos: 'Barista & Server' },
  { value: 'ADMIN', label: 'Club Manager / Administrator', defaultDept: 'MANAGEMENT', defaultPos: 'Operations Manager' },
] as const;

export function StaffForm({ onClose, onSuccess }: StaffFormProps) {
  // Mode: 'new_account' creates login credentials + staff record; 'link_profile' links existing UUID
  const [mode, setMode] = useState<'new_account' | 'link_profile'>('new_account');

  // New account fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('StaffPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'FRONT_DESK' | 'SHOP_STAFF' | 'BAR_STAFF' | 'ADMIN'>('FRONT_DESK');

  // Staff roster fields
  const [profileId, setProfileId] = useState('');
  const [employeeCode, setEmployeeCode] = useState(() => `EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [department, setDepartment] = useState('FRONT_DESK');
  const [position, setPosition] = useState('Front Desk Executive');
  const [hourlyRate, setHourlyRate] = useState('');
  const [salaryMonthly, setSalaryMonthly] = useState('');
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{
    name: string;
    email: string;
    role: string;
    code: string;
  } | null>(null);

  const handleRoleChange = (newRole: 'FRONT_DESK' | 'SHOP_STAFF' | 'BAR_STAFF' | 'ADMIN') => {
    setRole(newRole);
    const meta = STAFF_ROLES.find((r) => r.value === newRole);
    if (meta) {
      setDepartment(meta.defaultDept);
      setPosition(meta.defaultPos);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (mode === 'new_account') {
      const result = await onboardStaffAction({
        fullName,
        email,
        phone,
        password,
        role,
        department: department as (typeof DEPARTMENTS)[number],
        position,
        employeeCode,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
        salaryMonthly: salaryMonthly ? parseFloat(salaryMonthly) : 0,
        hireDate,
        isActive,
      });

      setIsSubmitting(false);
      if (result.success) {
        setCreatedInfo({
          name: fullName,
          email,
          role,
          code: employeeCode,
        });
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to onboard staff member.');
      }
    } else {
      const result = await createStaffAction({
        profileId,
        employeeCode,
        department,
        position,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
        salaryMonthly: salaryMonthly ? parseFloat(salaryMonthly) : 0,
        hireDate,
        isActive,
      });

      setIsSubmitting(false);
      if (result.success) {
        setCreatedInfo({
          name: 'Existing Profile',
          email: profileId,
          role: 'STAFF',
          code: employeeCode,
        });
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to create staff record.');
      }
    }
  };

  if (createdInfo) {
    return (
      <Card className="border-emerald-500/30 bg-zinc-900/95 shadow-2xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Staff Member Onboarded!</h3>
            <p className="text-xs text-zinc-400">
              The employee account and staff roster record have been successfully created.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left text-xs space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="text-zinc-400">Employee Name:</span>
              <span className="font-semibold text-white">{createdInfo.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="text-zinc-400">Login Email:</span>
              <span className="font-mono text-emerald-400">{createdInfo.email}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="text-zinc-400">System Role:</span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                {createdInfo.role}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Employee Code:</span>
              <span className="font-mono font-bold text-zinc-200">{createdInfo.code}</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
            The employee can now immediately sign in at the login page using their email and initial password.
          </p>

          <Button variant="secondary" size="sm" onClick={onClose} className="mt-2">
            Done & Return to Roster
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur-md">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserPlus className="h-4 w-4" />
            </div>
            <CardTitle className="text-base text-white">Manager Onboard Staff</CardTitle>
          </div>
          <CardDescription className="text-xs text-zinc-400 mt-1">
            Provision login credentials and configure department assignments for club personnel.
          </CardDescription>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors"
            type="button"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* MODE SWITCHER */}
        <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800 text-xs">
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
              mode === 'new_account'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setMode('new_account')}
          >
            Create New Staff Account
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
              mode === 'link_profile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setMode('link_profile')}
          >
            Link Existing Profile UUID
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-start gap-2"
            >
              <X className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* NEW ACCOUNT SECTION */}
          {mode === 'new_account' ? (
            <div className="space-y-4 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
              <div className="flex items-center gap-2 pb-1 border-b border-zinc-800/60 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>1. Staff Account & Login Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    Staff Email Address <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="rahul@thechampionsclub.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                      Initial Password <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-500">Min. 6 chars</span>
                  </div>
                  <div className="relative">
                    <Input
                      required
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Staff Role & System Permissions <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STAFF_ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleRoleChange(r.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                        role === r.value
                          ? 'border-emerald-500 bg-emerald-950/30 text-white'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">{r.label}</span>
                        {role === r.value && <Badge variant="default" className="text-[9px] h-4">Selected</Badge>}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Role: {r.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* LINK EXISTING PROFILE SECTION */
            <div className="space-y-1.5 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
              <label className="text-xs font-medium text-zinc-300">Existing Profile UUID *</label>
              <Input
                required
                placeholder="UUID from public.profiles"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
              />
              <p className="text-[11px] text-zinc-500">
                Links an existing registered profile into the employee staff roster.
              </p>
            </div>
          )}

          {/* EMPLOYEE ROSTER DETAILS SECTION */}
          <div className="space-y-4 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-800/60 text-xs font-semibold text-emerald-400">
              <Building2 className="w-3.5 h-3.5" />
              <span>2. Club Department & Employment Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Employee Code <span className="text-rose-400">*</span>
                </label>
                <Input
                  required
                  placeholder="EMP-001"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="bg-zinc-900 border-zinc-750 text-xs font-mono text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Department <span className="text-rose-400">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-750 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Position Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Senior Cashier"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Hire Date <span className="text-rose-400">*</span>
                </label>
                <Input
                  required
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <BadgePercent className="w-3.5 h-3.5 text-zinc-400" />
                  Hourly Rate (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <BadgePercent className="w-3.5 h-3.5 text-zinc-400" />
                  Monthly Salary (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={salaryMonthly}
                  onChange={(e) => setSalaryMonthly(e.target.value)}
                  className="bg-zinc-900 border-zinc-750 text-xs text-zinc-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActiveStaff"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="isActiveStaff" className="text-xs font-medium text-zinc-300 cursor-pointer">
                Active Staff Member (enabled for shift scheduling & system access)
              </label>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full font-semibold shadow-lg shadow-emerald-950/50"
            isLoading={isSubmitting}
            aria-busy={isSubmitting}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {mode === 'new_account' ? 'Onboard & Provision Staff Account' : 'Link Staff Record'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
