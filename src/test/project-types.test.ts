import { describe, it, expect } from 'vitest';
import { PROJECT_STATUS_LABEL, GRADIENT_SEEDS } from '@/types/project';

describe('project type constants', () => {
  it('has a label for every project status', () => {
    const statuses = ['draft', 'in-progress', 'ready', 'archived'];
    statuses.forEach((status) => {
      expect(PROJECT_STATUS_LABEL[status as keyof typeof PROJECT_STATUS_LABEL]).toBeTruthy();
    });
  });

  it('defines at least one gradient seed for project thumbnails', () => {
    expect(GRADIENT_SEEDS.length).toBeGreaterThan(0);
    GRADIENT_SEEDS.forEach((seed) => expect(seed).toContain('from-'));
  });
});
