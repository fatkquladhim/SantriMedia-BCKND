export class AppError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} tidak ditemukan`, 404);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Akses ditolak') {
        super(message, 403);
    }
}

export class ValidationError extends AppError {
    constructor(errors) {
        super('Validation error', 422, errors);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Data sudah ada') {
        super(message, 409);
    }
}
