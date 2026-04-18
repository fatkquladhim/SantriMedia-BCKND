import { TaskDispatcherService } from './taskDispatcher.service.js';
import { GradingAssistantService } from './gradingAssistant.service.js';
import { InventoryAnomalyService } from './inventoryAnomaly.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';

const taskDispatcher = new TaskDispatcherService();
const gradingAssistant = new GradingAssistantService();
const inventoryAnomaly = new InventoryAnomalyService();

export const recommendAssignment = async (req, res, next) => {
    try {
        const { divisi_id, task_description } = req.body;
        const result = await taskDispatcher.recommendAssignment(divisi_id, task_description);
        return ApiResponse.success(res, result, 'AI recommendation generated');
    } catch (err) { next(err); }
};

export const recommendGrade = async (req, res, next) => {
    try {
        const result = await gradingAssistant.recommendGrade(req.params.userId, req.query.periode);
        return ApiResponse.success(res, result, 'AI grade recommendation generated');
    } catch (err) { next(err); }
};

export const detectAnomalies = async (req, res, next) => {
    try {
        const result = await inventoryAnomaly.detectAnomalies();
        return ApiResponse.success(res, result, 'AI anomaly detection completed');
    } catch (err) { next(err); }
};
