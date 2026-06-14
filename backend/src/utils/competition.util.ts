import { CompetitionStatus } from '@prisma/client';

export const deriveStatus = (dateStart: Date, dateEnd: Date): CompetitionStatus => {
    const now = new Date();
    if (now < dateStart) return CompetitionStatus.UPCOMING;
    if (now > dateEnd) return CompetitionStatus.COMPLETED;
    return CompetitionStatus.ONGOING;
};
