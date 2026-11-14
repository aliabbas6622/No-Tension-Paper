import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  auth,
  initAuth,
  googleSignIn,
  getAccessToken,
  getCurrentUser,
  logout,
} from './auth';
import {
  ExamPaper,
  SubjectTemplate,
  CurriculumSubjectRecord,
  CurriculumUnitItem,
  ScheduledEmailJob,
} from '../types/exam';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
/* CRITICAL: The app will break without this line */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export { auth, initAuth, googleSignIn, getAccessToken, getCurrentUser, logout };

// Test connection on boot as required by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is offline or configuring initial connection.');
    }
  }
}
testConnection();

// Standard Firestore Error Handling required by skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth helpers are re-exported from ./auth above to share a single in-memory token cache.

// ================= Firestore CRUD Operations =================

// 1. Save or Update Exam Paper
export async function saveExamPaperToFirestore(paper: ExamPaper): Promise<void> {
  const user = auth.currentUser;
  const path = `exam_papers/${paper.id}`;
  const payload = stripUndefinedDeep({
    ...paper,
    userId: user?.uid || 'guest',
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(db, 'exam_papers', paper.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 2. Fetch User's Exam Papers (Merges signed-in user's papers with guest/public papers)
export async function loadExamPapersFromFirestore(): Promise<ExamPaper[]> {
  const user = auth.currentUser;
  const path = 'exam_papers';

  try {
    if (user) {
      const [userSnap, guestSnap] = await Promise.all([
        getDocs(query(collection(db, path), where('userId', '==', user.uid))),
        getDocs(query(collection(db, path), where('userId', 'in', ['guest', 'public']))),
      ]);
      const byId = new Map<string, ExamPaper>();
      guestSnap.forEach((d) => {
        const data = d.data() as ExamPaper;
        byId.set(data.id || d.id, data);
      });
      userSnap.forEach((d) => {
        const data = d.data() as ExamPaper;
        byId.set(data.id || d.id, data);
      });
      return Array.from(byId.values());
    } else {
      const snapshot = await getDocs(collection(db, path));
      const papers: ExamPaper[] = [];
      snapshot.forEach((d) => {
        papers.push(d.data() as ExamPaper);
      });
      return papers;
    }
  } catch (err) {
    console.warn('Could not load papers from Firestore:', err);
    return [];
  }
}

// 3. Delete Exam Paper
export async function deleteExamPaperFromFirestore(paperId: string): Promise<void> {
  const path = `exam_papers/${paperId}`;
  try {
    await deleteDoc(doc(db, 'exam_papers', paperId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 4. Save Custom Subject Template
export async function saveTemplateToFirestore(template: SubjectTemplate): Promise<void> {
  const user = auth.currentUser;
  const path = `custom_templates/${template.id}`;
  const payload = stripUndefinedDeep({
    ...template,
    userId: user?.uid || 'guest',
    createdAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(db, 'custom_templates', template.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 5. Load Custom Subject Templates
export async function loadTemplatesFromFirestore(): Promise<SubjectTemplate[]> {
  const user = auth.currentUser;
  const path = 'custom_templates';

  try {
    if (user) {
      const [userSnap, guestSnap] = await Promise.all([
        getDocs(query(collection(db, path), where('userId', '==', user.uid))),
        getDocs(query(collection(db, path), where('userId', 'in', ['guest', 'public']))),
      ]);
      const byId = new Map<string, SubjectTemplate>();
      guestSnap.forEach((d) => {
        const data = d.data() as SubjectTemplate;
        byId.set(data.id || d.id, data);
      });
      userSnap.forEach((d) => {
        const data = d.data() as SubjectTemplate;
        byId.set(data.id || d.id, data);
      });
      return Array.from(byId.values());
    } else {
      const snapshot = await getDocs(collection(db, path));
      const templates: SubjectTemplate[] = [];
      snapshot.forEach((d) => {
        templates.push(d.data() as SubjectTemplate);
      });
      return templates;
    }
  } catch (err) {
    console.warn('Could not load templates from Firestore:', err);
    return [];
  }
}

// 6. Delete Custom Subject Template
export async function deleteTemplateFromFirestore(templateId: string): Promise<void> {
  const path = `custom_templates/${templateId}`;
  try {
    await deleteDoc(doc(db, 'custom_templates', templateId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 7. Save Curriculum Subject Record
export async function saveCurriculumSubjectToFirestore(
  subject: CurriculumSubjectRecord
): Promise<void> {
  const user = auth.currentUser;
  const path = `curriculum_subjects/${subject.id}`;
  const payload = stripUndefinedDeep({
    ...subject,
    userId: user?.uid || 'guest',
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(db, 'curriculum_subjects', subject.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 8. Load Curriculum Subject Records
export async function loadCurriculumSubjectsFromFirestore(): Promise<CurriculumSubjectRecord[]> {
  const path = 'curriculum_subjects';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: CurriculumSubjectRecord[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as CurriculumSubjectRecord);
    });
    return list;
  } catch (err) {
    console.warn('Could not load curriculum subjects from Firestore:', err);
    return [];
  }
}

// 9. Seed the bundled chapter-wise question banks
export interface SeedableQuestionBank {
  id: string;
  classGrade: string;
  subjectName: string;
  group: string;
  category: string;
  description?: string;
  curriculumAnswers: CurriculumUnitItem[];
}

export async function seedCurriculumSubjectsToFirestore(
  banks: SeedableQuestionBank[],
  options: { force?: boolean } = {}
): Promise<{ seeded: string[]; skipped: string[]; failed: string[] }> {
  const seeded: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  const user = auth.currentUser;

  for (const bank of banks) {
    try {
      if (!options.force) {
        const existing = await getDoc(doc(db, 'curriculum_subjects', bank.id));
        if (existing.exists()) {
          skipped.push(bank.id);
          continue;
        }
      }

      const now = new Date().toISOString();
      await setDoc(
        doc(db, 'curriculum_subjects', bank.id),
        stripUndefinedDeep({
          id: bank.id,
          userId: user?.uid || 'guest',
          classGrade: bank.classGrade,
          subjectName: bank.subjectName,
          group: bank.group,
          category: bank.category,
          description: bank.description || '',
          curriculumAnswers: bank.curriculumAnswers,
          updatedAt: now,
          ...(options.force ? {} : { createdAt: now }),
        }),
        { merge: true }
      );
      seeded.push(bank.id);
    } catch (err) {
      console.warn(`Could not seed question bank "${bank.id}":`, err);
      failed.push(bank.id);
    }
  }

  return { seeded, skipped, failed };
}

// 10. Delete Curriculum Subject Record
export async function deleteCurriculumSubjectFromFirestore(subjectId: string): Promise<void> {
  const path = `curriculum_subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'curriculum_subjects', subjectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 11. Scheduled Gmail Delivery Jobs (Owner-scoped in Firestore)
export async function saveScheduledEmailToFirestore(job: ScheduledEmailJob): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `scheduled_emails/${job.id}`;
  const payload = stripUndefinedDeep({
    ...job,
    userId: user.uid,
    updatedAt: new Date().toISOString(),
  });
  try {
    await setDoc(doc(db, 'scheduled_emails', job.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadScheduledEmailsFromFirestore(): Promise<ScheduledEmailJob[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = 'scheduled_emails';
  try {
    const q = query(collection(db, path), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const jobs: ScheduledEmailJob[] = [];
    snapshot.forEach((d) => {
      jobs.push(d.data() as ScheduledEmailJob);
    });
    return jobs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function deleteScheduledEmailFromFirestore(jobId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `scheduled_emails/${jobId}`;
  try {
    await deleteDoc(doc(db, 'scheduled_emails', jobId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

