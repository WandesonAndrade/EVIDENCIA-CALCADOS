import React from 'react';
import { Order } from '../../types';
import { LocalDeliveryLabel } from './LocalDeliveryLabel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  labelUrl?: string;
  trackingCode?: string;
  onLabelPrinted?: (labelNumber: string) => void;
}

export const ShippingLabelPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  onLabelPrinted,
}) => {
  if (!isOpen) return null;

  return (
    <LocalDeliveryLabel
      order={order}
      onClose={onClose}
      onLabelPrinted={onLabelPrinted}
    />
  );
};
