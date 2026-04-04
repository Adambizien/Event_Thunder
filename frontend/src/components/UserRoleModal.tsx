import type { FormEvent } from 'react';
import Modal from './Modal';
import type { User } from '../types/AuthTypes';

interface UserRoleModalProps {
  isOpen: boolean;
  selectedUser: User | null;
  newRole: 'User' | 'Admin';
  roleLoading: boolean;
  roleError: string | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onRoleChange: (role: 'User' | 'Admin') => void;
}

const UserRoleModal = ({
  isOpen,
  selectedUser,
  newRole,
  roleLoading,
  roleError,
  onClose,
  onSubmit,
  onRoleChange,
}: UserRoleModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedUser
          ? `Modifier le role de ${selectedUser.firstName || selectedUser.email}`
          : 'Modifier le role'
      }
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
          <select
            value={newRole}
            onChange={(e) => onRoleChange(e.target.value as 'User' | 'Admin')}
            className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            disabled={roleLoading}
          >
            <option value="User">Utilisateur</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        {roleError && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300 mb-2">
            {roleError}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-white/15 hover:bg-white/25 border border-white/30 text-white"
            disabled={roleLoading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-white/15 hover:bg-white/25 border border-white/30 text-white disabled:opacity-60"
            disabled={roleLoading}
          >
            {roleLoading ? 'Modification...' : 'Valider'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserRoleModal;