/**
 * Layer 3: Check dynamic permissions.
 * Admin always bypasses.
 * User needs at least ONE of the required permissions.
 * @param  {...string} requiredPermissions — e.g. permissionGuard('staf_kantor', 'sdm')
 */
export const permissionGuard = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Admin bypass
        if (req.user.base_role === 'admin') {
            return next();
        }

        const userPerms = req.user.dynamic_permissions || [];
        const hasPermission = requiredPermissions.some((p) => userPerms.includes(p));

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Butuh permission: ${requiredPermissions.join(' atau ')}`,
            });
        }

        next();
    };
};
