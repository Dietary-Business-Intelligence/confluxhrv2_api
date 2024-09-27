import express from "express"
const router = express.Router();
import { GenerateToken } from "../middleware/authMiddleware.js";
// Route handlers
router.post('/api/v1/generatetoken', GenerateToken)
export default router;