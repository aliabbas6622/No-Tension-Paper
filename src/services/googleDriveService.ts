import { ExamPaper } from '../types/exam';
import { getAccessToken } from './auth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  description?: string;
  shared?: boolean;
}

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google first.');
  }
  return token;
}

export async function listDriveFiles(): Promise<DriveFileItem[]> {
  const token = await requireToken();
  const params = new URLSearchParams({
    q: 'trashed = false',
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,description,shared)',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
  });

  const res = await fetch(`${DRIVE_FILES_API}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `Google Drive API error (${res.status}): ${res.statusText}`
    );
  }

  const data = await res.json();
  return (data.files || []) as DriveFileItem[];
}

export async function uploadFileToDrive(params: {
  name: string;
  blob: Blob;
  mimeType: string;
  description?: string;
  existingFileId?: string;
}): Promise<DriveFileItem> {
  const token = await requireToken();
  const boundary = '-------ExamPaperDriveBoundary' + Date.now().toString(16);

  const metadata: Record<string, string> = {
    name: params.name,
    mimeType: params.mimeType,
  };
  if (params.description) {
    metadata.description = params.description;
  }

  const metaPart = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n--${boundary}\r\nContent-Type: ${params.mimeType}\r\n\r\n`
  );
  const contentBuffer = new Uint8Array(await params.blob.arrayBuffer());
  const closingPart = new TextEncoder().encode(`\r\n--${boundary}--`);

  const body = new Blob([metaPart, contentBuffer, closingPart], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const isUpdate = Boolean(params.existingFileId);
  const url = isUpdate
    ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(
        params.existingFileId!
      )}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,description,shared`
    : `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,description,shared`;

  const res = await fetch(url, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `Failed to save file to Google Drive (${res.status}).`
    );
  }

  return (await res.json()) as DriveFileItem;
}

export async function shareDriveFile(params: {
  fileId: string;
  shareType: 'anyone' | 'user';
  emailAddress?: string;
  role?: 'reader' | 'commenter' | 'writer';
}): Promise<DriveFileItem> {
  const token = await requireToken();
  const permissionBody: Record<string, string> = {
    role: params.role || 'reader',
    type: params.shareType,
  };

  if (params.shareType === 'user') {
    const email = (params.emailAddress || '').trim();
    if (!email) {
      throw new Error('Please enter a valid email address to share with.');
    }
    permissionBody.emailAddress = email;
  }

  const permUrl = new URL(
    `${DRIVE_FILES_API}/${encodeURIComponent(params.fileId)}/permissions`
  );
  if (params.shareType === 'user') {
    permUrl.searchParams.set('sendNotificationEmail', 'true');
  }

  const permRes = await fetch(permUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(permissionBody),
  });

  if (!permRes.ok) {
    const errData = await permRes.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `Failed to update Google Drive sharing permissions (${permRes.status}).`
    );
  }

  const metaRes = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(
      params.fileId
    )}?fields=id,name,mimeType,modifiedTime,size,webViewLink,description,shared`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!metaRes.ok) {
    return {
      id: params.fileId,
      name: 'Shared Exam Paper',
      mimeType: 'application/octet-stream',
      webViewLink: `https://drive.google.com/file/d/${encodeURIComponent(params.fileId)}/view`,
      shared: true,
    };
  }

  return (await metaRes.json()) as DriveFileItem;
}

export async function savePaperJsonToDrive(
  paper: ExamPaper,
  filename: string,
  existingFileId?: string
): Promise<DriveFileItem> {
  const jsonBlob = new Blob([JSON.stringify(paper, null, 2)], {
    type: 'application/json',
  });
  return uploadFileToDrive({
    name: filename.endsWith('.json') ? filename : `${filename}.json`,
    blob: jsonBlob,
    mimeType: 'application/json',
    description: `Exam Paper Maker: ${paper.header.subjectTitle || paper.title} (${paper.header.examinationTitle})`,
    existingFileId,
  });
}

export async function loadPaperJsonFromDrive(fileId: string): Promise<ExamPaper> {
  const token = await requireToken();
  const res = await fetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `Failed to read file from Google Drive (${res.status}).`
    );
  }

  const parsed = await res.json();
  if (!parsed || !parsed.header || !Array.isArray(parsed.sections)) {
    throw new Error('The selected JSON file is not a valid Exam Paper Maker file.');
  }

  return parsed as ExamPaper;
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await requireToken();
  const res = await fetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `Failed to delete Google Drive file (${res.status}).`
    );
  }
}
