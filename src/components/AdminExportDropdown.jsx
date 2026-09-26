import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, Download, ChevronDown, Check, Loader2, Utensils, Filter, Building2, Sparkles } from 'lucide-react';
import { exportRoomOwnerRegister, exportMessRegister } from '../utils/exportRoomOwnerRegister.js';

export default function AdminExportDropdown({
  scopeRooms = [],
  filteredRooms = [],
  collegeName = '',
  cityName = '',
  messItems = [],
  isAdmin = false,
  onRequireAdmin,
  setNotification
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState(null); // 'rooms-all' | 'rooms-filtered' | 'mess'
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const hasFilterActive = filteredRooms.length > 0 && filteredRooms.length !== scopeRooms.length;

  const handleToggle = () => {
    if (!isAdmin && onRequireAdmin) {
      onRequireAdmin();
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleExportRooms = async (useFiltered = false) => {
    const targetRooms = useFiltered ? filteredRooms : scopeRooms;
    if (!targetRooms || targetRooms.length === 0) {
      setNotification?.({
        message: 'No room listings available in the current scope to export.',
        type: 'error',
        isVisible: true,
        title: 'Export Failed'
      });
      setIsOpen(false);
      return;
    }

    setIsExporting(true);
    setExportingType(useFiltered ? 'rooms-filtered' : 'rooms-all');

    try {
      const filterLabel = useFiltered
        ? `Filtered Selection (${targetRooms.length} Properties)`
        : `College Scope Register (${targetRooms.length} Properties)`;

      const result = await exportRoomOwnerRegister(targetRooms, {
        collegeName,
        cityName,
        filterLabel
      });

      setNotification?.({
        message: `${result.filename} (${result.recordCount} properties) downloaded successfully.`,
        type: 'success',
        isVisible: true,
        title: 'Excel Register Exported'
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Room export error:', err);
      setNotification?.({
        message: err.message || 'Failed to generate Excel register.',
        type: 'error',
        isVisible: true,
        title: 'Export Error'
      });
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportMess = async () => {
    setIsExporting(true);
    setExportingType('mess');

    try {
      let itemsToExport = messItems;
      if (!itemsToExport || itemsToExport.length === 0) {
        const { sampleMess, getMess } = await import('../data/mess.js');
        itemsToExport = typeof getMess === 'function' ? getMess() : sampleMess;
      }

      if (!itemsToExport || itemsToExport.length === 0) {
        throw new Error('No mess records available to export.');
      }

      const result = await exportMessRegister(itemsToExport, {
        collegeName,
        cityName
      });

      setNotification?.({
        message: `${result.filename} (${result.recordCount} mess listings) downloaded successfully.`,
        type: 'success',
        isVisible: true,
        title: 'Mess Register Exported'
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Mess export error:', err);
      setNotification?.({
        message: err.message || 'Failed to export Mess register.',
        type: 'error',
        isVisible: true,
        title: 'Export Error'
      });
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Export Button matching dashboard design */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isExporting}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Export Room and Mess registers to Excel"
        className={`group flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all shadow-xs min-h-[44px] md:min-h-0 select-none ${
          isOpen
            ? 'bg-orange-50 border-orange-400 text-orange-700 ring-2 ring-orange-200'
            : 'bg-white hover:bg-orange-50/60 border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-700'
        } ${isExporting ? 'opacity-80 cursor-wait' : 'cursor-pointer'}`}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform shrink-0" />
        )}
        <span className="whitespace-nowrap font-semibold">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-orange-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-xl bg-white p-2 shadow-2xl ring-1 ring-black/10 focus:outline-none z-50 border border-gray-100 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3 py-2.5 bg-gradient-to-r from-orange-50/80 to-amber-50/60 rounded-lg border border-orange-100 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-orange-600" />
                Excel Registers
              </span>
              <span className="text-[10px] font-semibold bg-orange-100/90 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
                Institutional
              </span>
            </div>
            <p className="text-xs text-gray-700 mt-1 font-medium truncate flex items-center gap-1">
              <Building2 className="w-3 h-3 text-orange-500 shrink-0" />
              <span className="truncate">{collegeName || 'Current Admin Scope'}</span>
            </p>
          </div>

          <div className="space-y-1">
            {/* Option 1: Export Room Data (All Scope) */}
            <button
              type="button"
              onClick={() => handleExportRooms(false)}
              disabled={isExporting}
              className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-start gap-3 group border border-transparent hover:border-gray-200"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-100 transition-colors">
                {isExporting && exportingType === 'rooms-all' ? (
                  <Loader2 className="w-4 h-4 text-emerald-700 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700">
                    Export Room Data
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    {scopeRooms.length} Rooms
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Full register of all properties in current college scope
                </p>
              </div>
            </button>

            {/* Option 2: Export Filtered Room Data (Only shown when filter active) */}
            {hasFilterActive && (
              <button
                type="button"
                onClick={() => handleExportRooms(true)}
                disabled={isExporting}
                className="w-full text-left p-2.5 rounded-lg bg-orange-50/40 hover:bg-orange-50 transition-colors flex items-start gap-3 group border border-orange-200/60"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5">
                  {isExporting && exportingType === 'rooms-filtered' ? (
                    <Loader2 className="w-4 h-4 text-orange-700 animate-spin" />
                  ) : (
                    <Filter className="w-4 h-4 text-orange-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-orange-900">
                      Export Filtered Rooms
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-200 text-orange-900 rounded">
                      {filteredRooms.length} Matches
                    </span>
                  </div>
                  <p className="text-xs text-orange-700/80 mt-0.5">
                    Export only currently filtered & searched properties
                  </p>
                </div>
              </button>
            )}

            <div className="my-1 border-t border-gray-100" />

            {/* Option 3: Export Mess Data */}
            <button
              type="button"
              onClick={handleExportMess}
              disabled={isExporting}
              className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-start gap-3 group border border-transparent hover:border-gray-200"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-sky-100 transition-colors">
                {isExporting && exportingType === 'mess' ? (
                  <Loader2 className="w-4 h-4 text-sky-700 animate-spin" />
                ) : (
                  <Utensils className="w-4 h-4 text-sky-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-bold text-gray-900 group-hover:text-sky-700">
                    Export Mess Data
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded">
                    {messItems.length || 'Dining'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dining pricing, meal plans, cuisine & leave policies
                </p>
              </div>
            </button>
          </div>

          {/* Footer note */}
          <div className="mt-2 pt-2 border-t border-gray-100 px-2 text-[10px] text-gray-400 flex items-center justify-between">
            <span>Includes 17-column register, KPIs & print layout</span>
            <span className="font-semibold text-gray-500">.xlsx</span>
          </div>
        </div>
      )}
    </div>
  );
}
