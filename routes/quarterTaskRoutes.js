import express from "express"
const router = express.Router();
import { createQuarterTask, fetch_KPI_data_byId, fetchGoals, getEmployeeCount_filledKPI, getQuarterly_month_data, insertKPITargetHistory, saveGoalTargets_forUpdate, updataKPIComment_achieved, updateBalance_KPITarget, updateGoalTilte, updateKPIAchieved, updateNewTarget, updateOldtargets } from '../controller/quarterTaskController.js';

// Route handlers
router.post('/create_quarter_task', createQuarterTask);
router.get('/fetch_goals', fetchGoals);
router.get('/get_quarterly_month_data', getQuarterly_month_data);
router.put('/update_balance_kpiTarget', updateBalance_KPITarget)
router.get('/fetch_kpi_data_byId', fetch_KPI_data_byId)
router.put('/update_kpi_comment_achieved', updataKPIComment_achieved)
router.put('/update_new_target', updateNewTarget)
router.post('/insert_kpi_targetHistory', insertKPITargetHistory)
router.put('/update_oldTargets', updateOldtargets)
router.post('/save_goalTarget_aginst_existingGoal', saveGoalTargets_forUpdate)
router.put('/update_goalTitle', updateGoalTilte)
router.put('/update_kpiAchieved', updateKPIAchieved)
router.get('/fetch_emp_count_kpiFilled', getEmployeeCount_filledKPI);

export default router;
