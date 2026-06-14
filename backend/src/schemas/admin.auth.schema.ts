import { z } from 'zod';

/**
 * Zod schema for validating the admin login request body.
 * Wrapped in `{ body }` to match the `validateDto` middleware contract.
 */
export const AdminLoginSchema = z.object({
    body: z.object({
        email: z.email(),
        password: z.string().min(1),
    }),
});

/** Inferred TypeScript type for the admin login request body. */
export type AdminLoginDto = z.infer<typeof AdminLoginSchema>['body'];
