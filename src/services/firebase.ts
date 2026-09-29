import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
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
import { ExamPaper, SubjectTemplate, CurriculumSubjectRecord } from '../types/exam';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
/* CRITICAL: The app will break without this line */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

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

// Authentication Listeners
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// ================= Firestore CRUD Operations =================

// 1. Save or Update Exam Paper
export async function saveExamPaperToFirestore(paper: ExamPaper): Promise<void> {
  const user = auth.currentUser;
  const path = `exam_papers/${paper.id}`;
  const payload = {
    ...paper,
    userId: user?.uid || 'guest',
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'exam_papers', paper.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 2. Fetch User's Exam Papers (Loads user papers or all available public/guest papers)
export async function loadExamPapersFromFirestore(): Promise<ExamPaper[]> {
  const user = auth.currentUser;
  const path = 'exam_papers';

  try {
    let snapshot;
    if (user) {
      // Query papers matching user ID
      const q = query(collection(db, path), where('userId', '==', user.uid));
      snapshot = await getDocs(q);
      // Also get guest/public papers if user has none
      if (snapshot.empty) {
        snapshot = await getDocs(collection(db, path));
      }
    } else {
      // Unauthenticated / guest: load papers collection
      snapshot = await getDocs(collection(db, path));
    }

    const papers: ExamPaper[] = [];
    snapshot.forEach((d) => {
      papers.push(d.data() as ExamPaper);
    });
    return papers;
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
  const payload = {
    ...template,
    userId: user?.uid || 'guest',
    createdAt: new Date().toISOString(),
  };

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
    let snapshot;
    if (user) {
      const q = query(collection(db, path), where('userId', '==', user.uid));
      snapshot = await getDocs(q);
      if (snapshot.empty) {
        snapshot = await getDocs(collection(db, path));
      }
    } else {
      snapshot = await getDocs(collection(db, path));
    }

    const templates: SubjectTemplate[] = [];
    snapshot.forEach((d) => {
      templates.push(d.data() as SubjectTemplate);
    });
    return templates;
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
  const payload = {
    ...subject,
    userId: user?.uid || 'guest',
    updatedAt: new Date().toISOString(),
  };

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

// 9. Delete Curriculum Subject Record
export async function deleteCurriculumSubjectFromFirestore(subjectId: string): Promise<void> {
  const path = `curriculum_subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'curriculum_subjects', subjectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

