import { z } from 'zod';

export const tenantIdSchema = z.string().min(1);
export type TenantId = z.infer<typeof tenantIdSchema>;

export const DEMO_TENANT_ID: TenantId = 'demo';