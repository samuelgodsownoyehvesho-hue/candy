import { handleUpload } from '@vercel/blob/client';

/**
 * Handles the Vercel Blob "client upload" handshake: the browser uploads
 * audio directly to Blob storage (not through this function's request
 * body), so we're not bound by Vercel's serverless function body-size
 * limit (4.5MB on Hobby) the way the earlier base64-through-the-function
 * approach was. This route only issues a short-lived upload token; the
 * actual file bytes never pass through here.
 */
export default async function handler(req, res) {
  const body = req.body;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/ogg',
            'audio/aac',
            'audio/mp4',
            'audio/x-m4a',
            'audio/webm',
          ],
          // Matches Groq's own Whisper API upload limit — no longer
          // constrained by Vercel's request-body cap since upload bypasses it.
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client separately calls /api/whisper-transcribe with
        // the resulting blob URL once upload finishes.
      },
    });

    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Upload failed for an unknown reason.',
    });
  }
}
