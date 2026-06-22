const payload = {
  success: true,
  files: [
    {
      index: 0,
      contentType: "image/jpeg",
      size: 96505,
      uploadedAt: "2026-06-15T12:29:00.742Z",
      url: "https://bharat-fpo-vyapar.s3.ap-south-1.amazonaws.com/uploads/private/pancard/6a215c5b375c69aabd903587/1781526540378-1000156210.jpg"
    }
  ],
  expiresIn: 600,
  type: "PANCard"
};

function findDocumentUrl(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findDocumentUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof value !== 'object') return null;

  for (const key of ['url', 'signedUrl', 'fileUrl', 'downloadUrl', 'location']) {
    if (typeof value[key] === 'string' && value[key]) return value[key];
  }

  for (const key of ['data', 'file', 'files', 'document', 'result']) {
    const url = findDocumentUrl(value[key]);
    if (url) return url;
  }
  return null;
}

console.log("Extracted URL:", findDocumentUrl(payload));
