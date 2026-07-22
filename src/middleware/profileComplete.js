/**
 * Profile completeness gate.
 * Blocks API access if user's profile is not complete.
 * Admin bypass: admin selalu dianggap profile complete, tidak perlu onboarding.
 */
export const profileComplete = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Admin bypass — tidak perlu melengkapi profil
    if (req.user.base_role === 'admin') {
        return next();
    }

    if (!req.user.is_profile_complete) {
        return res.status(403).json({
            success: false,
            message: 'Profil belum lengkap. Silakan lengkapi profil terlebih dahulu.',
            code: 'PROFILE_INCOMPLETE',
        });
    }

    next();
};
