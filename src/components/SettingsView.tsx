import React, { useRef, useState } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { 
  Settings, Download, Upload, RefreshCw, Trash2, 
  Sparkles, ShieldCheck, DollarSign, Check, AlertTriangle,
  BrainCircuit, Zap, MessageSquare 
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currencySymbol,
    setCurrencySymbol,
    startupPreference,
    setStartupPreference,
    smartSuggestionsEnabled,
    setSmartSuggestionsEnabled,
    resetToStarterData,
    wipeAllData,
    exportDataJson,
    importDataJson,
    transactions,
    merchantRules,
    openSmsSimulator,
    openSmsReview,
    pendingSmsCount
  } = useHoneymoney();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleExport = () => {
    const json = exportDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `honeymoney_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJson(content);
      if (success) {
        setImportSuccess('Data backup restored successfully!');
        setTimeout(() => setImportSuccess(null), 3000);
      } else {
        alert('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">
          Settings & Data Management
        </h1>
        <p className="text-xs text-[#7E9A89]">
          Personalization, backup, and local privacy
        </p>
      </div>

      {importSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{importSuccess}</span>
        </div>
      )}

      {/* App Preferences */}
      <div className="p-4 rounded-2xl bg-[#0D1C14] border border-[#1E4330] space-y-4">
        <h2 className="text-xs font-bold text-[#E5A93C] uppercase tracking-wider">
          Experience & Preferences
        </h2>

        {/* Currency Selector */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white block">Currency Symbol</span>
            <span className="text-[11px] text-[#7E9A89]">Default display denomination</span>
          </div>
          <div className="flex gap-1 bg-[#08120D] p-1 rounded-xl border border-[#1C3E2C]">
            {[
              { sym: '₹', label: 'INR (₹)' },
              { sym: '$', label: 'USD ($)' },
              { sym: '€', label: 'EUR (€)' },
              { sym: '£', label: 'GBP (£)' }
            ].map(c => (
              <button
                key={c.sym}
                onClick={() => setCurrencySymbol(c.sym)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  currencySymbol === c.sym
                    ? 'bg-[#E5A93C] text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c.sym}
              </button>
            ))}
          </div>
        </div>

        {/* Startup Preference (PDF: Open Home vs Open New Transaction) */}
        <div className="flex items-center justify-between pt-3 border-t border-[#162F22]">
          <div>
            <span className="text-xs font-semibold text-white block">Startup Screen</span>
            <span className="text-[11px] text-[#7E9A89]">Screen shown immediately on launch</span>
          </div>
          <div className="flex gap-1 bg-[#08120D] p-1 rounded-xl border border-[#1C3E2C]">
            <button
              onClick={() => setStartupPreference('HOME')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                startupPreference === 'HOME'
                  ? 'bg-[#1C3E2C] text-[#E5A93C] border border-[#E5A93C]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open Home
            </button>
            <button
              onClick={() => setStartupPreference('NEW_TRANSACTION')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                startupPreference === 'NEW_TRANSACTION'
                  ? 'bg-[#1C3E2C] text-[#E5A93C] border border-[#E5A93C]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quick Entry
            </button>
          </div>
        </div>

        {/* Smart Suggestions Sensitivity */}
        <div className="flex items-center justify-between pt-3 border-t border-[#162F22]">
          <div>
            <span className="text-xs font-semibold text-white block">Smart Entry Engine</span>
            <span className="text-[11px] text-[#7E9A89]">History frequency & recency matching</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={smartSuggestionsEnabled}
              onChange={(e) => setSmartSuggestionsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#08120D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E5A93C]" />
          </label>
        </div>
      </div>

      {/* SMS & Merchant Learning Card */}
      <div className="p-4 rounded-2xl bg-[#0D1C14] border border-[#1E4330] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#E5A93C]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              SMS Ingestion & Learned Rules
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#173727] text-[#A6CDB5] border border-[#2B5E43]">
            {merchantRules.length} Learned Rules
          </span>
        </div>

        <p className="text-[11px] text-[#7E9A89]">
          The app continuously learns from your merchant edits and maps cryptic bank SMS terminal numbers (e.g. 402919 to Irani Chai).
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={openSmsSimulator}
            className="py-2.5 px-3 rounded-xl bg-[#173727] hover:bg-[#1E4833] border border-[#2B5E43] text-xs font-bold text-[#E5A93C] flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS Simulator</span>
          </button>

          <button
            onClick={openSmsReview}
            className="py-2.5 px-3 rounded-xl bg-[#122A1E] hover:bg-[#193A2A] border border-[#234E37] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>Review Cards ({pendingSmsCount})</span>
          </button>
        </div>
      </div>


      {/* Backup & Data Management */}
      <div className="p-4 rounded-2xl bg-[#0D1C14] border border-[#1E4330] space-y-3">
        <h2 className="text-xs font-bold text-[#E5A93C] uppercase tracking-wider">
          Backup & Export
        </h2>
        <p className="text-xs text-[#7E9A89]">
          Honeymoney is local-first. Your transaction history resides on this device.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={handleExport}
            className="p-3 rounded-xl bg-[#142C1F] hover:bg-[#1B3A29] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-[#234E37] transition-colors"
          >
            <Download className="w-4 h-4 text-[#E5A93C]" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-[#142C1F] hover:bg-[#1B3A29] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-[#234E37] transition-colors"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Import JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Reset & Wipe Danger Zone */}
      <div className="p-4 rounded-2xl bg-[#0D1C14] border border-red-950/60 space-y-3">
        <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">
          Reset & Danger Zone
        </h2>

        <div className="space-y-2">
          <button
            onClick={() => {
              if (confirm('Reload realistic starter demo records for Honeymoney?')) {
                resetToStarterData();
              }
            }}
            className="w-full p-2.5 rounded-xl bg-[#142C1F] hover:bg-[#1C3E2C] text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Reload Starter Demo Records</span>
            </span>
            <span className="text-[10px] text-[#7E9A89]">Restores chai, Uber, bills</span>
          </button>

          <button
            onClick={() => {
              if (confirm('WIPE ALL DATA? This will delete all transactions from local storage.')) {
                wipeAllData();
              }
            }}
            className="w-full p-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold flex items-center justify-between border border-red-800/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Wipe All Data</span>
            </span>
            <span className="text-[10px] text-red-400">Irreversible</span>
          </button>
        </div>
      </div>

      {/* About & Philosophy */}
      <div className="p-4 rounded-2xl bg-[#08120D] border border-[#162D20] text-center space-y-1">
        <h3 className="text-xs font-bold text-white">Honeymoney v1.0</h3>
        <p className="text-[11px] text-[#7E9A89]">
          Manual-first personal spending memory.
        </p>
        <p className="text-[10px] text-slate-500 italic pt-1">
          "The first transaction may require several fields. A familiar hundredth transaction requires only the minimum information to identify the pattern."
        </p>
      </div>
    </div>
  );
};
