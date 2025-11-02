import { supabase } from './supabase';
import { monitoring } from './monitoring';

interface AuditLogParams {
  userId?: string;
  userRole?: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  actionDetails?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  isAiAction?: boolean;
  aiModelVersion?: string;
  aiConfidence?: number;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: params.userId,
      user_role: params.userRole,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action_details: params.actionDetails || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent || navigator.userAgent,
      is_ai_action: params.isAiAction || false,
      ai_model_version: params.aiModelVersion,
      ai_confidence: params.aiConfidence,
    });

    if (error) {
      throw error;
    }

    monitoring.info('Audit log created', {
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  } catch (error: any) {
    monitoring.error('Failed to create audit log', {
      error: error.message,
      params,
    });
  }
}

export function auditWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getAuditParams: (...args: Parameters<T>) => Omit<AuditLogParams, 'userAgent'>
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = await fn(...args);
    const duration = performance.now() - startTime;

    const auditParams = getAuditParams(...args);
    await createAuditLog({
      ...auditParams,
      actionDetails: {
        ...auditParams.actionDetails,
        duration,
        success: true,
      },
    });

    return result;
  }) as T;
}
