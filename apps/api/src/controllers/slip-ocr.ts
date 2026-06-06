import * as slipOcrService from '../services/slip-ocr';

type AuthContext = { user: { sub: string } };

export async function handleVerifySlip({
  user,
  params,
  body,
}: AuthContext & { params: { id: string }; body: { slip_image: File } }) {
  const file = body.slip_image;
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  return await slipOcrService.verifySlipService(user.sub, params.id, base64, file.type);
}

export async function handleExtractReceipt({ body }: { body: { slip_image: File } }) {
  const file = body.slip_image;
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  return await slipOcrService.extractReceiptService(base64, file.type);
}
