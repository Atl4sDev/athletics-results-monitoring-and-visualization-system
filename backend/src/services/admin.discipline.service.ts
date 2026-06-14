import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';
import { encodeCursorInt, buildPrismaPageInt } from '../utils/pagination.util';
import {
    DisciplineListQuery,
    DisciplineCreateBody,
    DisciplineUpdateBody,
} from '../schemas/admin.discipline.schema';


const disciplineListSelect = {
    id: true,
    code: true,
    name: true,
    type: true,
    isStandard: true,
} as const;

export class DisciplineAdminService {
    static async list(query: DisciplineListQuery) {
        const take = query.take ?? 20;
        const page = buildPrismaPageInt(query.cursor, take);

        const where: Record<string, unknown> = {};
        if (query.type !== undefined) where.type = query.type;
        if (query.isStandard !== undefined) where.isStandard = query.isStandard;

        const items = await prisma.discipline.findMany({
            where,
            select: disciplineListSelect,
            orderBy: { id: 'asc' },
            ...page,
        });

        if (items.length === take) {
            return {
                data: items,
                nextCursor: encodeCursorInt(items[items.length - 1].id),
                hasMore: true,
            };
        }
        return { data: items, nextCursor: null, hasMore: false };
    }

    static async getById(id: number) {
        const discipline = await prisma.discipline.findUnique({
            where: { id },
            select: disciplineListSelect,
        });

        if (!discipline) {
            throw new AppError('Discipline not found', 404, 'NOT_FOUND');
        }

        return discipline;
    }

    static async create(data: DisciplineCreateBody) {
        return prisma.discipline.create({ data, select: disciplineListSelect });
    }

    static async update(id: number, data: DisciplineUpdateBody) {
        await DisciplineAdminService.getById(id);
        return prisma.discipline.update({ where: { id }, data, select: disciplineListSelect });
    }

    static async delete(id: number): Promise<void> {
        await DisciplineAdminService.getById(id);

        const withCount = await prisma.discipline.findUnique({
            where: { id },
            select: { _count: { select: { events: true } } },
        });

        if (withCount!._count.events > 0) {
            throw new AppError(
                'Cannot delete a discipline that has linked events',
                409,
                'DISCIPLINE_IN_USE'
            );
        }

        await prisma.discipline.delete({ where: { id } });
    }
}
