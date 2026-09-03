import { describe, it, expect, vi } from 'vitest';
import { runManualCron, getAdminDashboardMetrics } from '@/app/actions/adminDashboard';

// Mock the auth module to simulate different users
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'admin@example.com',
      role: 'super_admin'
    }
  })
}));

describe('Admin Dashboard Actions (POST/Server Actions)', () => {

  it('runManualCron - should return success for expire-credits', async () => {
    // This action is safe to run as it's currently a stub in the code
    const res = await runManualCron('expire-credits');
    expect(res.success).toBe(true);
  });

  it('getAdminDashboardMetrics - should return unauthorized if not admin', async () => {
    // Override the mock for this specific test
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: 'normal-user',
        role: 'member'
      }
    } as any);

    const res = await getAdminDashboardMetrics();
    expect(res.success).toBe(false);
    expect((res as any).error).toBe('UNAUTHORIZED_ADMIN');
  });
});
