import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';


/**
 * Express middleware that authenticates Python sync-agent requests via a Bearer token.
 * Looks up the token against Competition.syncToken in the database, resolves the competition,
 * and injects its UUID into res.locals.competitionId for downstream controllers.
 *
 * @throws {AppError} 401 when the Authorization header is missing or malformed.
 * @throws {AppError} 403 when the token does not match any competition or the competition is COMPLETED.
 */
export const syncAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Missing or invalid Authorization header', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    const competition = await prisma.competition.findUnique({
        where: { syncToken: token },
    });

    if (!competition) {
        return next(new AppError('Invalid MEET_TOKEN or competition not found', 403, 'FORBIDDEN'));
    }

    if (competition.status === 'COMPLETED') {
        return next(new AppError('Sync forbidden: competition is already completed', 403, 'FORBIDDEN'));
    }

    res.locals.competitionId = competition.id;

    next();
};
