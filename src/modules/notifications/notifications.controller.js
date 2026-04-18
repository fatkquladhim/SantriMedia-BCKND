import { NotificationService } from './notifications.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const notificationService = new NotificationService();

export const list = async (req, res, next) => {
    try {
        const { offset, limit, page } = parsePagination(req.query);
        const { data, total } = await notificationService.list(req.user.id, { 
            offset, 
            limit, 
            isRead: req.query.is_read 
        });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const markAsRead = async (req, res, next) => {
    try {
        const data = await notificationService.markAsRead(req.params.id, req.user.id);
        return ApiResponse.success(res, data, 'Notification marked as read');
    } catch (err) { next(err); }
};

export const markAllAsRead = async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (err) { next(err); }
};
