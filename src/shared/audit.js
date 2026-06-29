import { supabaseAdmin } from '../config/supabase.js';
import { logger } from './logger.js';

const AUDIT_BATCH_SIZE = 100;
const AUDIT_FLUSH_INTERVAL = 5000; // 5 seconds

// In-memory buffer for batching (use Redis in production for multi-instance)
let auditBuffer = [];
let flushTimer = null;

function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flushAuditBuffer();
    }, AUDIT_FLUSH_INTERVAL);
}

async function flushAuditBuffer() {
    if (auditBuffer.length === 0) return;

    const toInsert = auditBuffer.splice(0, AUDIT_BATCH_SIZE);
    try {
        const { error } = await supabaseAdmin.from('audit_log').insert(toInsert);
        if (error) {
            logger.error({ error, count: toInsert.length }, 'Failed to write audit logs');
            // Re-add to buffer for retry (with limit to prevent memory leak)
            if (auditBuffer.length < 10000) {
                auditBuffer.unshift(...toInsert);
            }
        }
    } catch (err) {
        logger.error({ err, count: toInsert.length }, 'Audit log insert exception');
    }
}

/**
 * Record an audit event
 * Buffers in memory and flushes periodically for performance
 */
export async function recordAudit(event) {
    const enrichedEvent = {
        ...event,
        severity: event.severity || 'info',
        metadata: {
            ...event.metadata,
            timestamp: new Date().toISOString(),
        },
    };

    auditBuffer.push(enrichedEvent);
    scheduleFlush();

    // Immediate flush for critical events
    if (event.severity === 'critical') {
        await flushAuditBuffer();
    }
}

/**
 * Flush all buffered audit logs immediately
 */
export async function flushAudit() {
    await flushAuditBuffer();
}

/**
 * Helper for authentication events
 */
export const auditAuth = {
    login: (userId, role, metadata) =>
        recordAudit({
            event_type: 'auth.login',
            severity: 'info',
            actor_id: userId,
            actor_role: role,
            metadata,
        }),

    logout: (userId, role, metadata) =>
        recordAudit({
            event_type: 'auth.logout',
            severity: 'info',
            actor_id: userId,
            actor_role: role,
            metadata,
        }),

    failed_login: (email, metadata) =>
        recordAudit({
            event_type: 'auth.login_failed',
            severity: 'warning',
            metadata: { email, ...metadata },
        }),

    token_refresh: (userId, metadata) =>
        recordAudit({
            event_type: 'auth.token_refresh',
            severity: 'info',
            actor_id: userId,
            metadata,
        }),
};

/**
 * Helper for RBAC events
 */
export const auditRbac = {
    grant_permission: (actorId, actorRole, targetUserId, permission, targetId) =>
        recordAudit({
            event_type: 'rbac.grant_permission',
            severity: 'warning',
            actor_id: actorId,
            actor_role: actorRole,
            target_type: 'user_permission',
            target_id: targetUserId,
            new_values: { permission, target_id: targetId },
            metadata: { permission, scope: targetId },
        }),

    revoke_permission: (actorId, actorRole, targetUserId, permission, targetId) =>
        recordAudit({
            event_type: 'rbac.revoke_permission',
            severity: 'warning',
            actor_id: actorId,
            actor_role: actorRole,
            target_type: 'user_permission',
            target_id: targetUserId,
            old_values: { permission, target_id: targetId },
            metadata: { permission, scope: targetId },
        }),

    change_role: (actorId, actorRole, targetUserId, oldRole, newRole) =>
        recordAudit({
            event_type: 'rbac.change_role',
            severity: 'critical',
            actor_id: actorId,
            actor_role: actorRole,
            target_type: 'profile',
            target_id: targetUserId,
            old_values: { base_role: oldRole },
            new_values: { base_role: newRole },
        }),
};

/**
 * Helper for data modification events
 */
export const auditData = {
    create: (actorId, actorRole, targetType, targetId, newValues, metadata) =>
        recordAudit({
            event_type: `data.create`,
            severity: 'info',
            actor_id: actorId,
            actor_role: actorRole,
            target_type: targetType,
            target_id: targetId,
            new_values: newValues,
            metadata,
        }),

    update: (actorId, actorRole, targetType, targetId, oldValues, newValues, metadata) =>
        recordAudit({
            event_type: `data.update`,
            severity: 'info',
            actor_id: actorId,
            actor_role: actorRole,
            target_type: targetType,
            target_id: targetId,
            old_values: oldValues,
            new_values: newValues,
            metadata,
        }),

    delete: (actorId, actorRole, targetType, targetId, oldValues, metadata) =>
        recordAudit({
            event_type: `data.delete`,
            severity: 'warning',
            actor_id: actorId,
            actor_role: actorRole,
            target_type: targetType,
            target_id: targetId,
            old_values: oldValues,
            metadata,
        }),
};

/**
 * Helper for admin actions
 */
export const auditAdmin = {
    action: (actorId, action, details, severity = 'warning') =>
        recordAudit({
            event_type: 'admin.action',
            severity,
            actor_id: actorId,
            actor_role: 'admin',
            metadata: { action, ...details },
        }),

    bulk_operation: (actorId, operation, affectedCount, details) =>
        recordAudit({
            event_type: 'admin.bulk_operation',
            severity: 'critical',
            actor_id: actorId,
            actor_role: 'admin',
            metadata: { operation, affected_count: affectedCount, ...details },
        }),
};

/**
 * Helper for AI agent actions
 */
export const auditAI = {
    recommendation: (actorId, agentType, input, output) =>
        recordAudit({
            event_type: 'ai.recommendation',
            severity: 'info',
            actor_id: actorId,
            metadata: { agent_type: agentType, input, output },
        }),

    anomaly_detected: (agentType, anomalies) =>
        recordAudit({
            event_type: 'ai.anomaly_detected',
            severity: 'warning',
            metadata: { agent_type: agentType, anomalies },
        }),
};