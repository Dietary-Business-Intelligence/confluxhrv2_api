import express from "express"
const router = express.Router();
import { AddBasicERmpDet, GetEmployeeDetails } from '../controller/employeeController.js';
import { verifyToken } from "../middleware/authMiddleware.js";
// Route handlers

router.post('/api/v1/add_basicEmpDetails', AddBasicERmpDet)
router.get('/api/v1/getemployeedetails', verifyToken, GetEmployeeDetails)
export default router;