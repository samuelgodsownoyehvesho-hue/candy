import { describe, it, expect, beforeEach } from 'vitest';
import { saveAudioBlob, getAudioBlob, deleteAudioBlob, isIndexedDbAvailable } from '@/lib/audioDb';

describe('audioDb', () => {
  beforeEach(async () => {
    // fake-indexeddb persists between tests in the same run unless cleared;
    // clean up any project ids used by these tests.
    await deleteAudioBlob('proj-1');
    await deleteAudioBlob('proj-2');
  });

  it('reports IndexedDB as available under the fake-indexeddb polyfill', () => {
    expect(isIndexedDbAvailable()).toBe(true);
  });

  it('returns null for a project with no stored audio', async () => {
    const result = await getAudioBlob('proj-does-not-exist');
    expect(result).toBeNull();
  });

  it('saves and retrieves an audio blob by project id', async () => {
    const blob = new Blob(['fake-audio-bytes'], { type: 'audio/mpeg' });
    const ok = await saveAudioBlob('proj-1', blob, 'track.mp3');
    expect(ok).toBe(true);

    const stored = await getAudioBlob('proj-1');
    expect(stored).not.toBeNull();
    expect(stored?.fileName).toBe('track.mp3');
    expect(stored?.mimeType).toBe('audio/mpeg');
    expect(stored?.projectId).toBe('proj-1');
  });

  it('overwrites a previous blob for the same project id', async () => {
    await saveAudioBlob('proj-2', new Blob(['first']), 'first.wav');
    await saveAudioBlob('proj-2', new Blob(['second']), 'second.wav');

    const stored = await getAudioBlob('proj-2');
    expect(stored?.fileName).toBe('second.wav');
  });

  it('deletes a stored blob', async () => {
    await saveAudioBlob('proj-1', new Blob(['data']), 'a.mp3');
    await deleteAudioBlob('proj-1');
    const stored = await getAudioBlob('proj-1');
    expect(stored).toBeNull();
  });
});
