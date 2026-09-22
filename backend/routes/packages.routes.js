import { Router } from 'express';
import {
  listPackages,
  createPackage,
  updatePackageStatus,
  deletePackage
} from '../controllers/packages.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', listPackages);
router.post('/', createPackage);
router.patch('/:id/status', updatePackageStatus);
router.delete('/:id', deletePackage);

export default router;
