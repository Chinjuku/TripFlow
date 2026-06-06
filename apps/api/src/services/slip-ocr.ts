import {
  db,
  settlements,
  userPaymentDetails,
} from '@trip-flow/db/server';
import { eq } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, DomainError } from '../errors/domain';
import { loadTripMembers } from './trips';
import type { HydratedSettlement } from '../models/finances';

export interface VerifySlipResult {
  isMatch: boolean;
  reason?: string;
  settlement?: HydratedSettlement;
}

/**
 * Verifies an e-slip using Gemini Vision AI.
 */
export async function verifySlipService(
  userId: string,
  settlementId: string,
  slipImageBase64: string,
  mimeType: string,
): Promise<VerifySlipResult> {
  // 1. Fetch settlement to find expected amount
  const [settlement] = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  if (!settlement) {
    throw new NotFoundError('Settlement not found');
  }

  // Ensure caller is the payer (the one uploading the slip) or payee
  if (settlement.payer_id !== userId && settlement.payee_id !== userId) {
    throw new ForbiddenError('You do not have permission to verify this settlement');
  }

  if (settlement.status === 'completed') {
    throw new Error('Settlement is already completed');
  }

  const expectedAmount = settlement.amount;

  // Fetch payee details to perform advanced destination verification
  const members = await loadTripMembers(settlement.trip_id);
  const payeeMember = members.find((m) => m.userId === settlement.payee_id);
  const payeeName = payeeMember?.name || '';

  const [payeePaymentDetails] = await db
    .select()
    .from(userPaymentDetails)
    .where(eq(userPaymentDetails.user_id, settlement.payee_id))
    .limit(1);

  const expectedPromptpayId = payeePaymentDetails?.is_show_promptpay
    ? payeePaymentDetails?.promptpay_id || ''
    : '';
  const expectedBankName = payeePaymentDetails?.is_show_mobile_banking
    ? payeePaymentDetails?.bank_name || ''
    : '';
  const expectedBankAccountNumber = payeePaymentDetails?.is_show_mobile_banking
    ? payeePaymentDetails?.bank_account_number || ''
    : '';
  const expectedBankAccountName = payeePaymentDetails?.is_show_mobile_banking
    ? payeePaymentDetails?.bank_account_name || ''
    : '';

  // 2. Setup Typhoon OCR
  const { env } = await import('../env');
  if (!env.typhoonOcrApiKey) {
    throw new Error('TYPHOON_OCR_API_KEY is not configured on the server');
  }

  const prompt = `
คุณคือ AI ผู้เชี่ยวชาญด้านการตรวจสอบและสกัดข้อมูลจากภาพสลิปโอนเงิน (e-slip) ของธนาคารในประเทศไทยและ TrueMoney Wallet

หน้าที่ของคุณคือ:
1. อ่านข้อมูลจากภาพสลิปที่แนบมานี้ และสกัดข้อมูลออกมาเป็นรูปแบบ JSON ตามโครงสร้างที่กำหนดไว้เท่านั้น ห้ามอธิบายเพิ่มเติม ห้ามมีข้อความทักทาย
2. ** ตรวจสอบข้อมูลบัญชีปลายทางและรายละเอียดการรับเงินอย่างเข้มงวดที่สุด ** เพื่อความถูกต้องตามข้อมูลผู้รับเงิน (Payee) ดังนี้:
   - ชื่อผู้รับโอนคาดหวัง (Payee Name): "${payeeName}" หรือชื่อบัญชีธนาคาร "${expectedBankAccountName}"
   - ธนาคารผู้รับคาดหวัง (Bank Name): "${expectedBankName || 'ไม่ได้ลงทะเบียน'}"
   - เลขบัญชีผู้รับคาดหวัง (Bank Account Number): "${expectedBankAccountNumber || 'ไม่ได้ลงทะเบียน'}"
   - เบอร์ PromptPay ผู้รับคาดหวัง (PromptPay ID): "${expectedPromptpayId || 'ไม่ได้ลงทะเบียน'}"
   - ยอดเงินที่คาดหวัง (Expected Amount): ${expectedAmount} บาท

ข้อกำหนดการตรวจสอบ (Verification Rules) แบ่งเป็น 2 กรณีตามประเภทสลิป:

1. **กรณีเป็นสลิปพร้อมเพย์ (PromptPay)** (สลิปที่มีการโอนเข้าเบอร์โทรศัพท์/เลขบัตรประชาชน/รหัสพร้อมเพย์):
   - ให้ตรวจสอบ **เบอร์โทรศัพท์หรือรหัส PromptPay ปลายทางผู้รับ (ผู้รับโอน) เท่านั้น** บนสลิป ว่าตรงกับเบอร์ PromptPay ผู้รับคาดหวัง: "${expectedPromptpayId}" หรือไม่ **ห้ามสับสนหรือไปตรวจกับเบอร์/รหัสของฝั่งผู้โอน (ต้นทาง) เด็ดขาด**
   - ตรวจสอบ **จำนวนเงินที่โอน (Amount)** บนสลิป ว่าตรงกับยอดเงินที่คาดหวัง: ${expectedAmount} บาทหรือไม่
   - หากข้อมูลไม่ถูกต้องหรือตรวจสอบไม่ได้ ให้ประเมิน is_receiver_match: false และระบุเหตุผลใน mismatch_reason
   - หากตรงกัน ให้ถือว่าผ่าน (is_receiver_match: true)

2. **กรณีเป็นสลิปโอนเข้าบัญชีธนาคารโดยตรง (Mobile Banking / Bank Transfer)** (สลิปที่มีการโอนเข้าเลขบัญชีธนาคาร):
   - ให้ตรวจสอบ **เลขที่บัญชีปลายทาง (ผู้รับโอน) เท่านั้น** บนสลิป (โดยปกติธนาคารจะใส่ดอกจันเซนเซอร์ตัวเลขหรือกากาบาท (X) ให้เช็คว่าเลขท้าย 3-4 หลักที่แสดงอยู่บนสลิป ตรงกับเลขบัญชีผู้รับคาดหวัง: "${expectedBankAccountNumber}" หรือไม่) **ห้ามสับสนหรือนำเลขที่บัญชีของผู้โอน (ต้นทาง) มาใช้ตรวจสอบเด็ดขาด**
   - ตรวจสอบ **จำนวนเงินที่โอน (Amount)** บนสลิป ว่าตรงกับยอดเงินที่คาดหวัง: ${expectedAmount} บาทหรือไม่
   - ตรวจสอบ **ชื่อบัญชีผู้รับปลายทาง (Receiver Name)** บนสลิป ว่าตรงหรือใกล้เคียงกับชื่อบัญชีคาดหวัง: "${expectedBankAccountName || payeeName}" (มีความคล้ายคลึง มีการแปลภาษา หรือเป็นคนเดียวกัน) หรือไม่
   - หากข้อมูลไม่ถูกต้องหรือตรวจสอบไม่ได้ ให้ประเมิน is_receiver_match: false และระบุเหตุผลใน mismatch_reason
   - หากตรงกันทั้งหมด ให้ถือว่าผ่าน (is_receiver_match: true)

ข้อกำหนดเพิ่มเติม:
- **สำคัญมาก**: ภาพที่แนบมา **ต้องเป็นภาพสลิปการโอนเงิน (e-slip) ที่ออกโดยแอปพลิเคชันธนาคาร หรือ TrueMoney จริงๆ เท่านั้น** หากรูปภาพเป็นเพียงภาพแคปหน้าจอ (Screenshot) ของแอปพลิเคชันอื่น, เป็นรูปถ่ายธรรมดา, หรือมีลักษณะไม่ใช่สลิปโอนเงิน ให้ถือว่าไม่ถูกต้องทันที และระบุ mismatch_reason เป็น "รูปภาพที่อัปโหลดไม่ใช่สลิปการโอนเงินที่ถูกต้อง" และให้ is_receiver_match: false

ข้อกำหนดด้านความถูกต้องของผลลัพธ์:
1. หากอ่านข้อมูลส่วนไหนไม่ได้ หรือไม่มีในสลิป ให้ใส่ค่าเป็น null
2. "amount" ต้องเป็นตัวเลขเท่านั้น (Number) ไม่เอาเครื่องหมายลูกน้ำ (,) หรือตัวอักษร หากไม่ใช่สลิปให้ใส่ 0
3. "datetime" ให้อยู่ในรูปแบบ "YYYY-MM-DD HH:MM" (ปี ค.ศ.)
4. ตอบกลับมาเป็น JSON เปล่าๆ ไม่ต้องมี Markdown Code Block ครอบ

โครงสร้าง JSON ที่ต้องการ:
{
  "sender_bank": "ชื่อธนาคาร หรือ TrueMoney ของผู้โอน",
  "sender_name": "ชื่อผู้โอน",
  "receiver_bank": "ชื่อธนาคาร หรือ TrueMoney ของผู้รับ",
  "receiver_name": "ชื่อผู้รับ",
  "amount": 0.00,
  "datetime": "YYYY-MM-DD HH:MM",
  "reference_no": "เลขอ้างอิงรายการ (ถ้ามี)",
  "is_receiver_match": true หรือ false,
  "mismatch_reason": "ระบุเหตุผลภาษาไทยที่ข้อมูลไม่ตรง เช่น 'เบอร์ PromptPay ปลายทางไม่ตรงกับที่ลงทะเบียนไว้' หรือ 'เลขบัญชีปลายทางไม่ตรงกับบัญชีที่ลงทะเบียนไว้' (หากตรงกันดีทั้งหมดให้ใส่ null)"
}
  `;

  // 3. Call Typhoon OCR API to extract raw text
  let responseText = '';
  try {
    let rawOcrText = '';
    const formData = new FormData();
    const buffer = Buffer.from(slipImageBase64, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, 'slip.jpg');
    formData.append('model', 'typhoon-ocr');

    const ocrResponse = await fetch('https://api.opentyphoon.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.typhoonOcrApiKey}`,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      throw new Error(`Typhoon OCR API error: ${ocrResponse.status} ${errorText}`);
    }

    const ocrResult = (await ocrResponse.json()) as any;
    for (const pageResult of ocrResult.results || []) {
      if (pageResult.success && pageResult.message) {
        rawOcrText += pageResult.message.choices[0].message.content + '\n';
      } else if (!pageResult.success) {
        throw new Error(`Typhoon page processing error: ${pageResult.error}`);
      }
    }

    // 4. Use Typhoon Chat Completions to parse the text into JSON
    const chatPrompt = prompt + `\n\nTEXT:\n${rawOcrText}`;
    const chatResponse = await fetch('https://api.opentyphoon.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.typhoonOcrApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'typhoon-v2.5-30b-a3b-instruct',
        messages: [{ role: 'user', content: chatPrompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!chatResponse.ok) {
      const err = await chatResponse.text();
      throw new Error(`Typhoon Chat API error: ${chatResponse.status} ${err}`);
    }

    const chatJson = (await chatResponse.json()) as any;
    responseText = chatJson.choices[0].message.content;
  } catch (error) {
    console.error('Typhoon OCR API Error:', error);
    await db.delete(settlements).where(eq(settlements.id, settlementId));
    const errStr = String(error);
    let friendlyReason =
      'ระบบ AI ตรวจสอบสลิปขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือยืนยันด้วยวิธีอื่น';
    if (
      errStr.includes('429') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('quota') ||
      errStr.includes('Quota')
    ) {
      friendlyReason =
        'ระบบตรวจสอบสลิปอัตโนมัติ (AI) เกินโควตาการใช้งานชั่วคราวแล้ว กรุณายืนยันการชำระเงินด้วยวิธีอื่น หรือลองอีกครั้งในภายหลัง';
    }
    return {
      isMatch: false,
      reason: friendlyReason,
    };
  }

  // 4. Parse JSON Response
  // Remove markdown formatting if the model still includes it
  let cleanJson = responseText.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json/, '');
    cleanJson = cleanJson.replace(/```$/, '');
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```/, '');
    cleanJson = cleanJson.replace(/```$/, '');
  }

  let extractedData;
  try {
    extractedData = JSON.parse(cleanJson.trim());
  } catch (err) {
    console.error('Failed to parse Gemini output:', responseText);
    await db.delete(settlements).where(eq(settlements.id, settlementId));
    return {
      isMatch: false,
      reason: 'ไม่สามารถอ่านข้อมูลจากรูปภาพได้ (Invalid JSON)',
    };
  }

  // 5. Compare amount
  const extractedAmount = Number(extractedData.amount);
  if (isNaN(extractedAmount) || extractedAmount === 0 || !extractedData.amount) {
    await db.delete(settlements).where(eq(settlements.id, settlementId));
    return {
      isMatch: false,
      reason: 'ไม่พบยอดเงินในสลิปนี้ หรือไม่ใช่สลิปที่ถูกต้อง',
    };
  }

  // Allow a tiny float difference just in case
  if (Math.abs(extractedAmount - expectedAmount) > 0.05) {
    await db.delete(settlements).where(eq(settlements.id, settlementId));
    return {
      isMatch: false,
      reason: `ยอดเงินในสลิป (฿${extractedAmount.toFixed(2)}) ไม่ตรงกับยอดที่ต้องชำระ (฿${expectedAmount.toFixed(2)})`,
    };
  }

  // Check destination payee matching
  if (extractedData.is_receiver_match === false) {
    await db.delete(settlements).where(eq(settlements.id, settlementId));
    return {
      isMatch: false,
      reason:
        extractedData.mismatch_reason ||
        'ข้อมูลบัญชีปลายทางผู้รับโอนไม่ตรงกับข้อมูลผู้รับเงินในระบบ',
    };
  }

  // 6. Verification Success -> Update Database
  const [updated] = await db
    .update(settlements)
    .set({ status: 'completed', updated_at: new Date().toISOString() })
    .where(eq(settlements.id, settlementId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update settlement status');
  }

  const refreshedMembers = await loadTripMembers(updated.trip_id);
  const memberMap = new Map(refreshedMembers.map((m) => [m.userId, m]));
  const payer = memberMap.get(updated.payer_id);
  const payee = memberMap.get(updated.payee_id);

  const hydratedUpdated: HydratedSettlement = {
    ...updated,
    payerName: payer?.name ?? 'Traveller',
    payerAvatarUrl: payer?.avatarUrl ?? null,
    payeeName: payee?.name ?? 'Traveller',
    payeeAvatarUrl: payee?.avatarUrl ?? null,
  };

  return {
    isMatch: true,
    settlement: hydratedUpdated,
  };
}

// Updated interface to include sender_name and bank_name
export interface ExtractReceiptResult {
  merchant: string | null;
  amount: number | null;
  datetime: string | null;
  sender_name: string | null;
  bank_name: string | null;
}

/**
 * Extracts receipt information (merchant, amount, datetime, sender_name, bank_name) from an image.
 */
export async function extractReceiptService(
  slipImageBase64: string,
  mimeType: string,
): Promise<ExtractReceiptResult> {
  const { env } = await import('../env');
  if (!env.typhoonOcrApiKey) {
    throw new Error('TYPHOON_OCR_API_KEY is not configured on the server');
  }

  const prompt = `
คุณคือ AI ผู้เชี่ยวชาญด้านการอ่านใบเสร็จรับเงิน (Receipt) หรือสลิปค่าใช้จ่าย

หน้าที่ของคุณคือ:
อ่านข้อมูลจากภาพใบเสร็จที่แนบมานี้ และสกัดข้อมูลออกมาเป็นรูปแบบ JSON ตามโครงสร้างที่กำหนดไว้เท่านั้น ห้ามอธิบายเพิ่มเติม ห้ามมีข้อความทักทาย

ข้อกำหนด:
1. หากอ่านข้อมูลส่วนไหนไม่ได้ หรือไม่มีในสลิป ให้ใส่ค่าเป็น null
2. "amount" คือยอดรวมสุทธิ (Grand Total / Total Amount) ต้องเป็นตัวเลขเท่านั้น (Number)
3. "datetime" ให้อยู่ในรูปแบบ "YYYY-MM-DDTHH:MM" (ปี ค.ศ.) ถ้ามีแต่วันที่ ให้ใส่เวลาเป็น 00:00
4. "sender_name" คือชื่อผู้โอนเงิน/ผู้จ่ายเงิน (ถ้ามี)
5. "bank_name" คือชื่อธนาคารต้นทาง/ผู้โอนเงิน (ถ้ามี)
6. ตอบกลับมาเป็น JSON เปล่าๆ ไม่ต้องมี Markdown Code Block ครอบ

โครงสร้าง JSON ที่ต้องการ:
{
  "merchant": "ชื่อร้านค้า หรือผู้รับเงิน",
  "amount": 0.00,
  "datetime": "YYYY-MM-DDTHH:MM",
  "sender_name": "ชื่อผู้โอน/ผู้จ่ายเงิน",
  "bank_name": "ชื่อธนาคารผู้โอน"
}
  `;

  let responseText = '';
  try {
    let rawOcrText = '';
    const formData = new FormData();
    const buffer = Buffer.from(slipImageBase64, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, 'slip.jpg');
    formData.append('model', 'typhoon-ocr');

    const ocrResponse = await fetch('https://api.opentyphoon.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.typhoonOcrApiKey}`,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      throw new Error(`Typhoon OCR API error: ${ocrResponse.status} ${errorText}`);
    }

    const ocrResult = (await ocrResponse.json()) as any;
    for (const pageResult of ocrResult.results || []) {
      if (pageResult.success && pageResult.message) {
        rawOcrText += pageResult.message.choices[0].message.content + '\n';
      } else if (!pageResult.success) {
        throw new Error(`Typhoon page processing error: ${pageResult.error}`);
      }
    }

    // Use Typhoon Chat Completions to parse the text into JSON
    const chatPrompt = prompt + `\n\nTEXT:\n${rawOcrText}`;
    const chatResponse = await fetch('https://api.opentyphoon.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.typhoonOcrApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'typhoon-v2.5-30b-a3b-instruct',
        messages: [{ role: 'user', content: chatPrompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!chatResponse.ok) {
      const err = await chatResponse.text();
      throw new Error(`Typhoon Chat API error: ${chatResponse.status} ${err}`);
    }

    const chatJson = (await chatResponse.json()) as any;
    responseText = chatJson.choices[0].message.content;
  } catch (error) {
    console.error('Typhoon OCR API Error:', error);
    const errStr = String(error);
    let friendlyReason =
      'ระบบ AI ตรวจสอบรูปภาพขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือกรอกข้อมูลด้วยตัวเอง';
    if (
      errStr.includes('429') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('quota') ||
      errStr.includes('Quota')
    ) {
      friendlyReason =
        'ระบบสแกนอัตโนมัติ (AI) เกินโควตาการใช้งานชั่วคราวแล้ว กรุณากรอกข้อมูลค่าใช้จ่ายด้วยตัวเอง หรือลองอีกครั้งในภายหลัง';
    }
    throw new DomainError(friendlyReason, 'VALIDATION_FAILED');
  }

  // Parse JSON Response
  let cleanJson = responseText.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json/, '');
    cleanJson = cleanJson.replace(/```$/, '');
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```/, '');
    cleanJson = cleanJson.replace(/```$/, '');
  }

  try {
    const extractedData = JSON.parse(cleanJson.trim());
    const merchant = extractedData.merchant ?? null;
    const amount = Number(extractedData.amount) || null;

    if (!merchant && !amount) {
      throw new DomainError(
        'รูปภาพที่อัปโหลดไม่ใช่ใบเสร็จหรือสลิปการโอนเงินที่ถูกต้อง กรุณาอัปโหลดรูปภาพที่ชัดเจนขึ้น หรือกรอกข้อมูลด้วยตัวเอง',
        'VALIDATION_FAILED',
      );
    }

    return {
      merchant,
      amount,
      datetime: extractedData.datetime ?? null,
      sender_name: extractedData.sender_name ?? null,
      bank_name: extractedData.bank_name ?? null,
    };
  } catch (err) {
    console.error('Failed to parse Gemini output:', responseText);
    throw new DomainError(
      err instanceof Error
        ? err.message
        : 'ไม่สามารถอ่านข้อมูลสลิปได้ กรุณาอัปโหลดภาพที่ชัดเจนขึ้น หรือกรอกข้อมูลด้วยตัวเอง',
      'VALIDATION_FAILED',
    );
  }
}
