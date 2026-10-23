import React from 'react';
import { AdminScreen, AdminScreenProps } from './AdminScreen';

export interface AdminModalProps extends Omit<AdminScreenProps, 'onBack'> {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Adapter for AdminModal: Renders AdminScreen when open.
 * Note: Prefer routing to AdminScreen page view directly as per design system requirements.
 */
export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <AdminScreen onBack={onClose} {...props} />
    </div>
  );
};
