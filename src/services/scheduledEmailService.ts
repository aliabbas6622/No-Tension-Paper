import {
  ExamPaper,
  ScheduledEmailJob,
  EmailAttachmentFormat,
} from '../types/exam';
import { getAccessToken, getCurrentUser } from './auth';
import { sendEmailViaGmail, GmailAttachment } from './gmailService';
import { buildPaperWordBlob } from './wordExport';
import { generatePaperPDFBlob } from './pdfExport';
import { formatPaperAsPlainText, getSanitizedBaseFilename } from './paperText';
import {
  saveScheduledEmailToFirestore,
  loadScheduledEmailsFromFirestore,
  deleteScheduledEmailFromFirestore,
} from './firebase';

const SCHEDULED_EMAILS_KEY = 'exam_maker_scheduled_emails_v1';

export function getScheduledEmails(): ScheduledEmailJob[] {
  try {
    const raw = localStorage.getItem(SCHEDULED_EMAILS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );
  } catch {
    return [];
  }
}

function saveScheduledEmailsLocal(jobs: ScheduledEmailJob[]): void {
  try {
    localStorage.setItem(SCHEDULED_EMAILS_KEY, JSON.stringify(jobs));
  } catch (e) {
    console.warn('Could not persist scheduled emails locally:', e);
  }
}

function upsertScheduledEmailLocal(job: ScheduledEmailJob): ScheduledEmailJob[] {
  const current = getScheduledEmails();
  const idx = current.findIndex((j) => j.id === job.id);
  const next = idx >= 0 ? [...current] : [job, ...current];
  if (idx >= 0) {
    next[idx] = job;
  }
  const sorted = next.sort(
    (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
  );
  saveScheduledEmailsLocal(sorted);
  return sorted;
}

export async function syncScheduledEmailsFromFirestore(): Promise<ScheduledEmailJob[]> {
  try {
    const remote = await loadScheduledEmailsFromFirestore();
    if (remote.length === 0) return getScheduledEmails();
    const map = new Map<string, ScheduledEmailJob>();
    getScheduledEmails().forEach((j) => map.set(j.id, j));
    remote.forEach((j) => {
      const existing = map.get(j.id);
      if (!existing || new Date(j.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
        map.set(j.id, j);
      }
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );
    saveScheduledEmailsLocal(merged);
    return merged;
  } catch (e) {
    console.warn('Scheduled emails Firestore sync notice:', e);
    return getScheduledEmails();
  }
}

export async function createScheduledEmailJob(params: {
  paper: ExamPaper;
  to: string;
  cc?: string;
  subject: string;
  messageBody: string;
  includePaperText: boolean;
  attachmentFormat: EmailAttachmentFormat;
  driveShareLink?: string;
  scheduledForIso: string;
}): Promise<ScheduledEmailJob> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Please sign in with Google before scheduling an email.');
  }

  const now = new Date().toISOString();
  const job: ScheduledEmailJob = {
    id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user.uid,
    senderEmail: user.email || undefined,
    to: params.to.trim(),
    cc: params.cc?.trim() || undefined,
    subject: params.subject.trim() || 'Examination Paper',
    messageBody: params.messageBody.trim(),
    includePaperText: params.includePaperText,
    attachmentFormat: params.attachmentFormat,
    driveShareLink: params.driveShareLink?.trim() || undefined,
    scheduledFor: params.scheduledForIso,
    status: 'pending',
    paperId: params.paper.id,
    paperTitle: params.paper.header.subjectTitle || params.paper.title || 'Examination Paper',
    paperSnapshot: JSON.parse(JSON.stringify(params.paper)),
    createdAt: now,
    updatedAt: now,
  };

  upsertScheduledEmailLocal(job);
  try {
    await saveScheduledEmailToFirestore(job);
  } catch (e) {
    console.warn('Could not save scheduled email to Firestore:', e);
  }
  return job;
}

export async function cancelScheduledEmailJob(jobId: string): Promise<ScheduledEmailJob | null> {
  const current = getScheduledEmails();
  const target = current.find((j) => j.id === jobId);
  if (!target) return null;

  const updated: ScheduledEmailJob = {
    ...target,
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  };
  upsertScheduledEmailLocal(updated);
  try {
    await saveScheduledEmailToFirestore(updated);
  } catch (e) {
    console.warn('Could not update cancelled status in Firestore:', e);
  }
  return updated;
}

export async function deleteScheduledEmailJob(jobId: string): Promise<void> {
  const remaining = getScheduledEmails().filter((j) => j.id !== jobId);
  saveScheduledEmailsLocal(remaining);
  try {
    await deleteScheduledEmailFromFirestore(jobId);
  } catch (e) {
    console.warn('Could not delete scheduled email from Firestore:', e);
  }
}

export async function buildAttachmentForPaper(
  paper: ExamPaper,
  format: EmailAttachmentFormat
): Promise<GmailAttachment | null> {
  if (format === 'none') return null;

  if (format === 'pdf') {
    const { blob, filename } = await generatePaperPDFBlob(paper);
    return { filename, mimeType: 'application/pdf', blob };
  }

  if (format === 'docx') {
    const { blob, filename } = await buildPaperWordBlob(paper);
    return {
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      blob,
    };
  }

  const filename = `${getSanitizedBaseFilename(paper)}_Exam_Paper.json`;
  const blob = new Blob([JSON.stringify(paper, null, 2)], { type: 'application/json' });
  return { filename, mimeType: 'application/json', blob };
}

export async function deliverScheduledEmailJob(job: ScheduledEmailJob): Promise<{
  job: ScheduledEmailJob;
  needsAuth?: boolean;
}> {
  const token = await getAccessToken();
  if (!token) {
    return { job, needsAuth: true };
  }

  const sendingJob: ScheduledEmailJob = {
    ...job,
    status: 'sending',
    updatedAt: new Date().toISOString(),
  };
  upsertScheduledEmailLocal(sendingJob);

  try {
    const attachment = await buildAttachmentForPaper(job.paperSnapshot, job.attachmentFormat);

    let body = job.messageBody;
    if (job.driveShareLink && !body.includes(job.driveShareLink)) {
      body += `\n\nGoogle Drive Link:\n${job.driveShareLink}`;
    }
    if (job.includePaperText) {
      body += `\n\n============================================================\n${formatPaperAsPlainText(
        job.paperSnapshot
      )}`;
    }

    const result = await sendEmailViaGmail({
      to: job.to,
      cc: job.cc,
      subject: job.subject,
      textBody: body,
      attachment,
    });

    const sentJob: ScheduledEmailJob = {
      ...sendingJob,
      status: 'sent',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      gmailMessageId: result.id,
      errorMessage: undefined,
    };
    upsertScheduledEmailLocal(sentJob);
    try {
      await saveScheduledEmailToFirestore(sentJob);
    } catch (e) {
      console.warn('Could not persist sent status to Firestore:', e);
    }
    return { job: sentJob };
  } catch (err: any) {
    const failedJob: ScheduledEmailJob = {
      ...sendingJob,
      status: 'failed',
      updatedAt: new Date().toISOString(),
      errorMessage: err?.message || 'Failed to deliver scheduled email.',
    };
    upsertScheduledEmailLocal(failedJob);
    try {
      await saveScheduledEmailToFirestore(failedJob);
    } catch (e) {
      console.warn('Could not persist failed status to Firestore:', e);
    }
    return { job: failedJob };
  }
}
