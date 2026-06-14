import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';
import { AdminLoginDto } from '../schemas/admin.auth.schema';
import { signAdminToken } from '../utils/jwt.util';


/**
 * Service encapsulating all admin authentication business logic.
 * The only layer that interacts with Prisma and bcrypt for auth operations.
 */
export class AdminAuthService {
    /**
     * Verifies admin credentials and returns a signed JWT on success.
     *
     * @param dto - Validated login request body containing email and password.
     * @returns Object containing the signed JWT and its TTL in seconds.
     * @throws {AppError} 401 INVALID_CREDENTIALS when the email is not found or the password does not match.
     */
    static async login(dto: AdminLoginDto): Promise<{ token: string; expiresIn: number }> {
        const admin = await prisma.admin.findUnique({ where: { email: dto.email } });

        const passwordMatch = admin ? await bcrypt.compare(dto.password, admin.password) : false;

        if (!admin || !passwordMatch) {
            throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        const token = signAdminToken({ sub: admin.id, email: admin.email, role: admin.role });

        return { token, expiresIn: 28800 };
    }
}
