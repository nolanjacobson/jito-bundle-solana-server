import { Router } from 'express';
import { bundleTransfer } from '../controllers/transactionController';

const router = Router();

router.post('/transfer', bundleTransfer);

export default router;