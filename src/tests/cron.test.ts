import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/cron/threshold-decisions/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  }
}));

vi.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: vi.fn(() => null)
}));

describe('Threshold Decisions Cron', () => {
  let req: NextRequest;

  beforeEach(() => {
    req = new NextRequest('http://localhost/api/cron/threshold-decisions', {
      headers: new Headers({
        'authorization': 'Bearer test-token'
      })
    });
    vi.clearAllMocks();
  });

  it('should successfully run when no pending events are found', async () => {
    // Setup mock to return no events
    const { db } = await import('@/db');
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    });

    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({})
    });

    const response = await GET(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.evaluated).toBe(0);
    expect(data.confirmed).toBe(0);
    expect(data.cancelled).toBe(0);
  });
});
