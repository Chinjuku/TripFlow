import { env } from './apps/api/src/env';
import fs from 'fs';

async function main() {
  if (!env.typhoonOcrApiKey) {
    console.error('No API key');
    return;
  }

  // Create a 1x1 pixel white JPEG
  const base64Image =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const buffer = Buffer.from(base64Image, 'base64');
  const blob = new Blob([buffer], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('file', blob, 'slip.jpg');
  formData.append('model', 'typhoon-ocr');
  // formData.append('task_type', 'ocr'); // try without task_type first

  console.log('Sending request to Typhoon OCR...');
  const response = await fetch('https://api.opentyphoon.ai/v1/ocr', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.typhoonOcrApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Error ${response.status}:`, err);
    return;
  }

  const json = await response.json();
  console.log('Success:', JSON.stringify(json, null, 2));
}

main();
