import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, X } from 'lucide-react';

export default function BulkVerification() {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const fileInputRef = useRef(null);

  const handleClick = () => {
    setShowComingSoon(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Bulk Verification</h2>

      <div
        onClick={handleClick}
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition border-gray-300 bg-gray-50 hover:border-gray-400 opacity-60"
      >
        <div className="space-y-2">
          <Upload size={32} className="mx-auto text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">Drop CSV file or click to select</p>
            <p className="text-sm text-gray-500">Supports files up to 10MB</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Dialog */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Coming Soon</h3>
              <button
                onClick={() => setShowComingSoon(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Bulk CSV verification feature is coming soon. Currently, you can verify emails one at a time using the single verification tool.
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
