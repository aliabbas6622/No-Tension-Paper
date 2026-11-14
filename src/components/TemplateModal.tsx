import React, { useState, useEffect } from 'react';
import { SubjectTemplate, ExamPaper } from '../types/exam';
import {
  BUILT_IN_TEMPLATES,
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
} from '../data/subjectTemplates';
import {
  X,
  Bookmark,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  BookOpen,
  BookPlus,
} from 'lucide-react';
import { SubjectAdderModal } from './SubjectAdderModal';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPaper: ExamPaper;
  onSelectTemplate: (templatePaper: ExamPaper) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  currentPaper,
  onSelectTemplate,
}) => {
  const [customTemplates, setCustomTemplates] = useState<SubjectTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newCategory, setNewCategory] = useState<
    'Math' | 'Science' | 'History' | 'Computer Science' | 'English' | 'Other'
  >('Science');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builtIn' | 'custom'>('builtIn');
  const [isSubjectAdderOpen, setIsSubjectAdderOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomTemplates(getCustomTemplates());
      setNewTemplateName(
        currentPaper.header.subjectTitle.replace(/^SUBJECT:\s*/i, '') || 'Custom Subject Paper'
      );
      setSuccessMsg(null);
    }
  }, [isOpen, currentPaper]);

  if (!isOpen) return null;

  const handleSubjectCreated = (
    paper: ExamPaper,
    template: SubjectTemplate,
    openWorkspace: boolean
  ) => {
    setCustomTemplates(getCustomTemplates());
    if (openWorkspace) {
      onSelectTemplate(paper);
      onClose();
    } else {
      setActiveTab('custom');
      setSuccessMsg(`Subject "${template.name}" added successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const saved = saveCustomTemplate(newTemplateName.trim(), newCategory, currentPaper);
    setCustomTemplates(getCustomTemplates());
    setIsSaving(false);
    setActiveTab('custom');
    setSuccessMsg(`Template "${saved.name}" saved!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete template "${name}"?`)) {
      deleteCustomTemplate(id);
      setCustomTemplates(getCustomTemplates());
    }
  };

  const handleLoad = (template: SubjectTemplate) => {
    onSelectTemplate(template.paper);
    onClose();
  };

  const handleExportTemplates = () => {
    const all = {
      version: 2,
      exportedAt: new Date().toISOString(),
      customTemplates,
    };
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_templates_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed?.customTemplates)) {
          let importedCount = 0;
          parsed.customTemplates.forEach((t: SubjectTemplate) => {
            if (t && t.name && t.paper && Array.isArray(t.paper.sections)) {
              saveCustomTemplate(t.name, t.category || 'Other', t.paper);
              importedCount++;
            }
          });
          setCustomTemplates(getCustomTemplates());
          setSuccessMsg(
            importedCount > 0
              ? `Imported ${importedCount} template${importedCount === 1 ? '' : 's'}!`
              : 'No valid templates found in file.'
          );
          setTimeout(() => setSuccessMsg(null), 3500);
        } else {
          setSuccessMsg('Invalid templates JSON format (missing customTemplates array).');
          setTimeout(() => setSuccessMsg(null), 3500);
        }
      } catch (err) {
        setSuccessMsg('Failed to parse templates JSON file.');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-black border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-semibold text-white text-sm">Subject Templates</h3>
              <p className="text-[11px] text-neutral-400">
                Switch subjects or save current layout as a reusable template
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="mx-6 mt-3 p-2.5 bg-neutral-900 border border-neutral-700 rounded-lg flex items-center gap-2 text-white text-xs">
            <Check className="w-3.5 h-3.5 text-white" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab selection & Save trigger */}
        <div className="px-6 pt-3 flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('builtIn')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'builtIn'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Standard Subjects ({BUILT_IN_TEMPLATES.length})
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Saved by You ({customTemplates.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSubjectAdderOpen(true)}
              className="px-3 py-1 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
              title="Add subject from curriculum answers JSON"
            >
              <BookPlus className="w-3.5 h-3.5 text-black" />
              <span>+ Subject Adder</span>
            </button>
            <button
              onClick={() => setIsSaving(!isSaving)}
              className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 border border-neutral-700 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-white" />
              <span>Save Current</span>
            </button>
          </div>
        </div>

        {/* Save Current Template Form */}
        {isSaving && (
          <form
            onSubmit={handleSaveCurrent}
            className="mx-6 mt-3 p-3.5 bg-neutral-950 border border-neutral-700 rounded-xl space-y-2.5 text-xs"
          >
            <div className="font-semibold text-white">Save Current Layout as Subject Template</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template Title"
                className="sm:col-span-2 bg-black border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden"
                autoFocus
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="bg-black border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-hidden"
              >
                <option value="Math">Math</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Computer Science">Computer Science</option>
                <option value="English">English</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSaving(false)}
                className="px-3 py-1 bg-neutral-900 text-neutral-300 text-xs rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeTab === 'builtIn' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BUILT_IN_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="p-4 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-xl transition flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black border border-neutral-800 text-neutral-400">
                        {template.category}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {template.paper.header.maxMarks} Marks
                      </span>
                    </div>
                    <div className="font-semibold text-white text-sm pt-1">{template.name}</div>
                    <p className="text-[11px] text-neutral-400">{template.description}</p>
                    <div className="text-[10px] text-neutral-500 pt-1">
                      {template.paper.sections.length} Sections •{' '}
                      {template.paper.sections.reduce((a, s) => a + s.questions.length, 0)} Questions
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-900 flex justify-end">
                    <button
                      onClick={() => handleLoad(template)}
                      className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Use Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {customTemplates.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-neutral-800 rounded-xl">
                  <Bookmark className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <div className="text-xs font-medium text-neutral-300">No Custom Templates Yet</div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Click &quot;Save Current&quot; to save this paper layout for future use.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl transition flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black border border-neutral-800 text-neutral-400">
                            {template.category}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {template.paper.header.maxMarks} Marks
                          </span>
                        </div>
                        <div className="font-semibold text-white text-sm pt-1">{template.name}</div>
                        <p className="text-[11px] text-neutral-400">{template.subject}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between">
                        <button
                          onClick={() => handleDelete(template.id, template.name)}
                          className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                        <button
                          onClick={() => handleLoad(template)}
                          className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 transition cursor-pointer"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTemplates}
              disabled={customTemplates.length === 0}
              className="text-xs text-neutral-400 hover:text-white disabled:opacity-30 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <label className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportTemplates}
                className="hidden"
              />
            </label>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Embedded Subject Adder Modal */}
      <SubjectAdderModal
        isOpen={isSubjectAdderOpen}
        onClose={() => setIsSubjectAdderOpen(false)}
        onSubjectAdded={handleSubjectCreated}
      />
    </div>
  );
};
