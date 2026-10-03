'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { DEPARTMENTS } from '@/types/shared';
import {
  createManagerAction,
  updateManagerAction,
  deleteManagerAction,
  type ManagerItem,
} from '@/actions/managers';
import {
  UserCheck,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

interface ManagersManagerViewProps {
  initialManagers: ManagerItem[];
  total: number;
  initialPage: number;
  pageSize: number;
  totalPages: number;
}

export function ManagersManagerView({
  initialManagers,
  total,
  initialPage,
  pageSize,
  totalPages,
}: ManagersManagerViewProps) {
  const router = useRouter();

  const [managers, setManagers] = useState<ManagerItem[]>(initialManagers);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentTotalPages, setCurrentTotalPages] = useState(totalPages);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add Manager Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('ManagerPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [addEmployeeCode, setAddEmployeeCode] = useState(
    () => `MGR-${Math.floor(100 + Math.random() * 900)}`
  );
  const [addDepartment, setAddDepartment] = useState('MANAGEMENT');
  const [addPosition, setAddPosition] = useState('Club General Manager');
  const [addSalaryMonthly, setAddSalaryMonthly] = useState('60000');
  const [addHireDate, setAddHireDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Manager Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<ManagerItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('MANAGEMENT');
  const [editPosition, setEditPosition] = useState('');
  const [editSalaryMonthly, setEditSalaryMonthly] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete / Deactivate State
  const [deletingManager, setDeletingManager] = useState<ManagerItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchPage = async (page: number, query = search) => {
    setIsLoading(true);
    router.push(`/dashboard/managers?page=${page}${query ? `&search=${encodeURIComponent(query)}` : ''}`);
    setIsLoading(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPage(1, search);
  };

  const openAddModal = () => {
    setAddEmployeeCode(`MGR-${Math.floor(100 + Math.random() * 900)}`);
    setAddFullName('');
    setAddEmail('');
    setAddPhone('');
    setAddPassword('ManagerPass123!');
    setAddDepartment('MANAGEMENT');
    setAddPosition('Club General Manager');
    setAddSalaryMonthly('60000');
    setAddHireDate(new Date().toISOString().split('T')[0]);
    setAddError(null);
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    const result = await createManagerAction({
      fullName: addFullName,
      email: addEmail,
      phone: addPhone || undefined,
      password: addPassword,
      employeeCode: addEmployeeCode,
      department: addDepartment as (typeof DEPARTMENTS)[number],
      position: addPosition,
      salaryMonthly: addSalaryMonthly ? parseFloat(addSalaryMonthly) : 0,
      hireDate: addHireDate,
      isActive: true,
    });

    setAddLoading(false);
    if (!result.success) {
      setAddError(result.error || 'Failed to create manager.');
      return;
    }

    setIsAddOpen(false);
    router.refresh();
  };

  const openEditModal = (mgr: ManagerItem) => {
    setEditingManager(mgr);
    setEditFullName(mgr.fullName);
    setEditPhone(mgr.phone || '');
    setEditDepartment(mgr.staffRecord?.department || 'MANAGEMENT');
    setEditPosition(mgr.staffRecord?.position || 'Club Manager');
    setEditSalaryMonthly(String(mgr.staffRecord?.salaryMonthly || ''));
    setEditIsActive(mgr.isActive);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    if (!editingManager) return;
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    const result = await updateManagerAction(editingManager.id, {
      fullName: editFullName,
      phone: editPhone || undefined,
      department: editDepartment as (typeof DEPARTMENTS)[number],
      position: editPosition,
      salaryMonthly: editSalaryMonthly ? parseFloat(editSalaryMonthly) : undefined,
      isActive: editIsActive,
    });

    setEditLoading(false);
    if (!result.success) {
      setEditError(result.error || 'Failed to update manager.');
      return;
    }

    setIsEditOpen(false);
    router.refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingManager) return;
    setDeleteLoading(true);
    setDeleteError(null);

    const result = await deleteManagerAction(deletingManager.id, true);
    setDeleteLoading(false);

    if (!result.success) {
      setDeleteError(result.error || 'Failed to delete manager.');
      return;
    }

    setDeletingManager(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-lg text-white">Club Managers & Leadership Roster</CardTitle>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 font-mono">
                Owner Access Only
              </Badge>
            </div>
            <CardDescription className="text-xs text-zinc-400 mt-1">
              As Club Owner, you directly oversee and provision General Managers and Operations Directors.
            </CardDescription>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            className="gap-2 shadow-lg shadow-emerald-950/50 shrink-0 font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Club Manager</span>
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search by manager name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-950/80 border-zinc-800 text-xs text-zinc-100"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="text-xs">
              Search
            </Button>
          </form>

          {/* Managers Table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Manager Profile</th>
                  <th className="py-3 px-4">Employee Code</th>
                  <th className="py-3 px-4">Position & Dept</th>
                  <th className="py-3 px-4">Monthly Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Loading managers...
                    </td>
                  </tr>
                ) : initialManagers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No club managers found. Click &quot;Add Club Manager&quot; to provision one.
                    </td>
                  </tr>
                ) : (
                  initialManagers.map((mgr) => (
                    <tr key={mgr.id} className="hover:bg-zinc-850/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                            {mgr.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{mgr.fullName}</div>
                            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3 text-zinc-500" />
                              {mgr.email}
                            </div>
                            {mgr.phone && (
                              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                                <Phone className="h-3 w-3" />
                                {mgr.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-200">
                        {mgr.staffRecord?.employeeCode || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-zinc-200 font-medium">
                          {mgr.staffRecord?.position || 'Club Manager'}
                        </div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {mgr.staffRecord?.department || 'MANAGEMENT'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-200">
                        {mgr.staffRecord?.salaryMonthly
                          ? formatCurrency(mgr.staffRecord.salaryMonthly)
                          : '₹0.00'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={mgr.isActive ? 'default' : 'outline'}
                          className={`text-[10px] ${
                            mgr.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'text-zinc-500 border-zinc-700'
                          }`}
                        >
                          {mgr.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-zinc-750"
                            onClick={() => openEditModal(mgr)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDeletingManager(mgr)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
            <div>
              Showing {total > 0 ? (initialPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(initialPage * pageSize, total)} of {total} managers
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-zinc-800"
                disabled={initialPage <= 1 || isLoading}
                onClick={() => fetchPage(initialPage - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>

              <span className="text-zinc-300 font-medium px-2">
                Page {initialPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-zinc-800"
                disabled={initialPage >= totalPages || isLoading}
                onClick={() => fetchPage(initialPage + 1)}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADD MANAGER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-white">Add Club Manager</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Provision login credentials and administrative access for a new manager.
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSubmit} className="space-y-3.5">
                {addError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                    {addError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Full Name *</label>
                    <Input
                      required
                      placeholder="e.g. Vikram Mehta"
                      value={addFullName}
                      onChange={(e) => setAddFullName(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Manager Email *</label>
                    <Input
                      required
                      type="email"
                      placeholder="vikram@thechampionsclub.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="+91 98765 12345"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Initial Password *</label>
                    <div className="relative">
                      <Input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-zinc-400 p-1"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Employee Code *</label>
                    <Input
                      required
                      value={addEmployeeCode}
                      onChange={(e) => setAddEmployeeCode(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Position Title *</label>
                    <Input
                      required
                      value={addPosition}
                      onChange={(e) => setAddPosition(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Monthly Salary (₹)</label>
                    <Input
                      type="number"
                      value={addSalaryMonthly}
                      onChange={(e) => setAddSalaryMonthly(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Hire Date</label>
                    <Input
                      type="date"
                      value={addHireDate}
                      onChange={(e) => setAddHireDate(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={addLoading}>
                    Add Manager
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EDIT MANAGER MODAL */}
      {isEditOpen && editingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-white">Edit Manager: {editingManager.fullName}</CardTitle>
                <CardDescription className="text-xs text-zinc-400 font-mono">
                  {editingManager.email}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditSubmit} className="space-y-3.5">
                {editError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Full Name *</label>
                    <Input
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Phone</label>
                    <Input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Position Title *</label>
                    <Input
                      required
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Monthly Salary (₹)</label>
                    <Input
                      type="number"
                      value={editSalaryMonthly}
                      onChange={(e) => setEditSalaryMonthly(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="editIsActive" className="text-xs font-medium text-zinc-300 cursor-pointer">
                    Active Manager Account (enables dashboard access and operational authority)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={editLoading}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}
      {deletingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-md border-rose-900/60 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="p-2 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-white">Delete Manager Account</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Are you sure you want to remove manager &quot;{deletingManager.fullName}&quot;?
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-zinc-300">
                This will revoke all administrative privileges and remove the employee record for{' '}
                <strong className="text-white font-mono">{deletingManager.email}</strong>.
              </p>

              {deleteError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingManager(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  isLoading={deleteLoading}
                >
                  Yes, Remove Manager
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
