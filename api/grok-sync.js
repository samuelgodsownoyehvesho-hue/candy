/**
 * Vercel serverless function: proxies the Grok lyric-sync request so the
 * API key lives in a server-side environment variable (GROK_API_KEY) and
 * never ships in the client bundle. Runs automatically on Vercel with zero
 * config just by existing under /api — there is no equivalent when running
 * plain `vite dev` locally, which is why the client-side caller
 * (`src/lib/grokClient.ts`) treats a failed/missing request here as
 * "fall back to the deterministic algorithm" rather than a hard error.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'Server is not configured with a Grok API key (GROK_API_KEY is not set).',
    });
    return;
  }

  const { lines, durationSeconds, silenceGaps } = req.body ?? {};
  if (!Array.isArray(lines) || lines.length === 0 || typeof durationSeconds !== 'number') {
    res.status(400).json({
      error: 'Request must include a non-empty `lines` array and a numeric `durationSeconds`.',
    });
    return;
  }

  const baseUrl = process.env.GROK_API_BASE_URL || 'https://api.x.ai/v1';
  const model = process.env.GROK_MODEL || 'grok-2-latest';

  const systemPrompt = [
    'You are a lyric-timing assistant. Given a song\'s total duration, a list',
    'of lyric lines in order, and detected silent/instrumental gaps (time',
    'ranges to avoid placing lyrics in), propose a start and end time in',
    'seconds for each line such that:',
    '- Lines stay in the given order, are non-overlapping, and strictly',
    '  increasing in time.',
    '- Longer lines (more characters) get proportionally more time than',
    '  shorter lines.',
    '- No line overlaps a given silence gap.',
    '- All times fall within [0, durationSeconds].',
    'Respond with ONLY a JSON array, no prose, no markdown fences, in this',
    'exact shape:',
    '[{"lineIndex":0,"startTime":0.0,"endTime":0.0}]',
  ].join('\n');

  const userPrompt = JSON.stringify({
    durationSeconds,
    silenceGaps: Array.isArray(silenceGaps) ? silenceGaps : [],
    lines: lines.map((text, i) => ({ lineIndex: i, text })),
  });

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `Grok API error (${response.status}): ${errText.slice(0, 300)}` });
      return;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const cleaned = content.replace(/```json|```/g, '').trim();

    let timings;
    try {
      timings = JSON.parse(cleaned);
    } catch {
      res.status(502).json({ error: 'Grok returned a response that could not be parsed as JSON.' });
      return;
    }

    if (!Array.isArray(timings)) {
      res.status(502).json({ error: 'Grok returned an unexpected response shape.' });
      return;
    }

    res.status(200).json({ timings, usedAI: true });
  } catch (err) {
    res.status(500).json({
      error: `Failed to reach the Grok API: ${err instanceof Error ? err.message : 'unknown error'}`,
    });
  }
}
