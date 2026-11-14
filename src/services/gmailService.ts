import { getAccessToken } from './auth';

export interface GmailAttachment {
  filename: string;
  mimeType: string;
  blob: Blob;
}

export interface SendGmailParams {
  to: string;
  cc?: string;
  subject: string;
  textBody: string;
  attachment?: GmailAttachment | null;
}

export interface SendGmailResult {
  id: string;
  threadId?: string;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return uint8ArrayToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function wrapBase64Lines(base64: string, lineLength = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += lineLength) {
    lines.push(base64.slice(i, i + lineLength));
  }
  return lines.join('\r\n');
}

function encodeMimeHeader(value: string): string {
  // Encode non-ASCII subject strings using RFC 2047 UTF-8 Base64
  if (/^[\x20-\x7E]*$/.test(value)) {
    return value;
  }
  const bytes = new TextEncoder().encode(value);
  return `=?UTF-8?B?${uint8ArrayToBase64(bytes)}?=`;
}

export async function sendEmailViaGmail(
  params: SendGmailParams
): Promise<SendGmailResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google first.');
  }

  const toList = params.to.replace(/[\r\n]+/g, ' ').trim();
  if (!toList) {
    throw new Error('Please enter at least one recipient email address.');
  }

  const headers: string[] = [
    `To: ${toList}`,
  ];
  const cleanCc = params.cc ? params.cc.replace(/[\r\n]+/g, ' ').trim() : '';
  if (cleanCc) {
    headers.push(`Cc: ${cleanCc}`);
  }
  const cleanSubject = (params.subject || 'Examination Paper').replace(/[\r\n]+/g, ' ').trim() || 'Examination Paper';
  headers.push(`Subject: ${encodeMimeHeader(cleanSubject)}`);
  headers.push('MIME-Version: 1.0');

  let rawMime: string;
  const bodyBase64 = wrapBase64Lines(
    uint8ArrayToBase64(new TextEncoder().encode(params.textBody))
  );

  if (params.attachment) {
    const boundary = `ExamPaperMailBoundary_${Date.now().toString(16)}`;
    const attachBytes = new Uint8Array(await params.attachment.blob.arrayBuffer());
    const attachBase64 = wrapBase64Lines(uint8ArrayToBase64(attachBytes));
    const safeFilename = params.attachment.filename.replace(/["\r\n]/g, '_');

    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    rawMime = [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      bodyBase64,
      '',
      `--${boundary}`,
      `Content-Type: ${params.attachment.mimeType}; name="${safeFilename}"`,
      `Content-Disposition: attachment; filename="${safeFilename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      attachBase64,
      '',
      `--${boundary}--`,
      '',
    ].join('\r\n');
  } else {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    headers.push('Content-Transfer-Encoding: base64');
    rawMime = [...headers, '', bodyBase64, ''].join('\r\n');
  }

  const encodedMessage = toBase64Url(new TextEncoder().encode(rawMime));

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `Gmail API error (${res.status}): ${res.statusText}`
    );
  }

  return (await res.json()) as SendGmailResult;
}
