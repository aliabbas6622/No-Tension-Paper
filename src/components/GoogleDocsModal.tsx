import React, { useState, useEffect } from 'react';
import { ExamPaper } from '../types/exam';
import { initAuth, googleSignIn, getAccessToken, logout } from '../services/auth';
import { exportPaperToGoogleDocs, GoogleDocExportResult } from '../services/googleDocsExport';
import { User } from 'firebase/auth';
import { X, ExternalLink, CheckCircle2, AlertCircle, Loader2, LogOut, FileText } from 'lucide-react';

interface GoogleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ExamPaper;
}

export const GoogleDocsModal: React.FC<GoogleDocsModalProps> = ({
  isOpen,
  onClose,
  paper,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<GoogleDocExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    getAccessToken().then((t) => {
      if (t) setToken(t);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setExportResult(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const result = await exportPaperToGoogleDocs(paper);
      setExportResult(result);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('401') || err.message?.includes('token')) {
        setToken(null);
        setErrorMessage('Session expired. Please sign in again.');
      } else {
        setErrorMessage(err.message || 'Failed to create Google Doc.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-black border border-neutral-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-white" />
            <h3 className="font-semibold text-sm">Export to Google Docs</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-neutral-900 border border-neutral-700 rounded-lg flex items-start gap-2.5 text-neutral-200">
              <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Notice</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {exportResult ? (
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-center space-y-3">
              <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 text-black" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Google Doc Created</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Saved into your Google Drive with exact header, questions, and option alignments.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <a
                  href={exportResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition"
                >
                  <span>Open in Google Docs</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Paper summary */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
                <div className="font-semibold text-white">
                  {paper.header.subjectTitle || paper.title}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {paper.header.examinationTitle} • {paper.sections.length} sections • Max Marks:{' '}
                  {paper.header.maxMarks}
                </div>
              </div>

              {/* Auth */}
              {!token ? (
                <div className="text-center py-3 space-y-3">
                  <p className="text-[11px] text-neutral-400">
                    Connect your Google account with permission to create and save this paper into your Google Drive.
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={handleSignIn}
                      disabled={isLoadingAuth}
                      className="inline-flex items-center gap-2.5 px-4 py-2 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 transition disabled:opacity-50 cursor-pointer"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        <path fill="none" d="M0 0h48v48H0z"/>
                      </svg>
                      {isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px]">
                        {user?.displayName ? user.displayName[0] : 'G'}
                      </div>
                      <div className="text-[11px] text-neutral-300">
                        {user?.email}
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-[11px] text-neutral-500 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Switch</span>
                    </button>
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-2.5 px-4 bg-white text-black font-semibold rounded-lg text-xs hover:bg-neutral-200 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Creating Document in Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-black" />
                        <span>Create Google Document</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-neutral-900 text-neutral-300 text-xs rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
