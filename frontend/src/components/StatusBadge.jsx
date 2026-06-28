import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function StatusBadge({ status }) {
  if (!status) return null;

  const configs = {
    valid: {
      bg: 'bg-green-100',
      border: 'border-green-300',
      text: 'text-green-800',
      icon: CheckCircle
    },
    invalid: {
      bg: 'bg-red-100',
      border: 'border-red-300',
      text: 'text-red-800',
      icon: XCircle
    },
    'catch-all': {
      bg: 'bg-yellow-100',
      border: 'border-yellow-300',
      text: 'text-yellow-800',
      icon: AlertCircle
    }
  };

  const config = configs[status] || configs.invalid;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${config.bg} ${config.border} ${config.text}`}>
      <Icon size={20} />
      <span className="font-medium capitalize">{status}</span>
    </div>
  );
}
