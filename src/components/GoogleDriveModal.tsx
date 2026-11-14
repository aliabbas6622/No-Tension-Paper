import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { ExamPaper } from '../types/exam';
import { initAuth, googleSignIn, getAccessToken, getCurrentUser, logout } from '../services/auth';
import {
  DriveFileItem,
  listDriveFiles,
  uploadFileToDrive,
  savePaperJsonToDrive,
  loadPaperJsonFromDrive,
  deleteDriveFile,
  shareDriveFile,
} from '../services/googleDriveService';
import { buildPaperWordBlob } from '../services/wordExport';
import { generatePaperPDFBlob } from '../services/pdfExport';
import { getSanitizedBaseFilename } from '../services/paperText';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  X,
  HardDrive,
  Upload,
  RefreshCw,
  Trash2,
  FolderOpen,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  FileText,
  FileJson,
  Share2,
  Copy,
  Check,
  Mail,
  Link2,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ExamPaper;
  onLoadPaperFromDrive: (paper: ExamPaper, filename: string) => void;
  allowSaveCurrentPaper?: boolean;
  initialFormat?: DriveSaveFormat;
  autoOpenShareAfterSave?: boolean;
  onEmailShareLink?: (payload: {
    shareLink: string;
    fileName: string;
    recipientEmail?: string;
  }) => void;
}

export type DriveSaveFormat = 'json' | 'pdf' | 'docx';

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  paper,
  onLoadPaperFromDrive,
  allowSaveCurrentPaper = true,
  initialFormat,
  autoOpenShareAfterSave = false,
  onEmailShareLink,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const [saveFormat, setSaveFormat] = useState<DriveSaveFormat>(initialFormat || 'pdf');
  const [customFilename, setCustomFilename] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedFile, setLastSavedFile] = useState<DriveFileItem | null>(null);

  const [pendingOverwriteFile, setPendingOverwriteFile] = useState<DriveFileItem | null>(null);
  const [pendingOverwriteOpenShareAfter, setPendingOverwriteOpenShareAfter] = useState(false);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  // Share dialog state (always requires explicit confirmation before altering permissions)
  const [pendingShareFile, setPendingShareFile] = useState<DriveFileItem | null>(null);
  const [shareType, setShareType] = useState<'anyone' | 'user'>('anyone');
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [sharedResult, setSharedResult] = useState<{
    file: DriveFileItem;
    link: string;
    sharedWithEmail?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const baseName = getSanitizedBaseFilename(paper);
  const defaultFilenameForFormat = (fmt: DriveSaveFormat) => `${baseName}_Exam_Paper.${fmt}`;

  const refreshFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const list = await listDriveFiles();
      setFiles(list);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('sign in')) {
        setToken(null);
      }
      setErrorMessage(err.message || 'Could not load Google Drive files.');
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const fmt = initialFormat || (autoOpenShareAfterSave ? 'pdf' : 'json');
    setSaveFormat(fmt);
    setCustomFilename(defaultFilenameForFormat(fmt));
    setPendingOverwriteFile(null);
    setPendingOverwriteOpenShareAfter(false);
    setPendingDeleteFile(null);
    setPendingShareFile(null);
    setSharedResult(null);
    setLastSavedFile(null);
    setShareEmail('');
    setShareType('anyone');
    setCopiedLink(false);
    setSuccessMessage(null);
    setErrorMessage(null);

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
      if (t) {
        setToken(t);
        setUser(getCurrentUser());
        refreshFiles();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, initialFormat, autoOpenShareAfterSave]);

  useEffect(() => {
    if (!isOpen) return;
    setCustomFilename(defaultFilenameForFormat(saveFormat));
  }, [saveFormat, baseName, isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await refreshFiles();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setFiles([]);
    setPendingDeleteFile(null);
    setPendingOverwriteFile(null);
    setPendingShareFile(null);
    setSharedResult(null);
  };

  const executeSave = async (existingFileId?: string, openShareDialogAfter = false) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingOverwriteFile(null);
    setSharedResult(null);

    const rawName = (customFilename || defaultFilenameForFormat(saveFormat)).trim();
    const expectedExt = `.${saveFormat}`;
    const finalName = rawName.toLowerCase().endsWith(expectedExt)
      ? rawName
      : `${rawName}${expectedExt}`;

    try {
      let saved: DriveFileItem;
      if (saveFormat === 'json') {
        saved = await savePaperJsonToDrive(paper, finalName, existingFileId);
      } else if (saveFormat === 'docx') {
        const { blob } = await buildPaperWordBlob(paper);
        saved = await uploadFileToDrive({
          name: finalName,
          blob,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          description: `Exam Paper Maker Word Document: ${paper.header.subjectTitle || paper.title}`,
          existingFileId,
        });
      } else {
        const { blob } = await generatePaperPDFBlob(paper);
        saved = await uploadFileToDrive({
          name: finalName,
          blob,
          mimeType: 'application/pdf',
          description: `Exam Paper Maker PDF: ${paper.header.subjectTitle || paper.title}`,
          existingFileId,
        });
      }

      setLastSavedFile(saved);
      setSuccessMessage(
        existingFileId
          ? `Updated "${saved.name}" in Google Drive.`
          : `Saved "${saved.name}" to Google Drive.`
      );
      if (openShareDialogAfter || autoOpenShareAfterSave) {
        setPendingShareFile(saved);
      }
      await refreshFiles();
    } catch (err: any) {
      if (err.message?.includes('401')) {
        setToken(null);
        setErrorMessage('Session expired. Please sign in again.');
      } else {
        setErrorMessage(err.message || 'Failed to save file to Google Drive.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = (openShareAfter = false) => {
    const rawName = (customFilename || defaultFilenameForFormat(saveFormat)).trim();
    const expectedExt = `.${saveFormat}`;
    const finalName = rawName.toLowerCase().endsWith(expectedExt)
      ? rawName
      : `${rawName}${expectedExt}`;

    const duplicate = files.find((f) => f.name.toLowerCase() === finalName.toLowerCase());
    if (duplicate) {
      setPendingOverwriteFile(duplicate);
      setPendingOverwriteOpenShareAfter(openShareAfter || autoOpenShareAfterSave);
      return;
    }
    executeSave(undefined, openShareAfter);
  };

  const handleConfirmShare = async () => {
    if (!pendingShareFile) return;
    if (shareType === 'user' && !shareEmail.trim()) {
      setErrorMessage('Please enter the recipient email address to share this file with.');
      return;
    }

    setIsSharing(true);
    setErrorMessage(null);
    try {
      const updatedFile = await shareDriveFile({
        fileId: pendingShareFile.id,
        shareType,
        emailAddress: shareType === 'user' ? shareEmail.trim() : undefined,
        role: 'reader',
      });

      const link =
        updatedFile.webViewLink ||
        pendingShareFile.webViewLink ||
        `https://drive.google.com/file/d/${encodeURIComponent(pendingShareFile.id)}/view`;

      setSharedResult({
        file: updatedFile,
        link,
        sharedWithEmail: shareType === 'user' ? shareEmail.trim() : undefined,
      });
      setSuccessMessage(
        shareType === 'anyone'
          ? `Link sharing enabled for "${updatedFile.name}" (anyone with link can view).`
          : `Shared "${updatedFile.name}" with ${shareEmail.trim()}.`
      );
      setPendingShareFile(null);
      await refreshFiles();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create Google Drive share link.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareLink = (link: string) => {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch(() => {
        setErrorMessage('Could not copy to clipboard automatically. Please copy the URL manually.');
      });
  };

  const handleOpenJson = async (file: DriveFileItem) => {
    setOpeningFileId(file.id);
    setErrorMessage(null);
    try {
      const loaded = await loadPaperJsonFromDrive(file.id);
      onLoadPaperFromDrive(loaded, file.name);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to open exam paper from Google Drive.');
    } finally {
      setOpeningFileId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteFile) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteDriveFile(pendingDeleteFile.id);
      setSuccessMessage(`Deleted "${pendingDeleteFile.name}" from Google Drive.`);
      setPendingDeleteFile(null);
      await refreshFiles();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isJsonFile = (file: DriveFileItem) =>
    file.mimeType === 'application/json' || file.name.toLowerCase().endsWith('.json');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150 text-neutral-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-neutral-900 dark:text-white" />
            <div>
              <h3 className="font-semibold text-sm">Google Drive Storage &amp; Link Sharing</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Upload exam papers, generate shareable links, or re-open saved files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white p-1 rounded-lg dark:hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg flex items-start gap-2.5 text-neutral-800 dark:text-neutral-200">
              <AlertCircle className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
              <div className="text-[11px] text-neutral-700 dark:text-neutral-300">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg flex items-center justify-between gap-2 text-neutral-900 dark:text-white">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-white shrink-0" />
                <span className="text-[11px]">{successMessage}</span>
              </div>
              {lastSavedFile && !sharedResult && !pendingShareFile && (
                <button
                  type="button"
                  onClick={() => setPendingShareFile(lastSavedFile)}
                  className="px-2.5 py-1 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold rounded-md text-[11px] dark:hover:bg-neutral-200 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share Link</span>
                </button>
              )}
            </div>
          )}

          {!token ? (
            <div className="py-8 text-center space-y-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950 p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-200/80 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center mx-auto">
                <HardDrive className="w-5 h-5 text-neutral-900 dark:text-white" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">Connect Google Drive</h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Sign in with Google to save PDF, Word, and editable paper files to your Google Drive, share links with others, or open saved papers back into the editor.
                </p>
              </div>
              <div className="flex justify-center">
                <GoogleSignInButton
                  onClick={handleSignIn}
                  disabled={isLoadingAuth}
                  label={isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Account Strip */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black font-bold flex items-center justify-center text-[10px]">
                    {user?.displayName ? user.displayName[0] : 'G'}
                  </div>
                  <div className="text-[11px] text-neutral-700 dark:text-neutral-300">
                    {user?.email || 'Connected Google Account'}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Switch Account</span>
                </button>
              </div>

              {/* Shareable Link Result Card */}
              {sharedResult && (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-white/30 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Link2 className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white text-xs">
                          Shareable Drive Link Ready — {sharedResult.file.name}
                        </p>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                          {sharedResult.sharedWithEmail
                            ? `Shared (Viewer) with ${sharedResult.sharedWithEmail}`
                            : 'Anyone with this link can view the uploaded exam paper.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSharedResult(null)}
                      className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={sharedResult.link}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-3 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-lg text-[11px] font-mono text-neutral-800 dark:text-neutral-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyShareLink(sharedResult.link)}
                      className="px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold rounded-lg text-[11px] dark:hover:bg-neutral-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={sharedResult.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Google Drive</span>
                    </a>

                    {onEmailShareLink && (
                      <button
                        type="button"
                        onClick={() => {
                          onEmailShareLink({
                            shareLink: sharedResult.link,
                            fileName: sharedResult.file.name,
                            recipientEmail: sharedResult.sharedWithEmail,
                          });
                        }}
                        className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-950 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Link via Gmail</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Explicit Share Permission Confirmation Dialog */}
              {pendingShareFile && (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-white/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Share2 className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white text-xs">
                        Confirm Sharing Permissions for &quot;{pendingShareFile.name}&quot;
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                        Choose who can view this file in Google Drive before generating the link.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShareType('anyone')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        shareType === 'anyone'
                          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500 dark:bg-black dark:text-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">Anyone with link (Viewer)</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          shareType === 'anyone' ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-500'
                        }`}
                      >
                        Creates a public read-only Drive link you can send anywhere
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareType('user')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        shareType === 'user'
                          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500 dark:bg-black dark:text-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">Specific person (Viewer)</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          shareType === 'user' ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-500'
                        }`}
                      >
                        Grants read access only to a specific email address
                      </div>
                    </button>
                  </div>

                  {shareType === 'user' && (
                    <div>
                      <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
                        Recipient Google Email Address *
                      </label>
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="recipient@school.edu"
                        className="w-full px-3 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingShareFile(null)}
                      disabled={isSharing}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 rounded-lg text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmShare}
                      disabled={isSharing}
                      className="px-3.5 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold dark:hover:bg-neutral-200 rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSharing && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Confirm &amp; Generate Link</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Explicit Overwrite Confirmation Dialog */}
              {pendingOverwriteFile && (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-white/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white text-xs">
                        Overwrite existing file &quot;{pendingOverwriteFile.name}&quot;?
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                        A file with this name already exists in your Google Drive. Confirm to replace its contents, or save as a separate new copy.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingOverwriteFile(null);
                        setPendingOverwriteOpenShareAfter(false);
                      }}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 rounded-lg text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => executeSave(undefined, pendingOverwriteOpenShareAfter)}
                      className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-white rounded-lg text-[11px] cursor-pointer"
                    >
                      Save as New Copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        executeSave(pendingOverwriteFile.id, pendingOverwriteOpenShareAfter)
                      }
                      className="px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold dark:hover:bg-neutral-200 rounded-lg text-[11px] cursor-pointer"
                    >
                      Confirm Overwrite
                    </button>
                  </div>
                </div>
              )}

              {/* Explicit Delete Confirmation Dialog */}
              {pendingDeleteFile && (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-white/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Trash2 className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white text-xs">
                        Delete &quot;{pendingDeleteFile.name}&quot; from Google Drive?
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                        This action permanently deletes the file from your Google Drive and cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingDeleteFile(null)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 rounded-lg text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold dark:hover:bg-neutral-200 rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Confirm Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Save Current Paper to Drive */}
              {allowSaveCurrentPaper && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white text-xs">
                        Upload Current Exam Paper to Google Drive
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {paper.header.subjectTitle || paper.title} • {paper.sections.length} sections
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'pdf', label: 'A4 PDF (.pdf)' },
                        { id: 'docx', label: 'Word Doc (.docx)' },
                        { id: 'json', label: 'Editable Paper (.json)' },
                      ] as const
                    ).map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setSaveFormat(fmt.id)}
                        className={`px-2.5 py-2 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                          saveFormat === fmt.id
                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500 dark:bg-black dark:text-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder={defaultFilenameForFormat(saveFormat)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-500"
                    />
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSaveClick(false)}
                        disabled={isSaving}
                        className="px-3.5 py-2 bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white font-semibold rounded-lg text-xs dark:hover:bg-neutral-800 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Upload Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveClick(true)}
                        disabled={isSaving}
                        className="px-3.5 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold rounded-lg text-xs dark:hover:bg-neutral-200 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span>Upload &amp; Share Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved Drive Files List */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <span className="font-semibold text-xs text-neutral-900 dark:text-white">
                    App Files in Google Drive ({files.length})
                  </span>
                  <button
                    type="button"
                    onClick={refreshFiles}
                    disabled={isLoadingFiles}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`}
                    />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoadingFiles && files.length === 0 ? (
                  <div className="p-6 text-center text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading files from Google Drive...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-6 text-center text-neutral-500 text-[11px]">
                    No files saved by Exam Paper Maker in your Google Drive yet.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80 max-h-64 overflow-y-auto">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isJsonFile(file) ? (
                            <FileJson className="w-4 h-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                              <span className="truncate">{file.name}</span>
                              {file.shared && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 shrink-0">
                                  Shared
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              {file.modifiedTime
                                ? `Modified ${new Date(file.modifiedTime).toLocaleString()}`
                                : file.mimeType}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isJsonFile(file) && (
                            <button
                              type="button"
                              onClick={() => handleOpenJson(file)}
                              disabled={openingFileId === file.id}
                              className="px-2.5 py-1 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold rounded-md text-[11px] dark:hover:bg-neutral-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {openingFileId === file.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <FolderOpen className="w-3 h-3" />
                              )}
                              <span>Open</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingShareFile(file)}
                            className="px-2 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-white rounded-md text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Share & get link"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Share Link</span>
                          </button>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white rounded-md dark:hover:bg-neutral-800 transition"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingDeleteFile(file)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 dark:hover:text-white rounded-md dark:hover:bg-neutral-800 transition cursor-pointer"
                            title="Delete from Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-300 text-xs rounded-lg dark:hover:bg-neutral-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
