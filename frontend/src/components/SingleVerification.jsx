import React, { useState } from 'react';
import { Mail, Loader } from 'lucide-react';
import { verifySingleEmail } from '../api/emailService';
import StatusBadge from './StatusBadge';

export default function SingleVerification() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await verifySingleEmail(email);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleVerify();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Single Verification</h2>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter email address"
            disabled={loading}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
        <button
          onClick={handleVerify}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 font-medium"
        >
          {loading ? <Loader size={20} className="animate-spin" /> : null}
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="text-sm text-gray-600 mb-2">Result:</p>
            <StatusBadge status={result.status} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-white rounded border border-gray-200">
              <p className="text-gray-600">Syntax</p>
              <p className="font-medium">{result.checks.syntax ? '✓' : '✗'}</p>
            </div>
            <div className="p-2 bg-white rounded border border-gray-200">
              <p className="text-gray-600">MX Records</p>
              <p className="font-medium">{result.checks.mxRecords ? '✓' : '✗'}</p>
            </div>
            <div className="p-2 bg-white rounded border border-gray-200">
              <p className="text-gray-600">SMTP</p>
              <p className="font-medium">{result.checks.smtp ? '✓' : '✗'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
