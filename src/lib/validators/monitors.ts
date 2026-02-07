import { z } from 'zod';

// Monitor schemas
export const createMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  check_interval_minutes: z.number().int().positive(),
  conditions: z.array(z.discriminatedUnion('type', [
    // Status change condition
    z.object({
      type: z.literal('STATUS_CHANGE'),
      config: z.object({
        mode: z.enum(['match_any', 'detect_transition']),
        status_selector: z.string().optional(),
        status_keywords: z.array(z.string()).optional(),
        notify_on: z.enum(['any_change', 'specific_transition']).optional(),
        from_value: z.string().optional(),
        to_value: z.string().optional(),
      }),
    }),
    // Text match condition
    z.object({
      type: z.literal('TEXT_MATCH'),
      config: z.object({
        text_to_match: z.string().min(1),
        match_mode: z.enum(['exact', 'contains', 'regex']),
        trigger_on: z.enum(['appears', 'disappears', 'both']),
      }),
    }),
    // Selector change condition (Pro only)
    z.object({
      type: z.literal('SELECTOR_CHANGE'),
      config: z.object({
        css_selector: z.string().min(1),
        trigger_on: z.enum(['any_change', 'transition']),
        from_value: z.string().optional(),
        to_value: z.string().optional(),
      }),
    }),
  ])).min(1),
  notify_email: z.string().email().optional(),
});

export const updateMonitorSchema = createMonitorSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const testMonitorSchema = z.object({
  monitorId: z.string().uuid(),
});

// Stripe schemas
export const createCheckoutSchema = z.object({
  priceId: z.string(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url(),
});

// Plan limits enforcement
export interface PlanLimits {
  maxMonitors: number;
  minIntervalMinutes: number;
  maxConditionsPerMonitor: number;
  features: string[];
}

export function enforcePlanLimits(
  plan: 'FREE' | 'PRO',
  currentMonitors: number,
  currentConditions: number,
  newIntervalMinutes: number,
  newConditionsCount: number
): { allowed: boolean; reason?: string } {
  const limits: Record<string, PlanLimits> = {
    FREE: {
      maxMonitors: 2,
      minIntervalMinutes: 360,
      maxConditionsPerMonitor: 1,
      features: ['email', 'basic_matching'],
    },
    PRO: {
      maxMonitors: 20,
      minIntervalMinutes: 30,
      maxConditionsPerMonitor: 2,
      features: ['email', 'history', 'regex', 'selector_change', 'custom_cooldown'],
    },
  };

  const planLimits = limits[plan];

  // Check monitor count
  if (currentMonitors >= planLimits.maxMonitors) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows maximum ${planLimits.maxMonitors} active monitors.`,
    };
  }

  // Check interval
  if (newIntervalMinutes < planLimits.minIntervalMinutes) {
    return {
      allowed: false,
      reason: `Your ${plan} plan requires minimum interval of ${planLimits.minIntervalMinutes} minutes.`,
    };
  }

  // Check conditions per monitor
  if (newConditionsCount > planLimits.maxConditionsPerMonitor) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows maximum ${planLimits.maxConditionsPerMonitor} conditions per monitor.`,
    };
  }

  // Check PRO features for regex and selector
  if (plan === 'FREE') {
    // Would need to check if conditions use PRO features
    // This will be validated at creation time
  }

  return { allowed: true };
}

// Type exports
export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
