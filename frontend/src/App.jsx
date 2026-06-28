import React from 'react';
import { Mail } from 'lucide-react';
import SingleVerification from './components/SingleVerification';
import BulkVerification from './components/BulkVerification';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Mail size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Email Verifier</h1>
          </div>
          <p className="text-gray-600 mt-2">Verify email addresses in real-time or bulk</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Single Verification */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <SingleVerification />
          </div>

          {/* Right Column - Bulk Verification */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <BulkVerification />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600 text-sm">
            © 2024 Email Verifier Platform. For internal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}
