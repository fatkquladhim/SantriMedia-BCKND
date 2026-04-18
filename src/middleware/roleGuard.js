/**
 * Layer 2: Check base role.
 * Admin always bypasses.
 * @param  {...string} allowedRoles — e.g. roleGuard('admin', 'kepala_kamar')
 */
export const roleGuard = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Admin bypass
        if (req.user.base_role === 'admin') {
            return next();
        }

        if (!allowedRoles.includes(req.user.base_role)) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Butuh role: ${allowedRoles.join(', ')}`,
            });
        }

        next();
    };
};
