import type { z } from 'zod';
import type {
  createRecurringRuleSchema,
  listRecurringRulesSchema,
  recurringRuleListResponseSchema,
  recurringRuleResponseSchema,
  updateRecurringRuleSchema,
} from '../schemas/recurring';

export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleSchema>;
export type UpdateRecurringRuleInput = z.infer<typeof updateRecurringRuleSchema>;
export type ListRecurringRulesInput = z.infer<typeof listRecurringRulesSchema>;
export type RecurringRuleResponse = z.infer<typeof recurringRuleResponseSchema>;
export type RecurringRuleListResponse = z.infer<typeof recurringRuleListResponseSchema>;
