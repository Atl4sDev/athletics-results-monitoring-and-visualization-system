import {
    PrismaClient, DisciplineType, Gender,
    CompetitionStatus, CompetitionEnvironment,
    HeatStatus, ResultStatus, AgeCategory,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const disciplinesData = [
    // --- Flat running ---
    { code: '30', name: 'Біг на 30 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '50', name: 'Біг на 50 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '60', name: 'Біг на 60 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '100', name: 'Біг на 100 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '150', name: 'Біг на 150 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '200', name: 'Біг на 200 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '300', name: 'Біг на 300 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '400', name: 'Біг на 400 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '500', name: 'Біг на 500 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '600', name: 'Біг на 600 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '800', name: 'Біг на 800 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '1000', name: 'Біг на 1000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '1500', name: 'Біг на 1500 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '2000', name: 'Біг на 2000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '3000', name: 'Біг на 3000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '5000', name: 'Біг на 5000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '10000', name: 'Біг на 10000 м', type: DisciplineType.TRACK, isStandard: true },

    // --- Hurdles ---
    { code: '50H', name: 'Біг на 50 м з/б', type: DisciplineType.TRACK, isStandard: true },
    { code: '60H', name: 'Біг на 60 м з/б', type: DisciplineType.TRACK, isStandard: true },
    { code: '80H', name: 'Біг на 80 м з/б', type: DisciplineType.TRACK, isStandard: true },
    { code: '100H', name: 'Біг на 100 м з/б', type: DisciplineType.TRACK, isStandard: true },
    { code: '110H', name: 'Біг на 110 м з/б', type: DisciplineType.TRACK, isStandard: true },
    { code: '200H', name: 'Біг на 200 м з/б', type: DisciplineType.TRACK, isStandard: true },
    { code: '300H', name: 'Біг на 300 м з/б', type: DisciplineType.TRACK, isStandard: true },
    { code: '400H', name: 'Біг на 400 м з/б', type: DisciplineType.TRACK, isStandard: true },

    // --- Steeplechase ---
    { code: '1500SC', name: 'Біг на 1500 м з/п', type: DisciplineType.TRACK, isStandard: true },
    { code: '2000SC', name: 'Біг на 2000 м з/п', type: DisciplineType.TRACK, isStandard: true },
    { code: '3000SC', name: 'Біг на 3000 м з/п', type: DisciplineType.TRACK, isStandard: true },

    // --- Race walk ---
    { code: '1000W', name: 'Спортивна ходьба 1000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '2000W', name: 'Спортивна ходьба 2000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '3000W', name: 'Спортивна ходьба 3000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '5000W', name: 'Спортивна ходьба 5000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '10000W', name: 'Спортивна ходьба 10000 м', type: DisciplineType.TRACK, isStandard: true },
    { code: '20000W', name: 'Спортивна ходьба 20000 м', type: DisciplineType.TRACK, isStandard: true },
];

const testAthletes = [
    { firstName: 'Марія', lastName: 'Баранова', gender: Gender.FEMALE, licenseNumber: 'FLAU-KV-384996', birthDate: new Date('2010-01-05T00:00:00Z') },
    { firstName: 'Дмитро', lastName: 'Ігнатенко', gender: Gender.MALE, licenseNumber: 'FLAU-KV-322333', birthDate: new Date('2011-03-18T00:00:00Z') },
    { firstName: 'Максим', lastName: 'Ординський', gender: Gender.MALE, licenseNumber: 'FLAU-KO-885021', birthDate: new Date('2009-06-15T00:00:00Z') },
    { firstName: 'Поліна', lastName: 'Самардіна', gender: Gender.FEMALE, licenseNumber: 'FLAU-KO-228892', birthDate: new Date('2011-11-22T00:00:00Z') },
    { firstName: 'Тетяна', lastName: 'Француз', gender: Gender.FEMALE, licenseNumber: 'FLAU-CHN-934623', birthDate: new Date('2009-03-30T00:00:00Z') },
];

const testCompetition = {
    id: 'test-comp-uuid-0001-0000-000000000001',
    name: 'Тестовий турнір інтеграції Lynx',
    dateStart: new Date('2026-05-18T00:00:00Z'),
    dateEnd: new Date('2026-06-27T00:00:00Z'),
    location: 'м. Київ, НСК Олімпійський',
    status: CompetitionStatus.UPCOMING,
    environment: CompetitionEnvironment.OUTDOOR,
    syncToken: 'TEST_MEET_TOKEN_123',
};

const pbsbCompetition = {
    id: 'test-comp-uuid-0002-0000-000000000002',
    name: 'Тестовий турнір (еталон PB/SB)',
    dateStart: new Date('2026-04-12T00:00:00Z'),
    dateEnd: new Date('2026-04-13T00:00:00Z'),
    location: 'м. Київ, Стадіон Динамо',
    status: CompetitionStatus.COMPLETED,
    environment: CompetitionEnvironment.OUTDOOR,
    syncToken: 'TEST_PBSB_BASELINE_TOKEN',
};

// 23 mock competitions to bring the total to 25 (including the 2 above).
// Statuses are set to match the stored dates; deriveStatus() overrides at read time.
const mockCompetitions = [
    // --- 2025 winter (INDOOR, COMPLETED) ---
    {
        name: 'Зимовий кубок Київщини',
        dateStart: new Date('2025-01-25T00:00:00Z'),
        dateEnd: new Date('2025-01-25T00:00:00Z'),
        location: 'м. Київ, Манеж НУФВСУ',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_01',
    },
    {
        name: 'Першість Львівщини (закритий манеж)',
        dateStart: new Date('2025-02-01T00:00:00Z'),
        dateEnd: new Date('2025-02-02T00:00:00Z'),
        location: 'м. Львів, Манеж "Арена Львів"',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_02',
    },
    {
        name: 'Чемпіонат України U18 (закритий)',
        dateStart: new Date('2025-02-15T00:00:00Z'),
        dateEnd: new Date('2025-02-16T00:00:00Z'),
        location: 'м. Харків, Палац спорту',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_03',
    },
    // --- 2025 spring–autumn (OUTDOOR, COMPLETED) ---
    {
        name: 'Кубок Дніпра',
        dateStart: new Date('2025-03-08T00:00:00Z'),
        dateEnd: new Date('2025-03-09T00:00:00Z'),
        location: 'м. Дніпро, Стадіон «Метеор»',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_04',
    },
    {
        name: 'Відкрита першість Одеси',
        dateStart: new Date('2025-04-12T00:00:00Z'),
        dateEnd: new Date('2025-04-13T00:00:00Z'),
        location: 'м. Одеса, Центральний стадіон',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_05',
    },
    {
        name: 'Весняний кубок Київщини',
        dateStart: new Date('2025-05-10T00:00:00Z'),
        dateEnd: new Date('2025-05-11T00:00:00Z'),
        location: 'м. Київ, Стадіон Динамо',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_06',
    },
    {
        name: 'Чемпіонат Харківщини',
        dateStart: new Date('2025-06-07T00:00:00Z'),
        dateEnd: new Date('2025-06-08T00:00:00Z'),
        location: 'м. Харків, Стадіон «Металіст»',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_07',
    },
    {
        name: 'Відкрита першість Запоріжжя (літо)',
        dateStart: new Date('2025-07-05T00:00:00Z'),
        dateEnd: new Date('2025-07-06T00:00:00Z'),
        location: 'м. Запоріжжя, Центральний стадіон',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_08',
    },
    {
        name: 'Кубок міста Полтава',
        dateStart: new Date('2025-08-16T00:00:00Z'),
        dateEnd: new Date('2025-08-17T00:00:00Z'),
        location: 'м. Полтава, Стадіон «Ворскла»',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_09',
    },
    {
        name: 'Осінній турнір Київщини',
        dateStart: new Date('2025-09-20T00:00:00Z'),
        dateEnd: new Date('2025-09-21T00:00:00Z'),
        location: 'м. Київ, НСК Олімпійський',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_10',
    },
    // --- 2025 winter (INDOOR, COMPLETED) ---
    {
        name: 'Першість Волині (закритий манеж)',
        dateStart: new Date('2025-11-15T00:00:00Z'),
        dateEnd: new Date('2025-11-16T00:00:00Z'),
        location: 'м. Луцьк, Спортивний манеж',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_11',
    },
    {
        name: 'Різдвяний кубок',
        dateStart: new Date('2025-12-20T00:00:00Z'),
        dateEnd: new Date('2025-12-21T00:00:00Z'),
        location: 'м. Київ, Манеж НУФВСУ',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_12',
    },
    // --- 2026 winter (INDOOR, COMPLETED) ---
    {
        name: 'Новорічний старт',
        dateStart: new Date('2026-01-10T00:00:00Z'),
        dateEnd: new Date('2026-01-10T00:00:00Z'),
        location: 'м. Харків, Палац спорту',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_13',
    },
    {
        name: 'Зимова першість Одещини',
        dateStart: new Date('2026-01-24T00:00:00Z'),
        dateEnd: new Date('2026-01-25T00:00:00Z'),
        location: 'м. Одеса, Манеж ОСДЮСШОР',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_14',
    },
    {
        name: 'Кубок пам\'яті',
        dateStart: new Date('2026-02-07T00:00:00Z'),
        dateEnd: new Date('2026-02-08T00:00:00Z'),
        location: 'м. Київ, Манеж НУФВСУ',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_15',
    },
    {
        name: 'Весняна ліга. Тур 1',
        dateStart: new Date('2026-03-14T00:00:00Z'),
        dateEnd: new Date('2026-03-15T00:00:00Z'),
        location: 'м. Дніпро, Критий манеж',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.INDOOR,
        syncToken: 'MOCK_COMP_TOKEN_16',
    },
    // --- 2026 spring (OUTDOOR, COMPLETED) ---
    {
        name: 'Весняна ліга. Тур 2',
        dateStart: new Date('2026-04-04T00:00:00Z'),
        dateEnd: new Date('2026-04-05T00:00:00Z'),
        location: 'м. Київ, Стадіон Динамо',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_17',
    },
    {
        name: 'Першість Полтавщини',
        dateStart: new Date('2026-04-18T00:00:00Z'),
        dateEnd: new Date('2026-04-19T00:00:00Z'),
        location: 'м. Полтава, Стадіон «Ворскла»',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_18',
    },
    {
        name: 'Кубок Чернігівщини',
        dateStart: new Date('2026-05-02T00:00:00Z'),
        dateEnd: new Date('2026-05-03T00:00:00Z'),
        location: 'м. Чернігів, Центральний стадіон',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_19',
    },
    {
        name: 'Відкрита першість Запоріжжя (весна)',
        dateStart: new Date('2026-05-16T00:00:00Z'),
        dateEnd: new Date('2026-05-17T00:00:00Z'),
        location: 'м. Запоріжжя, Центральний стадіон',
        status: CompetitionStatus.COMPLETED,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_20',
    },
    // --- 2026 current (ONGOING) ---
    {
        name: 'Весняна ліга. Тур 3',
        dateStart: new Date('2026-05-31T00:00:00Z'),
        dateEnd: new Date('2026-06-05T00:00:00Z'),
        location: 'м. Харків, Стадіон «Металіст»',
        status: CompetitionStatus.ONGOING,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_21',
    },
    // --- 2026 upcoming (UPCOMING) ---
    {
        name: 'Чемпіонат України U20',
        dateStart: new Date('2026-06-20T00:00:00Z'),
        dateEnd: new Date('2026-06-22T00:00:00Z'),
        location: 'м. Київ, НСК Олімпійський',
        status: CompetitionStatus.UPCOMING,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_22',
    },
    {
        name: 'Кубок федерації',
        dateStart: new Date('2026-07-12T00:00:00Z'),
        dateEnd: new Date('2026-07-13T00:00:00Z'),
        location: 'м. Дніпро, Стадіон «Метеор»',
        status: CompetitionStatus.UPCOMING,
        environment: CompetitionEnvironment.OUTDOOR,
        syncToken: 'MOCK_COMP_TOKEN_23',
    },
];

async function main() {
    console.log('Seeding discipline reference data...');

    for (const disc of disciplinesData) {
        await prisma.discipline.upsert({
            where: { code: disc.code },
            update: disc,
            create: disc,
        });
    }
    console.log('Discipline table seeded.');

    const disc100 = await prisma.discipline.findUniqueOrThrow({ where: { code: '100' } });
    const disc200 = await prisma.discipline.findUniqueOrThrow({ where: { code: '200' } });
    const disc400 = await prisma.discipline.findUniqueOrThrow({ where: { code: '400' } });
    const disc800 = await prisma.discipline.findUniqueOrThrow({ where: { code: '800' } });

    const seededAthletes: Record<string, { id: string }> = {};
    for (const athlete of testAthletes) {
        const record = await prisma.athlete.upsert({
            where: { licenseNumber: athlete.licenseNumber },
            update: athlete,
            create: athlete,
        });
        seededAthletes[athlete.licenseNumber] = record;
    }
    console.log('Test athletes seeded.');

    await prisma.competition.upsert({
        where: { syncToken: testCompetition.syncToken },
        update: testCompetition,
        create: testCompetition,
    });
    console.log(`Test competition created. Sync token: ${testCompetition.syncToken}`);

    // PB/SB baseline competition — used as the historical comparison fixture.
    await prisma.competition.upsert({
        where: { syncToken: pbsbCompetition.syncToken },
        update: pbsbCompetition,
        create: pbsbCompetition,
    });

    // 23 mock competitions for the calendar (25 total including the 2 above).
    for (const comp of mockCompetitions) {
        await prisma.competition.upsert({
            where: { syncToken: comp.syncToken },
            update: comp,
            create: comp,
        });
    }
    console.log(`${mockCompetitions.length} mock competitions seeded (25 total).`);

    // --- PB/SB baseline: day 1 ---

    const day1 = new Date('2026-04-12T09:00:00Z');

    const eventDefs = [
        { id: 'pbsbevnt-0001-0000-0000-000000000001', lynxEventId: 6,  disciplineId: disc100.id, gender: Gender.FEMALE, ageCategory: AgeCategory.U18 },
        { id: 'pbsbevnt-0002-0000-0000-000000000001', lynxEventId: 7,  disciplineId: disc100.id, gender: Gender.MALE,   ageCategory: AgeCategory.U16 },
        { id: 'pbsbevnt-0003-0000-0000-000000000001', lynxEventId: 8,  disciplineId: disc100.id, gender: Gender.MALE,   ageCategory: AgeCategory.U18 },
        { id: 'pbsbevnt-0004-0000-0000-000000000001', lynxEventId: 9,  disciplineId: disc400.id, gender: Gender.FEMALE, ageCategory: AgeCategory.U16 },
        { id: 'pbsbevnt-0005-0000-0000-000000000001', lynxEventId: 10, disciplineId: disc400.id, gender: Gender.FEMALE, ageCategory: AgeCategory.U18 },
        { id: 'pbsbevnt-0006-0000-0000-000000000001', lynxEventId: 11, disciplineId: disc400.id, gender: Gender.MALE,   ageCategory: AgeCategory.U16 },
        { id: 'pbsbevnt-0007-0000-0000-000000000001', lynxEventId: 12, disciplineId: disc400.id, gender: Gender.MALE,   ageCategory: AgeCategory.U18 },
    ];

    for (const ev of eventDefs) {
        await prisma.event.upsert({
            where: { id: ev.id },
            update: { scheduledTime: day1 },
            create: {
                id: ev.id,
                competitionId: pbsbCompetition.id,
                disciplineId: ev.disciplineId,
                gender: ev.gender,
                ageCategory: ev.ageCategory,
                eventType: DisciplineType.TRACK,
                roundName: 'Фінал',
                lynxEventId: ev.lynxEventId,
                lynxRoundId: 1,
                scheduledTime: day1,
            },
        });
    }

    const heatDefs = [
        { id: 'pbsbheat-0001-0000-0000-000000000001', eventId: 'pbsbevnt-0001-0000-0000-000000000001' },
        { id: 'pbsbheat-0002-0000-0000-000000000001', eventId: 'pbsbevnt-0002-0000-0000-000000000001' },
        { id: 'pbsbheat-0003-0000-0000-000000000001', eventId: 'pbsbevnt-0003-0000-0000-000000000001' },
        { id: 'pbsbheat-0004-0000-0000-000000000001', eventId: 'pbsbevnt-0004-0000-0000-000000000001' },
        { id: 'pbsbheat-0005-0000-0000-000000000001', eventId: 'pbsbevnt-0005-0000-0000-000000000001' },
        { id: 'pbsbheat-0006-0000-0000-000000000001', eventId: 'pbsbevnt-0006-0000-0000-000000000001' },
        { id: 'pbsbheat-0007-0000-0000-000000000001', eventId: 'pbsbevnt-0007-0000-0000-000000000001' },
    ];

    for (const heat of heatDefs) {
        await prisma.heat.upsert({
            where: { id: heat.id },
            update: {},
            create: {
                id: heat.id,
                eventId: heat.eventId,
                status: HeatStatus.OFFICIAL,
                lynxHeatId: 1,
            },
        });
    }

    const baranova  = seededAthletes['FLAU-KV-384996'];
    const ihnatenko = seededAthletes['FLAU-KV-322333'];
    const ordynskyi = seededAthletes['FLAU-KO-885021'];
    const samardina = seededAthletes['FLAU-KO-228892'];
    const frantsuz  = seededAthletes['FLAU-CHN-934623'];

    const resultDefs = [
        // 100m day 1
        { id: 'pbsbrslt-0001-0000-0000-000000000001', heatId: 'pbsbheat-0001-0000-0000-000000000001', athleteId: baranova.id,  lane: 3, bibNumber: '194', team: 'Київська обл.',    mark: '12.45',   sortValue: 12.45 },
        { id: 'pbsbrslt-0002-0000-0000-000000000001', heatId: 'pbsbheat-0002-0000-0000-000000000001', athleteId: ihnatenko.id, lane: 2, bibNumber: '71',  team: 'Київська обл.',    mark: '11.92',   sortValue: 11.92 },
        { id: 'pbsbrslt-0003-0000-0000-000000000001', heatId: 'pbsbheat-0003-0000-0000-000000000001', athleteId: ordynskyi.id, lane: 6, bibNumber: '32',  team: 'Київська обл.',    mark: '11.34',   sortValue: 11.34 },
        // 400m day 1
        { id: 'pbsbrslt-0004-0000-0000-000000000001', heatId: 'pbsbheat-0004-0000-0000-000000000001', athleteId: samardina.id, lane: 5, bibNumber: '31',  team: 'Київська обл.',    mark: '1:02.34', sortValue: 62.34 },
        { id: 'pbsbrslt-0005-0000-0000-000000000001', heatId: 'pbsbheat-0005-0000-0000-000000000001', athleteId: frantsuz.id,  lane: 5, bibNumber: '767', team: 'Чернігівська обл.', mark: '58.71',   sortValue: 58.71 },
        { id: 'pbsbrslt-0006-0000-0000-000000000001', heatId: 'pbsbheat-0006-0000-0000-000000000001', athleteId: ihnatenko.id, lane: 3, bibNumber: '71',  team: 'Київська обл.',    mark: '52.17',   sortValue: 52.17 },
        { id: 'pbsbrslt-0007-0000-0000-000000000001', heatId: 'pbsbheat-0007-0000-0000-000000000001', athleteId: ordynskyi.id, lane: 2, bibNumber: '32',  team: 'Київська обл.',    mark: '49.85',   sortValue: 49.85 },
    ];

    for (const res of resultDefs) {
        await prisma.result.upsert({
            where: { heatId_athleteId: { heatId: res.heatId, athleteId: res.athleteId } },
            update: {},
            create: {
                id: res.id,
                heatId: res.heatId,
                athleteId: res.athleteId,
                lane: res.lane,
                bibNumber: res.bibNumber,
                team: res.team,
                status: ResultStatus.OK,
                mark: res.mark,
                sortValue: res.sortValue,
                isPB: true,
                isSB: true,
            },
        });
    }
    console.log('PB/SB baseline results seeded (day 1).');

    // --- PB/SB baseline: day 2 (200m and 800m) ---

    const day2 = new Date('2026-04-13T09:00:00Z');

    const eventDefs2 = [
        { id: 'pbsbevnt-0008-0000-0000-000000000001', lynxEventId: 13, disciplineId: disc200.id, gender: Gender.FEMALE, ageCategory: AgeCategory.U18 },
        { id: 'pbsbevnt-0009-0000-0000-000000000001', lynxEventId: 14, disciplineId: disc200.id, gender: Gender.MALE,   ageCategory: AgeCategory.U18 },
        { id: 'pbsbevnt-0010-0000-0000-000000000001', lynxEventId: 15, disciplineId: disc800.id, gender: Gender.FEMALE, ageCategory: AgeCategory.U18 },
        { id: 'pbsbevnt-0011-0000-0000-000000000001', lynxEventId: 16, disciplineId: disc800.id, gender: Gender.MALE,   ageCategory: AgeCategory.U18 },
    ];

    for (const ev of eventDefs2) {
        await prisma.event.upsert({
            where: { id: ev.id },
            update: { scheduledTime: day2 },
            create: {
                id: ev.id,
                competitionId: pbsbCompetition.id,
                disciplineId: ev.disciplineId,
                gender: ev.gender,
                ageCategory: ev.ageCategory,
                eventType: DisciplineType.TRACK,
                roundName: 'Фінал',
                lynxEventId: ev.lynxEventId,
                lynxRoundId: 1,
                scheduledTime: day2,
            },
        });
    }

    const heatDefs2 = [
        { id: 'pbsbheat-0008-0000-0000-000000000001', eventId: 'pbsbevnt-0008-0000-0000-000000000001' },
        { id: 'pbsbheat-0009-0000-0000-000000000001', eventId: 'pbsbevnt-0009-0000-0000-000000000001' },
        { id: 'pbsbheat-0010-0000-0000-000000000001', eventId: 'pbsbevnt-0010-0000-0000-000000000001' },
        { id: 'pbsbheat-0011-0000-0000-000000000001', eventId: 'pbsbevnt-0011-0000-0000-000000000001' },
    ];

    for (const heat of heatDefs2) {
        await prisma.heat.upsert({
            where: { id: heat.id },
            update: {},
            create: {
                id: heat.id,
                eventId: heat.eventId,
                status: HeatStatus.OFFICIAL,
                lynxHeatId: 1,
            },
        });
    }

    const resultDefs2 = [
        // 200m women U18
        { id: 'pbsbrslt-0008-0000-0000-000000000001', heatId: 'pbsbheat-0008-0000-0000-000000000001', athleteId: baranova.id,  lane: 4, bibNumber: '194', team: 'Київська обл.',    mark: '25.14', sortValue: 25.14 },
        { id: 'pbsbrslt-0009-0000-0000-000000000001', heatId: 'pbsbheat-0008-0000-0000-000000000001', athleteId: frantsuz.id,  lane: 6, bibNumber: '767', team: 'Чернігівська обл.', mark: '25.87', sortValue: 25.87 },
        // 200m men U18
        { id: 'pbsbrslt-0010-0000-0000-000000000001', heatId: 'pbsbheat-0009-0000-0000-000000000001', athleteId: ordynskyi.id, lane: 3, bibNumber: '32',  team: 'Київська обл.',    mark: '22.91', sortValue: 22.91 },
        { id: 'pbsbrslt-0011-0000-0000-000000000001', heatId: 'pbsbheat-0009-0000-0000-000000000001', athleteId: ihnatenko.id, lane: 5, bibNumber: '71',  team: 'Київська обл.',    mark: '23.45', sortValue: 23.45 },
        // 800m women U18
        { id: 'pbsbrslt-0012-0000-0000-000000000001', heatId: 'pbsbheat-0010-0000-0000-000000000001', athleteId: frantsuz.id,  lane: 2, bibNumber: '767', team: 'Чернігівська обл.', mark: '2:23.41', sortValue: 143.41 },
        { id: 'pbsbrslt-0013-0000-0000-000000000001', heatId: 'pbsbheat-0010-0000-0000-000000000001', athleteId: samardina.id, lane: 5, bibNumber: '31',  team: 'Київська обл.',    mark: '2:28.77', sortValue: 148.77 },
        // 800m men U18
        { id: 'pbsbrslt-0014-0000-0000-000000000001', heatId: 'pbsbheat-0011-0000-0000-000000000001', athleteId: ordynskyi.id, lane: 4, bibNumber: '32',  team: 'Київська обл.',    mark: '1:58.33', sortValue: 118.33 },
        { id: 'pbsbrslt-0015-0000-0000-000000000001', heatId: 'pbsbheat-0011-0000-0000-000000000001', athleteId: ihnatenko.id, lane: 6, bibNumber: '71',  team: 'Київська обл.',    mark: '2:05.12', sortValue: 125.12 },
    ];

    for (const res of resultDefs2) {
        await prisma.result.upsert({
            where: { heatId_athleteId: { heatId: res.heatId, athleteId: res.athleteId } },
            update: {},
            create: {
                id: res.id,
                heatId: res.heatId,
                athleteId: res.athleteId,
                lane: res.lane,
                bibNumber: res.bibNumber,
                team: res.team,
                status: ResultStatus.OK,
                mark: res.mark,
                sortValue: res.sortValue,
                isPB: true,
                isSB: true,
            },
        });
    }
    console.log('PB/SB baseline results seeded (day 2).');

    // --- Comprehensive mock athlete results (Bondarchuk + Koval) ---

    const disc60   = await prisma.discipline.findUniqueOrThrow({ where: { code: '60' } });
    const disc1500 = await prisma.discipline.findUniqueOrThrow({ where: { code: '1500' } });

    const mockCompTokenList = [
        'MOCK_COMP_TOKEN_01', 'MOCK_COMP_TOKEN_02', 'MOCK_COMP_TOKEN_03',
        'MOCK_COMP_TOKEN_04', 'MOCK_COMP_TOKEN_05', 'MOCK_COMP_TOKEN_06',
        'MOCK_COMP_TOKEN_07', 'MOCK_COMP_TOKEN_08', 'MOCK_COMP_TOKEN_09',
        'MOCK_COMP_TOKEN_10', 'MOCK_COMP_TOKEN_11', 'MOCK_COMP_TOKEN_12',
        'MOCK_COMP_TOKEN_13', 'MOCK_COMP_TOKEN_14', 'MOCK_COMP_TOKEN_15',
        'MOCK_COMP_TOKEN_16', 'MOCK_COMP_TOKEN_17', 'MOCK_COMP_TOKEN_18',
        'MOCK_COMP_TOKEN_19', 'MOCK_COMP_TOKEN_20',
    ];
    const mockCompMap: Record<string, string> = {};
    for (const token of mockCompTokenList) {
        const comp = await prisma.competition.findUniqueOrThrow({ where: { syncToken: token } });
        mockCompMap[token] = comp.id;
    }
    const compTime: Record<string, Date> = {
        'MOCK_COMP_TOKEN_01': new Date('2025-01-25T09:00:00Z'),
        'MOCK_COMP_TOKEN_02': new Date('2025-02-01T09:00:00Z'),
        'MOCK_COMP_TOKEN_03': new Date('2025-02-15T09:00:00Z'),
        'MOCK_COMP_TOKEN_04': new Date('2025-03-08T09:00:00Z'),
        'MOCK_COMP_TOKEN_05': new Date('2025-04-12T09:00:00Z'),
        'MOCK_COMP_TOKEN_06': new Date('2025-05-10T09:00:00Z'),
        'MOCK_COMP_TOKEN_07': new Date('2025-06-07T09:00:00Z'),
        'MOCK_COMP_TOKEN_08': new Date('2025-07-05T09:00:00Z'),
        'MOCK_COMP_TOKEN_09': new Date('2025-08-16T09:00:00Z'),
        'MOCK_COMP_TOKEN_10': new Date('2025-09-20T09:00:00Z'),
        'MOCK_COMP_TOKEN_11': new Date('2025-11-15T09:00:00Z'),
        'MOCK_COMP_TOKEN_12': new Date('2025-12-20T09:00:00Z'),
        'MOCK_COMP_TOKEN_13': new Date('2026-01-10T09:00:00Z'),
        'MOCK_COMP_TOKEN_14': new Date('2026-01-24T09:00:00Z'),
        'MOCK_COMP_TOKEN_15': new Date('2026-02-07T09:00:00Z'),
        'MOCK_COMP_TOKEN_16': new Date('2026-03-14T09:00:00Z'),
        'MOCK_COMP_TOKEN_17': new Date('2026-04-04T09:00:00Z'),
        'MOCK_COMP_TOKEN_18': new Date('2026-04-18T09:00:00Z'),
        'MOCK_COMP_TOKEN_19': new Date('2026-05-02T09:00:00Z'),
        'MOCK_COMP_TOKEN_20': new Date('2026-05-16T09:00:00Z'),
    };

    const bondarchukRec = await prisma.athlete.upsert({
        where: { licenseNumber: 'FLAU-KV-190287' },
        update: {},
        create: {
            firstName: 'Олексій', lastName: 'Бондаренко',
            gender: Gender.MALE, licenseNumber: 'FLAU-KV-190287',
            birthDate: new Date('2007-04-12T00:00:00Z'),
        },
    });
    const kovalRec = await prisma.athlete.upsert({
        where: { licenseNumber: 'FLAU-LV-045832' },
        update: {},
        create: {
            firstName: 'Вікторія', lastName: 'Коваль',
            gender: Gender.FEMALE, licenseNumber: 'FLAU-LV-045832',
            birthDate: new Date('2006-08-23T00:00:00Z'),
        },
    });
    console.log('Comprehensive test athletes seeded.');

    const discIdMap: Record<string, number> = {
        '60': disc60.id, '100': disc100.id, '200': disc200.id,
        '400': disc400.id, '800': disc800.id, '1500': disc1500.id,
    };
    const athleteIdMap: Record<string, string> = {
        B: bondarchukRec.id,
        K: kovalRec.id,
    };

    // lynxEventId is assigned per-competition so @@unique([competitionId, lynxEventId, lynxRoundId]) holds.
    // Mapping: within each comp token, each discipline+gender combo gets its own sequential lynxEventId.
    const eventPlan: Array<{
        n: number; compToken: string; discCode: string;
        gender: Gender; ageCat: AgeCategory; lynxEvId: number;
        who: string; mark: string; sv: number;
        lane: number; bib: string; team: string;
    }> = [
        // === BONDARCHUK: OUTDOOR 100m (10 starts, progression) ===
        { n:  1, compToken: 'MOCK_COMP_TOKEN_05', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '10.85', sv: 10.85, lane: 4, bib: '201', team: 'Київська обл.' },
        { n:  2, compToken: 'MOCK_COMP_TOKEN_06', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '10.78', sv: 10.78, lane: 5, bib: '201', team: 'Київська обл.' },
        { n:  3, compToken: 'MOCK_COMP_TOKEN_07', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '10.71', sv: 10.71, lane: 3, bib: '201', team: 'Київська обл.' },
        { n:  4, compToken: 'MOCK_COMP_TOKEN_08', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '10.68', sv: 10.68, lane: 6, bib: '201', team: 'Київська обл.' },
        { n:  5, compToken: 'MOCK_COMP_TOKEN_09', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '10.65', sv: 10.65, lane: 4, bib: '201', team: 'Київська обл.' },
        { n:  6, compToken: 'MOCK_COMP_TOKEN_10', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '10.67', sv: 10.67, lane: 7, bib: '201', team: 'Київська обл.' },
        { n:  7, compToken: 'MOCK_COMP_TOKEN_17', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '10.61', sv: 10.61, lane: 5, bib: '201', team: 'Київська обл.' },
        { n:  8, compToken: 'MOCK_COMP_TOKEN_18', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '10.58', sv: 10.58, lane: 4, bib: '201', team: 'Київська обл.' },
        { n:  9, compToken: 'MOCK_COMP_TOKEN_19', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '10.55', sv: 10.55, lane: 3, bib: '201', team: 'Київська обл.' },
        { n: 10, compToken: 'MOCK_COMP_TOKEN_20', discCode: '100', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '10.53', sv: 10.53, lane: 6, bib: '201', team: 'Київська обл.' },
        // === BONDARCHUK: OUTDOOR 200m (6 starts) ===
        { n: 11, compToken: 'MOCK_COMP_TOKEN_05', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '21.92', sv: 21.92, lane: 5, bib: '201', team: 'Київська обл.' },
        { n: 12, compToken: 'MOCK_COMP_TOKEN_07', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '21.75', sv: 21.75, lane: 3, bib: '201', team: 'Київська обл.' },
        { n: 13, compToken: 'MOCK_COMP_TOKEN_09', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '21.61', sv: 21.61, lane: 6, bib: '201', team: 'Київська обл.' },
        { n: 14, compToken: 'MOCK_COMP_TOKEN_17', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'B', mark: '21.45', sv: 21.45, lane: 4, bib: '201', team: 'Київська обл.' },
        { n: 15, compToken: 'MOCK_COMP_TOKEN_18', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'B', mark: '21.32', sv: 21.32, lane: 5, bib: '201', team: 'Київська обл.' },
        { n: 16, compToken: 'MOCK_COMP_TOKEN_19', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'B', mark: '21.25', sv: 21.25, lane: 3, bib: '201', team: 'Київська обл.' },
        // === BONDARCHUK: OUTDOOR 400m (5 starts) ===
        { n: 17, compToken: 'MOCK_COMP_TOKEN_06', discCode: '400', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '48.95', sv: 48.95, lane: 7, bib: '201', team: 'Київська обл.' },
        { n: 18, compToken: 'MOCK_COMP_TOKEN_08', discCode: '400', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '48.32', sv: 48.32, lane: 5, bib: '201', team: 'Київська обл.' },
        { n: 19, compToken: 'MOCK_COMP_TOKEN_10', discCode: '400', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '47.88', sv: 47.88, lane: 4, bib: '201', team: 'Київська обл.' },
        { n: 20, compToken: 'MOCK_COMP_TOKEN_17', discCode: '400', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'B', mark: '47.45', sv: 47.45, lane: 6, bib: '201', team: 'Київська обл.' },
        { n: 21, compToken: 'MOCK_COMP_TOKEN_20', discCode: '400', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'B', mark: '47.18', sv: 47.18, lane: 3, bib: '201', team: 'Київська обл.' },
        // === BONDARCHUK: INDOOR 60m (9 starts) ===
        { n: 22, compToken: 'MOCK_COMP_TOKEN_01', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '7.05', sv: 7.05, lane: 3, bib: '201', team: 'Київська обл.' },
        { n: 23, compToken: 'MOCK_COMP_TOKEN_02', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '6.98', sv: 6.98, lane: 5, bib: '201', team: 'Київська обл.' },
        { n: 24, compToken: 'MOCK_COMP_TOKEN_03', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '6.94', sv: 6.94, lane: 4, bib: '201', team: 'Київська обл.' },
        { n: 25, compToken: 'MOCK_COMP_TOKEN_11', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '6.91', sv: 6.91, lane: 6, bib: '201', team: 'Київська обл.' },
        { n: 26, compToken: 'MOCK_COMP_TOKEN_12', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 1, who: 'B', mark: '6.88', sv: 6.88, lane: 4, bib: '201', team: 'Київська обл.' },
        { n: 27, compToken: 'MOCK_COMP_TOKEN_13', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '6.85', sv: 6.85, lane: 5, bib: '201', team: 'Київська обл.' },
        { n: 28, compToken: 'MOCK_COMP_TOKEN_14', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '6.82', sv: 6.82, lane: 3, bib: '201', team: 'Київська обл.' },
        { n: 29, compToken: 'MOCK_COMP_TOKEN_15', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '6.80', sv: 6.80, lane: 7, bib: '201', team: 'Київська обл.' },
        { n: 30, compToken: 'MOCK_COMP_TOKEN_16', discCode: '60', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'B', mark: '6.78', sv: 6.78, lane: 4, bib: '201', team: 'Київська обл.' },
        // === BONDARCHUK: INDOOR 200m (5 starts) ===
        { n: 31, compToken: 'MOCK_COMP_TOKEN_01', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '22.45', sv: 22.45, lane: 5, bib: '201', team: 'Київська обл.' },
        { n: 32, compToken: 'MOCK_COMP_TOKEN_03', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U18, lynxEvId: 2, who: 'B', mark: '22.18', sv: 22.18, lane: 4, bib: '201', team: 'Київська обл.' },
        { n: 33, compToken: 'MOCK_COMP_TOKEN_13', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'B', mark: '21.95', sv: 21.95, lane: 6, bib: '201', team: 'Київська обл.' },
        { n: 34, compToken: 'MOCK_COMP_TOKEN_15', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'B', mark: '21.78', sv: 21.78, lane: 3, bib: '201', team: 'Київська обл.' },
        { n: 35, compToken: 'MOCK_COMP_TOKEN_16', discCode: '200', gender: Gender.MALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'B', mark: '21.62', sv: 21.62, lane: 5, bib: '201', team: 'Київська обл.' },
        // === KOVAL: OUTDOOR 800m (11 starts, progression) ===
        { n: 36, compToken: 'MOCK_COMP_TOKEN_04', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 1, who: 'K', mark: '2:18.45', sv: 138.45, lane: 2, bib: '312', team: 'Львівська обл.' },
        { n: 37, compToken: 'MOCK_COMP_TOKEN_05', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:16.32', sv: 136.32, lane: 5, bib: '312', team: 'Львівська обл.' },
        { n: 38, compToken: 'MOCK_COMP_TOKEN_06', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:14.88', sv: 134.88, lane: 3, bib: '312', team: 'Львівська обл.' },
        { n: 39, compToken: 'MOCK_COMP_TOKEN_07', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:13.45', sv: 133.45, lane: 4, bib: '312', team: 'Львівська обл.' },
        { n: 40, compToken: 'MOCK_COMP_TOKEN_08', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:11.82', sv: 131.82, lane: 6, bib: '312', team: 'Львівська обл.' },
        { n: 41, compToken: 'MOCK_COMP_TOKEN_09', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:10.55', sv: 130.55, lane: 5, bib: '312', team: 'Львівська обл.' },
        { n: 42, compToken: 'MOCK_COMP_TOKEN_10', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:11.23', sv: 131.23, lane: 3, bib: '312', team: 'Львівська обл.' },
        { n: 43, compToken: 'MOCK_COMP_TOKEN_17', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '2:09.78', sv: 129.78, lane: 4, bib: '312', team: 'Львівська обл.' },
        { n: 44, compToken: 'MOCK_COMP_TOKEN_18', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:08.45', sv: 128.45, lane: 7, bib: '312', team: 'Львівська обл.' },
        { n: 45, compToken: 'MOCK_COMP_TOKEN_19', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:07.33', sv: 127.33, lane: 2, bib: '312', team: 'Львівська обл.' },
        { n: 46, compToken: 'MOCK_COMP_TOKEN_20', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:06.91', sv: 126.91, lane: 5, bib: '312', team: 'Львівська обл.' },
        // === KOVAL: OUTDOOR 1500m (6 starts) ===
        { n: 47, compToken: 'MOCK_COMP_TOKEN_05', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '4:42.15', sv: 282.15, lane: 3, bib: '312', team: 'Львівська обл.' },
        { n: 48, compToken: 'MOCK_COMP_TOKEN_06', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '4:38.77', sv: 278.77, lane: 6, bib: '312', team: 'Львівська обл.' },
        { n: 49, compToken: 'MOCK_COMP_TOKEN_08', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '4:35.22', sv: 275.22, lane: 4, bib: '312', team: 'Львівська обл.' },
        { n: 50, compToken: 'MOCK_COMP_TOKEN_10', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '4:33.88', sv: 273.88, lane: 5, bib: '312', team: 'Львівська обл.' },
        { n: 51, compToken: 'MOCK_COMP_TOKEN_17', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 5, who: 'K', mark: '4:30.45', sv: 270.45, lane: 2, bib: '312', team: 'Львівська обл.' },
        { n: 52, compToken: 'MOCK_COMP_TOKEN_19', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '4:27.12', sv: 267.12, lane: 7, bib: '312', team: 'Львівська обл.' },
        // === KOVAL: OUTDOOR 400m (5 starts) ===
        { n: 53, compToken: 'MOCK_COMP_TOKEN_06', discCode: '400', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 5, who: 'K', mark: '57.34', sv: 57.34, lane: 4, bib: '312', team: 'Львівська обл.' },
        { n: 54, compToken: 'MOCK_COMP_TOKEN_07', discCode: '400', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '56.85', sv: 56.85, lane: 6, bib: '312', team: 'Львівська обл.' },
        { n: 55, compToken: 'MOCK_COMP_TOKEN_17', discCode: '400', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 6, who: 'K', mark: '56.12', sv: 56.12, lane: 3, bib: '312', team: 'Львівська обл.' },
        { n: 56, compToken: 'MOCK_COMP_TOKEN_18', discCode: '400', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '55.78', sv: 55.78, lane: 5, bib: '312', team: 'Львівська обл.' },
        { n: 57, compToken: 'MOCK_COMP_TOKEN_20', discCode: '400', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '55.43', sv: 55.43, lane: 4, bib: '312', team: 'Львівська обл.' },
        // === KOVAL: INDOOR 800m (8 starts) ===
        { n: 58, compToken: 'MOCK_COMP_TOKEN_01', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:20.45', sv: 140.45, lane: 4, bib: '312', team: 'Львівська обл.' },
        { n: 59, compToken: 'MOCK_COMP_TOKEN_02', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'K', mark: '2:18.88', sv: 138.88, lane: 5, bib: '312', team: 'Львівська обл.' },
        { n: 60, compToken: 'MOCK_COMP_TOKEN_03', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:17.22', sv: 137.22, lane: 3, bib: '312', team: 'Львівська обл.' },
        { n: 61, compToken: 'MOCK_COMP_TOKEN_11', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'K', mark: '2:15.45', sv: 135.45, lane: 6, bib: '312', team: 'Львівська обл.' },
        { n: 62, compToken: 'MOCK_COMP_TOKEN_12', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'K', mark: '2:13.78', sv: 133.78, lane: 4, bib: '312', team: 'Львівська обл.' },
        { n: 63, compToken: 'MOCK_COMP_TOKEN_13', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:12.45', sv: 132.45, lane: 7, bib: '312', team: 'Львівська обл.' },
        { n: 64, compToken: 'MOCK_COMP_TOKEN_14', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 2, who: 'K', mark: '2:11.22', sv: 131.22, lane: 5, bib: '312', team: 'Львівська обл.' },
        { n: 65, compToken: 'MOCK_COMP_TOKEN_15', discCode: '800', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '2:10.55', sv: 130.55, lane: 3, bib: '312', team: 'Львівська обл.' },
        // === KOVAL: INDOOR 1500m (6 starts) ===
        { n: 66, compToken: 'MOCK_COMP_TOKEN_02', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '4:45.88', sv: 285.88, lane: 2, bib: '312', team: 'Львівська обл.' },
        { n: 67, compToken: 'MOCK_COMP_TOKEN_03', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '4:43.12', sv: 283.12, lane: 6, bib: '312', team: 'Львівська обл.' },
        { n: 68, compToken: 'MOCK_COMP_TOKEN_12', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '4:40.55', sv: 280.55, lane: 4, bib: '312', team: 'Львівська обл.' },
        { n: 69, compToken: 'MOCK_COMP_TOKEN_14', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '4:38.22', sv: 278.22, lane: 3, bib: '312', team: 'Львівська обл.' },
        { n: 70, compToken: 'MOCK_COMP_TOKEN_15', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 4, who: 'K', mark: '4:35.88', sv: 275.88, lane: 7, bib: '312', team: 'Львівська обл.' },
        { n: 71, compToken: 'MOCK_COMP_TOKEN_16', discCode: '1500', gender: Gender.FEMALE, ageCat: AgeCategory.U20, lynxEvId: 3, who: 'K', mark: '4:33.45', sv: 273.45, lane: 5, bib: '312', team: 'Львівська обл.' },
    ];

    // Last result in each athlete+discipline+environment group — PB and current-season SB.
    // Computed from the progression data: each group's minimum sortValue is the last entry.
    const pbSbNs = new Set([10, 16, 21, 30, 35, 46, 52, 57, 65, 71]);

    // Remove any records seeded with the old non-hex ID prefixes (evntmock/heatmock/rsltmock).
    // Those IDs fail the decodeCursor hex-UUID validation when used as pagination cursors.
    for (let i = 1; i <= 71; i++) {
        const n = String(i).padStart(4, '0');
        await prisma.result.deleteMany({ where: { id: `rsltmock-${n}-0000-0000-000000000001` } });
        await prisma.heat.deleteMany({ where: { id: `heatmock-${n}-0000-0000-000000000001` } });
        await prisma.event.deleteMany({ where: { id: `evntmock-${n}-0000-0000-000000000001` } });
    }

    for (const entry of eventPlan) {
        const n = String(entry.n).padStart(4, '0');
        // Prefixes use only hex chars [0-9a-f] so decodeCursor accepts them as pagination cursors.
        const eventId  = `e0e40000-${n}-0000-0000-000000000001`;
        const heatId   = `bea40000-${n}-0000-0000-000000000001`;
        const resultId = `ae540000-${n}-0000-0000-000000000001`;
        const competitionId = mockCompMap[entry.compToken];
        const athleteId     = athleteIdMap[entry.who];
        const scheduledTime = compTime[entry.compToken];
        const isPB = pbSbNs.has(entry.n);
        const isSB = pbSbNs.has(entry.n);

        await prisma.event.upsert({
            where: { id: eventId },
            update: { scheduledTime },
            create: {
                id: eventId,
                competitionId,
                disciplineId: discIdMap[entry.discCode],
                gender: entry.gender,
                ageCategory: entry.ageCat,
                eventType: DisciplineType.TRACK,
                roundName: 'Фінал',
                lynxEventId: entry.lynxEvId,
                lynxRoundId: 1,
                scheduledTime,
            },
        });

        await prisma.heat.upsert({
            where: { id: heatId },
            update: {},
            create: {
                id: heatId,
                eventId,
                status: HeatStatus.OFFICIAL,
                lynxHeatId: 1,
            },
        });

        await prisma.result.upsert({
            where: { heatId_athleteId: { heatId, athleteId } },
            update: { isPB, isSB },
            create: {
                id: resultId,
                heatId,
                athleteId,
                lane: entry.lane,
                bibNumber: entry.bib,
                team: entry.team,
                status: ResultStatus.OK,
                mark: entry.mark,
                sortValue: entry.sv,
                isPB,
                isSB,
            },
        });
    }
    console.log(`${eventPlan.length} mock results seeded (Bondarchuk: 35, Koval: 36).`);

    const adminEmail    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@example.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const credentialsFromEnv = !!(process.env.SEED_ADMIN_EMAIL || process.env.SEED_ADMIN_PASSWORD);

    await prisma.admin.upsert({
        where: { email: adminEmail },
        create: { email: adminEmail, password: hashedPassword, role: 'admin' },
        update: credentialsFromEnv ? { password: hashedPassword } : {},
    });
    console.log(`Default admin upserted: ${adminEmail}`);
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
