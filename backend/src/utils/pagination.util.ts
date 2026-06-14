import { AppError } from '../errors/app.error';

export const encodeCursor = (id: string): string =>
    Buffer.from(id).toString('base64url');

export const encodeCursorInt = (id: number): string =>
    Buffer.from(String(id)).toString('base64url');

export const decodeCursorInt = (cursor: string): number => {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const id = parseInt(decoded, 10);
    if (isNaN(id)) {
        throw new AppError('Invalid pagination cursor', 400, 'INVALID_CURSOR');
    }
    return id;
};

export const buildPrismaPageInt = (
    cursor?: string,
    take = 20
): { take: number; skip: number; cursor?: { id: number } } => {
    if (cursor) {
        return { take, skip: 1, cursor: { id: decodeCursorInt(cursor) } };
    }
    return { take, skip: 0 };
};

export const decodeCursor = (cursor: string): string => {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!/^[0-9a-f-]{36}$/i.test(decoded)) {
        throw new AppError('Invalid pagination cursor', 400, 'INVALID_CURSOR');
    }
    return decoded;
};

export const buildPrismaPage = (
    cursor?: string,
    take = 20
): { take: number; skip: number; cursor?: { id: string } } => {
    if (cursor) {
        return { take, skip: 1, cursor: { id: decodeCursor(cursor) } };
    }
    return { take, skip: 0 };
};

export interface PaginatedResult<T> {
    data: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

export const buildPaginatedResult = <T extends { id: string }>(
    items: T[],
    take: number
): PaginatedResult<T> => {
    if (items.length === take) {
        return {
            data: items,
            nextCursor: encodeCursor(items[items.length - 1].id),
            hasMore: true,
        };
    }
    return { data: items, nextCursor: null, hasMore: false };
};
