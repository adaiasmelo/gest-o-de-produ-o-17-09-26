/**
 * Utilitários para geração de rascunhos de e-mail compatíveis com Outlook (.eml)
 * e cópia de texto rico com formatação nativa em negrito.
 */

/**
 * Converte data para o formato de nome de arquivo brasileiro: DD-MM-YY (ex: 28-09-26).
 * Sempre inicia com a data do dia para evitar repetição ou sobrescrita de arquivos.
 */
export const getFormattedFileDate = (rawDate?: string): string => {
  if (rawDate && typeof rawDate === 'string') {
    const clean = rawDate.split('T')[0].trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        const dd = parts[2].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        const yy = parts[0].length === 4 ? parts[0].slice(2) : parts[0];
        return `${dd}-${mm}-${yy}`;
      }
    } else if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        const dd = parts[0].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        const yy = parts[2].length === 4 ? parts[2].slice(2) : parts[2];
        return `${dd}-${mm}-${yy}`;
      }
    }
  }
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(2);
  return `${dd}-${mm}-${yy}`;
};

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

  // Regex to extract base64 data URIs from src="..."
  const imgRegex = /src=["']data:image\/([a-zA-Z0-9.+_-]+);base64,([^"']+)["']/gi;

  interface InlineImage {
    cid: string;
    mimeType: string;
    extension: string;
    base64Data: string;
  }

  const inlineImages: InlineImage[] = [];
  let imageCounter = 0;

  // Replace each inline data URI with a cid: reference for Outlook compatibility
  const processedHtmlBody = htmlBody.replace(imgRegex, (_match, rawMime, base64) => {
    const cleanMime = rawMime.toLowerCase();
    const ext = cleanMime === 'jpeg' ? 'jpg' : cleanMime;
    const cid = `image_attach_${imageCounter++}@manupackaging`;
    inlineImages.push({
      cid,
      mimeType: `image/${cleanMime}`,
      extension: ext,
      base64Data: base64.replace(/\s+/g, '')
    });
    return `src="cid:${cid}"`;
  });

  const wrapBase64 = (str: string, maxLineLength = 76): string => {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += maxLineLength) {
      chunks.push(str.substring(i, i + maxLineLength));
    }
    return chunks.join('\r\n');
  };

  const toBase64Utf8 = (str: string): string => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      return btoa(str);
    }
  };

  const fullHtmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 12px 10px; font-family: 'Segoe UI', Calibri, Arial, sans-serif; background-color: #ffffff; color: #0f172a; font-size: 13.5px; line-height: 1.45;">
${processedHtmlBody}
</body>
</html>`;

  let emlContent = '';

  if (inlineImages.length === 0) {
    emlContent = [
      'From: ',
      'To: ',
      `Subject: =?UTF-8?B?${encodedSubject}?=`,
      'X-Unsent: 1',
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(toBase64Utf8(fullHtmlDocument))
    ].join('\r\n');
  } else {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const parts: string[] = [];

    // MIME multipart/related header for Outlook inline images
    parts.push(
      'From: ',
      'To: ',
      `Subject: =?UTF-8?B?${encodedSubject}?=`,
      'X-Unsent: 1',
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
      ''
    );

    // Part 1: HTML Content (Base64 encoded for bulletproof Unicode/Outlook support)
    parts.push(
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(toBase64Utf8(fullHtmlDocument)),
      ''
    );

    // Parts 2..N: Inline Images with Content-ID & Content-Location
    inlineImages.forEach((img, idx) => {
      const fileName = `evidencia_${idx + 1}.${img.extension}`;
      parts.push(
        `--${boundary}`,
        `Content-Type: ${img.mimeType}; name="${fileName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-ID: <${img.cid}>`,
        `Content-Location: ${fileName}`,
        `Content-Disposition: inline; filename="${fileName}"`,
        '',
        wrapBase64(img.base64Data),
        ''
      );
    });

    // Final boundary
    parts.push(`--${boundary}--`);

    emlContent = parts.join('\r\n');
  }

  const blob = new Blob([emlContent], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = fileName.endsWith('.eml') ? fileName : `${fileName}.eml`;
  // Sanitiza caracteres proibidos em sistemas de arquivos (Windows/Linux/Mac/Android)
  const sanitizedName = safeName.replace(/[\\/:*?"<>|]/g, '-').replace(/-+/g, '-');
  link.download = sanitizedName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
