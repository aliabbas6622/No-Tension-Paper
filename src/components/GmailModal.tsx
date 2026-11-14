import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  ExamPaper,
  EmailAttachmentFormat,
  ScheduledEmailJob,
} from '../types/exam';
import { initAuth, googleSignIn, getAccessToken, getCurrentUser, logout } from '../services/auth';
import { sendEmailViaGmail } from '../services/gmailService';
import {
  buildAttachmentForPaper,
  createScheduledEmailJob,
  cancelScheduledEmailJob,
  deleteScheduledEmailJob,
  deliverScheduledEmailJob,
  getScheduledEmails,
  syncScheduledEmailsFromFirestore,
} from '../services/scheduledEmailService';
import {
  formatPaperAsPlainText,
  getCleanSubjectName,
  getSanitizedBaseFilename,
} from '../services/paperText';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Paperclip,
  Clock,
  Calendar,
  Trash2,
  Ban,
  Link2,
} from 'lucide-react';

interface GmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ExamPaper;
  initialTo?: string;
  initialDriveShareLink?: string;
  initialTab?: 'compose' | 'scheduled';
  initialDeliveryMode?: 'now' | 'schedule';
  onScheduledListChanged?: () => void;
}

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export const GmailModal: React.FC<GmailModalProps> = ({
  isOpen,
  onClose,
  paper,
  initialTo,
  initialDriveShareLink,
  initialTab,
  initialDeliveryMode,
  onScheduledListChanged,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const [activeTab, setActiveTab] = useState<'compose' | 'scheduled'>('compose');
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'schedule'>('now');

  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [driveShareLink, setDriveShareLink] = useState('');
  const [includePaperText, setIncludePaperText] = useState(true);
  const [attachmentFormat, setAttachmentFormat] = useState<EmailAttachmentFormat>('docx');
  const [scheduledDateTime, setScheduledDateTime] = useState(() =>
    toLocalDatetimeInputValue(new Date(Date.now() + 15 * 60 * 1000))
  );

  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scheduled queue state
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledEmailJob[]>(() =>
    getScheduledEmails()
  );
  const [pendingQueueAction, setPendingQueueAction] = useState<{
    type: 'send_now' | 'cancel' | 'delete';
    job: ScheduledEmailJob;
  } | null>(null);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);

  const refreshQueue = async () => {
    setScheduledJobs(getScheduledEmails());
    const synced = await syncScheduledEmailsFromFirestore();
    setScheduledJobs(synced);
    onScheduledListChanged?.();
  };

  useEffect(() => {
    if (!isOpen) return;

    const cleanSubject = getCleanSubjectName(paper);
    setSubject(`${cleanSubject} - ${paper.header.examinationTitle || 'Examination Paper'}`);

    const linkLine = initialDriveShareLink
      ? `\n\nGoogle Drive Link:\n${initialDriveShareLink}`
      : '';

    setMessageBody(
      `Hello,\n\nPlease find the examination paper for ${cleanSubject} (${paper.header.examinationTitle}).\n\nDate: ${
        paper.header.date || 'TBD'
      }\nDuration: ${paper.header.duration || 'TBD'}\nMax. Marks: ${
        paper.header.maxMarks || 'TBD'
      }${linkLine}\n\nBest regards`
    );

    if (initialTo !== undefined) {
      setToEmail(initialTo);
    }
    setDriveShareLink(initialDriveShareLink || '');
    setActiveTab(initialTab || 'compose');
    setDeliveryMode(initialDeliveryMode || 'now');
    setScheduledDateTime(toLocalDatetimeInputValue(new Date(Date.now() + 15 * 60 * 1000)));
    setIsConfirmingAction(false);
    setSuccessBanner(null);
    setErrorMessage(null);
    setPendingQueueAction(null);

    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        refreshQueue();
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
      }
      refreshQueue();
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, paper, initialTo, initialDriveShareLink, initialTab, initialDeliveryMode]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await refreshQueue();
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
    setSuccessBanner(null);
    setIsConfirmingAction(false);
  };

  const expectedAttachmentFilename = () => {
    if (attachmentFormat === 'none') return null;
    return `${getSanitizedBaseFilename(paper)}_Exam_Paper.${attachmentFormat}`;
  };

  const applySchedulePreset = (targetDate: Date) => {
    setScheduledDateTime(toLocalDatetimeInputValue(targetDate));
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!toEmail.trim()) {
      setErrorMessage('Please enter at least one recipient email address.');
      return;
    }

    if (deliveryMode === 'schedule') {
      const parsed = new Date(scheduledDateTime);
      if (Number.isNaN(parsed.getTime())) {
        setErrorMessage('Please select a valid date and time for scheduled delivery.');
        return;
      }
      if (parsed.getTime() <= Date.now() + 10_000) {
        setErrorMessage('Scheduled time must be in the future (at least 1 minute from now).');
        return;
      }
    }

    setIsConfirmingAction(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (deliveryMode === 'schedule') {
        const scheduledIso = new Date(scheduledDateTime).toISOString();
        const created = await createScheduledEmailJob({
          paper,
          to: toEmail,
          cc: ccEmail,
          subject,
          messageBody,
          includePaperText,
          attachmentFormat,
          driveShareLink: driveShareLink.trim() || undefined,
          scheduledForIso: scheduledIso,
        });

        await refreshQueue();
        setIsConfirmingAction(false);
        setSuccessBanner({
          title: 'Email Scheduled via Gmail',
          detail: `Scheduled to ${created.to} for ${new Date(created.scheduledFor).toLocaleString()}. Keep the app open (or return with Gmail connected) when due to dispatch automatically.`,
        });
      } else {
        const attachment = await buildAttachmentForPaper(paper, attachmentFormat);
        let body = messageBody.trim();
        if (driveShareLink.trim() && !body.includes(driveShareLink.trim())) {
          body += `\n\nGoogle Drive Link:\n${driveShareLink.trim()}`;
        }
        const fullTextBody = includePaperText
          ? `${body}\n\n============================================================\n${formatPaperAsPlainText(
              paper
            )}`
          : body;

        await sendEmailViaGmail({
          to: toEmail,
          cc: ccEmail,
          subject,
          textBody: fullTextBody,
          attachment,
        });

        setIsConfirmingAction(false);
        setSuccessBanner({
          title: 'Email Sent via Gmail',
          detail: `Your exam paper email was sent to ${toEmail}.`,
        });
      }
    } catch (err: any) {
      if (err.message?.includes('401')) {
        setToken(null);
        setErrorMessage('Session expired. Please sign in again.');
      } else {
        setErrorMessage(err.message || 'Failed to process Gmail request.');
      }
      setIsConfirmingAction(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmQueueAction = async () => {
    if (!pendingQueueAction) return;
    const { type, job } = pendingQueueAction;
    setProcessingJobId(job.id);
    setErrorMessage(null);

    try {
      if (type === 'send_now') {
        const { job: resultJob, needsAuth } = await deliverScheduledEmailJob(job);
        if (needsAuth) {
          setToken(null);
          setErrorMessage('Please sign in with Google to send this due email now.');
        } else if (resultJob.status === 'failed') {
          setErrorMessage(resultJob.errorMessage || 'Failed to deliver email.');
        }
      } else if (type === 'cancel') {
        await cancelScheduledEmailJob(job.id);
      } else if (type === 'delete') {
        await deleteScheduledEmailJob(job.id);
      }
      setPendingQueueAction(null);
      await refreshQueue();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update scheduled email.');
    } finally {
      setProcessingJobId(null);
    }
  };

  const pendingCount = scheduledJobs.filter((j) => j.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-black border border-neutral-800 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-white" />
            <div>
              <h3 className="font-semibold text-sm">Gmail Delivery &amp; Scheduler</h3>
              <p className="text-[11px] text-neutral-400">
                Send exam papers now or schedule automated Gmail delivery
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

        {/* Sub-Tabs */}
        <div className="px-5 py-2.5 border-b border-neutral-800 bg-black flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('compose');
              setPendingQueueAction(null);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'compose'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>Compose Email</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('scheduled');
              refreshQueue();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scheduled'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Scheduled Queue ({pendingCount})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-neutral-900 border border-neutral-700 rounded-lg flex items-start gap-2.5 text-neutral-200">
              <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div className="text-[11px] text-neutral-300">{errorMessage}</div>
            </div>
          )}

          {activeTab === 'scheduled' ? (
            <div className="space-y-3">
              {!token && (
                <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-[11px] text-neutral-300">
                    Connect Gmail to dispatch pending scheduled emails automatically.
                  </div>
                  <GoogleSignInButton
                    onClick={handleSignIn}
                    disabled={isLoadingAuth}
                    label={isLoadingAuth ? 'Connecting...' : 'Sign in'}
                  />
                </div>
              )}

              {pendingQueueAction && (
                <div className="p-4 bg-neutral-900 border border-white/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-xs">
                        {pendingQueueAction.type === 'send_now'
                          ? `Send "${pendingQueueAction.job.subject}" immediately?`
                          : pendingQueueAction.type === 'cancel'
                          ? `Cancel scheduled delivery for "${pendingQueueAction.job.subject}"?`
                          : `Delete "${pendingQueueAction.job.subject}" from history?`}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Recipient: {pendingQueueAction.job.to} • Scheduled:{' '}
                        {new Date(pendingQueueAction.job.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingQueueAction(null)}
                      disabled={Boolean(processingJobId)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmQueueAction}
                      disabled={Boolean(processingJobId)}
                      className="px-3.5 py-1.5 bg-white text-black font-semibold hover:bg-neutral-200 rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {processingJobId && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>
                        {pendingQueueAction.type === 'send_now'
                          ? 'Confirm Send Now'
                          : pendingQueueAction.type === 'cancel'
                          ? 'Confirm Cancel'
                          : 'Confirm Delete'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {scheduledJobs.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-neutral-800 rounded-xl space-y-2">
                  <Clock className="w-6 h-6 text-neutral-600 mx-auto" />
                  <div className="font-medium text-neutral-300">No Scheduled Emails</div>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                    Switch to &quot;Compose Email&quot; and select &quot;Schedule Send&quot; to schedule an exam paper delivery.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scheduledJobs.map((job) => {
                    const isOverdue =
                      job.status === 'pending' && new Date(job.scheduledFor).getTime() <= Date.now();
                    return (
                      <div
                        key={job.id}
                        className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{job.subject}</div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              To: <span className="text-neutral-200">{job.to}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase shrink-0 ${
                              job.status === 'sent'
                                ? 'bg-white text-black font-bold'
                                : job.status === 'failed'
                                ? 'bg-neutral-800 text-white border border-neutral-600'
                                : job.status === 'cancelled'
                                ? 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                                : 'bg-neutral-900 text-white border border-neutral-700'
                            }`}
                          >
                            {isOverdue ? 'Due Now' : job.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(job.scheduledFor).toLocaleString()}
                          </span>
                          <span>Attachment: {job.attachmentFormat.toUpperCase()}</span>
                          {job.driveShareLink && <span>Includes Drive Link</span>}
                        </div>

                        {job.errorMessage && (
                          <div className="text-[10px] text-neutral-300 bg-neutral-900 border border-neutral-800 rounded p-1.5">
                            Notice: {job.errorMessage}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-900">
                          {(job.status === 'pending' || job.status === 'failed') && (
                            <button
                              type="button"
                              onClick={() => setPendingQueueAction({ type: 'send_now', job })}
                              className="px-2.5 py-1 bg-white text-black font-semibold rounded-md text-[11px] hover:bg-neutral-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send Now</span>
                            </button>
                          )}
                          {job.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setPendingQueueAction({ type: 'cancel', job })}
                              className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white rounded-md text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingQueueAction({ type: 'delete', job })}
                            className="p-1.5 text-neutral-500 hover:text-white rounded-md hover:bg-neutral-900 cursor-pointer"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : successBanner ? (
            <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-xl text-center space-y-3">
              <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 text-black" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">{successBanner.title}</h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  {successBanner.detail}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessBanner(null);
                    setToEmail('');
                    setCcEmail('');
                  }}
                  className="px-4 py-2 bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-white rounded-lg text-xs cursor-pointer"
                >
                  Compose Another
                </button>
                {deliveryMode === 'schedule' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessBanner(null);
                      setActiveTab('scheduled');
                    }}
                    className="px-4 py-2 bg-white text-black font-semibold hover:bg-neutral-200 rounded-lg text-xs cursor-pointer"
                  >
                    View Scheduled Queue
                  </button>
                )}
              </div>
            </div>
          ) : !token ? (
            <div className="py-8 text-center space-y-4 border border-neutral-800 rounded-xl bg-neutral-950 p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-semibold text-sm text-white">Connect Gmail</h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Sign in with Google with permission to send or schedule examination papers and attachments through your Gmail account.
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
          ) : isConfirmingAction ? (
            /* Mandatory Confirmation Dialog Step */
            <div className="p-4 bg-neutral-950 border border-white/30 rounded-xl space-y-4">
              <div className="flex items-start gap-2.5">
                {deliveryMode === 'schedule' ? (
                  <Clock className="w-4 h-4 text-white shrink-0 mt-0.5" />
                ) : (
                  <Send className="w-4 h-4 text-white shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-semibold text-white text-sm">
                    {deliveryMode === 'schedule' ? 'Confirm Scheduled Gmail Send' : 'Confirm Send Email'}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {deliveryMode === 'schedule'
                      ? 'Verify the scheduled delivery time, recipients, and attachment before queuing.'
                      : 'Please verify the recipient details and attachment before sending via Gmail.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black border border-neutral-800 rounded-lg space-y-1.5 text-[11px]">
                <div>
                  <span className="text-neutral-500">From: </span>
                  <span className="text-neutral-200">{user?.email || 'Your Gmail account'}</span>
                </div>
                <div>
                  <span className="text-neutral-500">To: </span>
                  <span className="text-white font-medium">{toEmail}</span>
                </div>
                {ccEmail.trim() && (
                  <div>
                    <span className="text-neutral-500">Cc: </span>
                    <span className="text-neutral-200">{ccEmail}</span>
                  </div>
                )}
                <div>
                  <span className="text-neutral-500">Subject: </span>
                  <span className="text-white">{subject}</span>
                </div>
                {deliveryMode === 'schedule' && (
                  <div>
                    <span className="text-neutral-500">Scheduled For: </span>
                    <span className="text-white font-semibold">
                      {new Date(scheduledDateTime).toLocaleString()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-neutral-500">Attachment: </span>
                  <span className="text-neutral-200">
                    {expectedAttachmentFilename() || 'None (email text only)'}
                  </span>
                </div>
                {driveShareLink.trim() && (
                  <div className="truncate">
                    <span className="text-neutral-500">Drive Link: </span>
                    <span className="text-neutral-200 font-mono">{driveShareLink.trim()}</span>
                  </div>
                )}
              </div>

              {deliveryMode === 'schedule' && (
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Note: Because Gmail OAuth access stays strictly in your browser session for security, scheduled deliveries run automatically while this app is open (or can be dispatched immediately from Scheduled Queue when you sign back in).
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingAction(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-lg text-xs cursor-pointer"
                >
                  Cancel &amp; Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-white text-black font-semibold hover:bg-neutral-200 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{deliveryMode === 'schedule' ? 'Scheduling...' : 'Sending...'}</span>
                    </>
                  ) : deliveryMode === 'schedule' ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Schedule Send</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              {/* Account Strip */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px]">
                    {user?.displayName ? user.displayName[0] : 'G'}
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    Sending as {user?.email || 'Google Account'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Switch</span>
                </button>
              </div>

              {/* Delivery Timing Mode */}
              <div className="space-y-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('now')}
                    className={`py-1.5 px-3 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      deliveryMode === 'now'
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    <span>Send Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('schedule')}
                    className={`py-1.5 px-3 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      deliveryMode === 'schedule'
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Schedule Send</span>
                  </button>
                </div>

                {deliveryMode === 'schedule' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[10px] text-neutral-400">
                      Delivery Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-black border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-white"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '+2 min', ms: 2 * 60 * 1000 },
                        { label: '+15 min', ms: 15 * 60 * 1000 },
                        { label: '+1 hour', ms: 60 * 60 * 1000 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            applySchedulePreset(new Date(Date.now() + preset.ms))
                          }
                          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-[10px] text-neutral-300 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          d.setHours(8, 0, 0, 0);
                          applySchedulePreset(d);
                        }}
                        className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-[10px] text-neutral-300 cursor-pointer"
                      >
                        Tomorrow 8:00 AM
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  To (comma-separated for multiple recipients) *
                </label>
                <input
                  type="text"
                  required
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="coordinator@school.edu, principal@school.edu"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Cc (optional)</label>
                  <input
                    type="text"
                    value={ccEmail}
                    onChange={(e) => setCcEmail(e.target.value)}
                    placeholder="department@school.edu"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    <span>Drive Share Link (optional)</span>
                  </label>
                  <input
                    type="url"
                    value={driveShareLink}
                    onChange={(e) => setDriveShareLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Paperclip className="w-3 h-3" />
                  <span>Attachment Format</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'docx', label: 'Word (.docx)' },
                      { id: 'pdf', label: 'PDF (.pdf)' },
                      { id: 'json', label: 'JSON (.json)' },
                      { id: 'none', label: 'None' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAttachmentFormat(opt.id)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                        attachmentFormat === opt.id
                          ? 'bg-white text-black border-white'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Message</label>
                <textarea
                  rows={4}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500 resize-y"
                />
              </div>

              <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePaperText}
                  onChange={(e) => setIncludePaperText(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-950"
                />
                <span>Include full formatted exam paper text in email body</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-white text-black font-semibold rounded-lg text-xs hover:bg-neutral-200 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {deliveryMode === 'schedule' ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Review &amp; Schedule Gmail Send</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Review &amp; Send Email</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-neutral-300 text-xs rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
