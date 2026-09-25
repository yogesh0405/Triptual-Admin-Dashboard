import { Router } from 'express';
import multer from 'multer';
import {
  listPackages,
  createPackage,
  updatePackageStatus,
  deletePackage,
  uploadPackageImage,
} from '../controllers/packages.controller.js';
import { authenticate } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();
router.use(authenticate);

router.get('/', listPackages);
router.post('/', createPackage);
router.post('/upload-image', upload.single('image'), uploadPackageImage);
router.patch('/:id/status', updatePackageStatus);
router.delete('/:id', deletePackage);

export default router;
