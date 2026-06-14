import { prisma } from '../config/prisma';
import { mapDisciplinePublic } from '../utils/public.mapper';

export class PublicDisciplineService {
    static async listAll() {
        const rows = await prisma.discipline.findMany({
            select: { id: true, code: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });
        return rows.map(mapDisciplinePublic);
    }
}
