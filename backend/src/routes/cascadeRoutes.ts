// src/routes/cascadeRoutes.ts
import { Router } from 'express';
import { analyzeCascadeRisk } from '../controllers/cascadeController';

const router = Router();
router.post('/analyze-blast-radius', analyzeCascadeRisk);

export default router;