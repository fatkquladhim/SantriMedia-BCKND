import { validationResult } from 'express-validator';

/**
 * Middleware wrapper: runs express-validator checks and returns 422 on failure.
 * Usage: router.post('/', validate(myChecks), controller.create)
 * @param {Array} validations — array of express-validator check chains
 */
export const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((v) => v.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(422).json({
            success: false,
            message: 'Validation error',
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    };
};
