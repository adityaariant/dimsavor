import React from 'react';
import { Badge } from './ui/badge';

export default function StatusBadge({ status }) {
  let variant = 'default';
  const s = status?.toUpperCase() || '';
  
  if (s === 'PAID') variant = 'paid';
  else if (s === 'SENT') variant = 'sent';
  else if (s === 'PENDING') variant = 'pending';
  else if (s === 'UNPAID') variant = 'unpaid';
  else if (s === 'CANCELLED') variant = 'cancelled';
  else if (s === 'CLOSED' || s === 'CLOSED_BATCH') variant = 'closed';

  return <Badge variant={variant}>{status}</Badge>;
}
