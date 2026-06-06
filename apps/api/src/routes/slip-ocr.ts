import { Elysia, t } from 'elysia';
import { handleVerifySlip, handleExtractReceipt } from '../controllers/slip-ocr';
import { requireAuth } from '../middleware/auth';

export const slipOcrRoute = new Elysia()
  .use(requireAuth)
  .post('/settlement/:id/verify-slip', handleVerifySlip, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      slip_image: t.File(),
    }),
  })
  .post('/extract-receipt', handleExtractReceipt, {
    body: t.Object({
      slip_image: t.File(),
    }),
  });
