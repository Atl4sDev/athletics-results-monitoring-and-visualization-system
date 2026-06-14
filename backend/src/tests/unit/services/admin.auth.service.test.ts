import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../errors/app.error';

// Mock prisma
const mockFindUnique = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.admin = { findUnique: mockFindUnique };
    }),
}));

// Mock bcrypt
const mockCompare = vi.hoisted(() => vi.fn());

vi.mock('bcrypt', () => ({
    default: { compare: mockCompare },
    compare: mockCompare,
}));

// Mock jwt util so signAdminToken is predictable
vi.mock('../../../utils/jwt.util', () => ({
    signAdminToken: vi.fn(() => 'signed-token'),
    verifyAdminToken: vi.fn(),
}));

// Mock env so import of service doesn't fail
vi.mock('../../../config/env', () => ({
    env: { JWT_SECRET: 'test-secret-key-at-least-10-chars' },
}));

const { AdminAuthService } = await import('../../../services/admin.auth.service');

const adminRecord = {
    id: 'admin-uuid-1',
    email: 'admin@example.com',
    password: '$2b$12$hashedpassword',
    role: 'admin',
    createdAt: new Date(),
};

describe('AdminAuthService.login', () => {
    beforeEach(() => {
        mockFindUnique.mockReset();
        mockCompare.mockReset();
    });

    it('happy path: resolves to { token, expiresIn: 28800 } when credentials are valid', async () => {
        mockFindUnique.mockResolvedValue(adminRecord);
        mockCompare.mockResolvedValue(true);

        const result = await AdminAuthService.login({ email: 'admin@example.com', password: 'Admin1234!' });

        expect(typeof result.token).toBe('string');
        expect(result.expiresIn).toBe(28800);
    });

    it('throws AppError 401 INVALID_CREDENTIALS when email is not found', async () => {
        mockFindUnique.mockResolvedValue(null);
        mockCompare.mockResolvedValue(false);

        await expect(
            AdminAuthService.login({ email: 'nobody@example.com', password: 'whatever' })
        ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
    });

    it('throws AppError 401 INVALID_CREDENTIALS when password does not match', async () => {
        mockFindUnique.mockResolvedValue(adminRecord);
        mockCompare.mockResolvedValue(false);

        await expect(
            AdminAuthService.login({ email: 'admin@example.com', password: 'wrongpassword' })
        ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
    });

    it('propagates error when Prisma throws', async () => {
        const dbError = new Error('DB connection lost');
        mockFindUnique.mockRejectedValue(dbError);

        await expect(
            AdminAuthService.login({ email: 'admin@example.com', password: 'Admin1234!' })
        ).rejects.toThrow('DB connection lost');
    });
});
