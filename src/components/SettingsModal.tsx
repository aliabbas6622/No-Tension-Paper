import React from 'react';
import { PaperSettings } from '../types/exam';
import { X, Sliders, CheckSquare, Square, Type, FileText } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PaperSettings;
  onUpdateSettings: (updated: Partial<PaperSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-neutral-900 dark:text-white" />
            <h3 className="font-semibold text-sm">Paper Display & Print Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white p-1 rounded dark:hover:bg-neutral-900 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs">
          {/* Section Visibility Toggles requested by user */}
          <div className="space-y-3">
            <div className="font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
              Paper Elements Visibility
            </div>

            {/* General Instructions */}
            <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 cursor-pointer transition">
              <div>
                <div className="font-medium text-neutral-900 dark:text-white">General Instructions</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Top rules & notes under the metadata line
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showGeneralInstructions !== false}
                onChange={(e) =>
                  onUpdateSettings({ showGeneralInstructions: e.target.checked })
                }
                className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
              />
            </label>

            {/* Section Instructions (notes like "Q1 Choose the best answer...") */}
            <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 cursor-pointer transition">
              <div>
                <div className="font-medium text-neutral-900 dark:text-white">Section Instructions & Notes</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Instruction line under section titles (e.g. &quot;Q1 Choose the best...&quot;)
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showSectionInstructions !== false}
                onChange={(e) =>
                  onUpdateSettings({ showSectionInstructions: e.target.checked })
                }
                className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
              />
            </label>

            {/* Notes with each question (marks notes) */}
            <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 cursor-pointer transition">
              <div>
                <div className="font-medium text-neutral-900 dark:text-white">Question Marks / Notes</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Displays [4 Marks] next to individual questions
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showQuestionMarks !== false}
                onChange={(e) =>
                  onUpdateSettings({ showQuestionMarks: e.target.checked })
                }
                className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
              />
            </label>

            {/* Ending Sign-off */}
            <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 cursor-pointer transition">
              <div>
                <div className="font-medium text-neutral-900 dark:text-white">Ending Line / Sign-off</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Shows &quot;*** END OF EXAMINATION PAPER ***&quot; at bottom
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showEndOfPaper !== false}
                onChange={(e) =>
                  onUpdateSettings({ showEndOfPaper: e.target.checked })
                }
                className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
              />
            </label>

            {/* Vertical Divider Marker '|' */}
            <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 cursor-pointer transition">
              <div>
                <div className="font-medium text-neutral-900 dark:text-white">Divider Marker (&apos;|&apos;)</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Vertical bar preceding each section title
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showDividerMarker !== false}
                onChange={(e) =>
                  onUpdateSettings({ showDividerMarker: e.target.checked })
                }
                className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
              />
            </label>
          </div>

          {/* Typography & Page Size */}
          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
              Print Typography & Layout
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-600 dark:text-neutral-400 mb-1">Font Style</label>
                <select
                  value={settings.fontFamily || 'times'}
                  onChange={(e) =>
                    onUpdateSettings({
                      fontFamily: e.target.value as 'times' | 'sans' | 'classic',
                    })
                  }
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                >
                  <option value="times">Times New Roman (Board Style)</option>
                  <option value="classic">Classic Serif (Georgia)</option>
                  <option value="sans">Modern Sans (Clean)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 dark:text-neutral-400 mb-1">Paper Size</label>
                <select
                  value={settings.paperSize || 'a4'}
                  onChange={(e) =>
                    onUpdateSettings({
                      paperSize: e.target.value as 'a4' | 'letter',
                    })
                  }
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                >
                  <option value="a4">A4 (Standard 210x297mm)</option>
                  <option value="letter">Letter (8.5x11 in)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold text-xs rounded-lg dark:hover:bg-neutral-200 transition cursor-pointer"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
