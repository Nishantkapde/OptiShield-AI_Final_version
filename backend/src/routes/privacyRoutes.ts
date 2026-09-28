import { Router } from 'express';
import { analyzeLogPrivacy } from '../controllers/privacyController';

const router = Router();

router.post('/analyze-log', analyzeLogPrivacy);

export default router;