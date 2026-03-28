import { Router } from 'express';
import { reportsController } from './reports.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

// All report routes require authentication
router.use(requireAuth);

// Dashboard (available to all authenticated users)
router.get('/dashboard-stats', reportsController.dashboardStats);

// Detailed reports (manager/admin only)
router.get('/sales', requireRole(['ADMIN', 'MANAGER']), reportsController.salesReport);
router.get('/agent-performance', requireRole(['ADMIN', 'MANAGER']), reportsController.agentPerformance);
router.get('/commissions', requireRole(['ADMIN', 'MANAGER']), reportsController.commissionReport);
router.get('/portal-performance', requireRole(['ADMIN', 'MANAGER']), reportsController.portalPerformance);

export default router;
