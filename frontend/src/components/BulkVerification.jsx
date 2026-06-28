import React, { useState, useRef } from 'react';
import { Upload, Loader, Download, AlertCircle } from 'lucide-react';
import { verifyCSV, downloadFile } from '../api/emailService';

export default function BulkVerification() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type !== 'dragleave');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.[0]) {
      handleFile(droppedFiles[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const handleVerify = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await verifyCSV(file);
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Bulk Verification</h2>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-2">
            <Upload size={20} className="text-green-600" />
            <span className="font-medium text-gray-900">{file.name}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="mx-auto text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Drop CSV file or click to select</p>
              <p className="text-sm text-gray-500">Supports files up to 10MB</p>
            </div>
          </div>
        )}
      </div>

      {file && (
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
        >
          {loading ? <Loader size={20} className="animate-spin" /> : null}
          {loading ? 'Processing...' : 'Verify All'}
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
          <AlertCircle size={18} className="text-red-800 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-white rounded border border-gray-200">
              <p className="text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200 bg-green-50">
              <p className="text-green-700">Valid</p>
              <p className="text-2xl font-bold text-green-900">{result.validCount}</p>
            </div>
            <div className="p-3 bg-white rounded border border-red-200 bg-red-50">
              <p className="text-red-700">Invalid</p>
              <p className="text-2xl font-bold text-red-900">{result.invalidCount}</p>
            </div>
            <div className="p-3 bg-white rounded border border-yellow-200 bg-yellow-50">
              <p className="text-yellow-700">Catch-all</p>
              <p className="text-2xl font-bold text-yellow-900">{result.catchAllCount}</p>
            </div>
          </div>

          <button
            onClick={() => downloadFile(result.downloadUrl)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
          >
            <Download size={20} />
            Download Results CSV
          </button>
        </div>
      )}
    </div>
  );
}
