/**
 * Utilitários para geração de rascunhos de e-mail compatíveis com Outlook (.eml)
 * e cópia de texto rico com formatação nativa em negrito.
 */

export const copyRichAndPlainText = async (plainText: string, htmlText: string): Promise<boolean> => {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlText], { type: 'text/html' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]);
      return true;
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
    return false;
  } catch {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(plainText);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
};

export const downloadOutlookEml = (subject: string, htmlBody: string, fileName: string): void => {
  let encodedSubject = '';
  try {
    encodedSubject = btoa(unescape(encodeURIComponent(subject)));
  } catch {
    encodedSubject = subject;
  }

  const emlContent = [
    'From: ',
    'To: ',
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 12px 10px; font-family: 'Segoe UI', Calibri, Arial, sans-serif; background-color: #ffffff; color: #0f172a; font-size: 14px; line-height: 1.5;">
${htmlBody}
</body>
</html>`
  ].join('\r\n');

  const blob = new Blob([emlContent], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = fileName.endsWith('.eml') ? fileName : `${fileName}.eml`;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
