import { env } from './apps/api/src/env';

async function main() {
  const ocrText = `
ชำระเงินสำเร็จ 23 พ.ค. 69 14:31 น.
K+
นาย ชินาธิป ห
ธ.กสิกรไทย xxx-x-x5140-x
↓
ปตท.ประเสริฐรัตนศิริ
บจก. ประเสริฐรัตนศิริ
202605231642832
เลขที่รายการ: 016143143134AQR09042
จำนวน: 100.00 บาท
ค่าธรรมเนียม: 0.00 บาท
สติเฟตเตอร์ รู้ทัน ป้องกันโกง
สแกนตรวจสอบสลิป
  `;

  const prompt = `
คุณคือ AI ผู้เชี่ยวชาญด้านการอ่านสลิป
จงอ่านข้อมูล text ต่อไปนี้และสกัดเป็น JSON
{
  "merchant": "ชื่อร้าน",
  "amount": 0.00,
  "datetime": "YYYY-MM-DDTHH:MM"
}

ข้อกำหนด: 
- ตอบกลับมาเป็น JSON เปล่าๆ ไม่ต้องมี Markdown Code Block ครอบ
- ถ้าไม่มีข้อมูลให้ใส่ null
- datetime format YYYY-MM-DDTHH:MM

TEXT:
${ocrText}
`;

  const response = await fetch('https://api.opentyphoon.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.typhoonOcrApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'typhoon-v2.5-30b-a3b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  const json = await response.json();
  console.log(json.choices[0].message.content);
}

main();
