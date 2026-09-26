export type ReceiptItem = { name: string; quantity: number; price: number };
export type Receipt = { merchant: string; items: ReceiptItem[]; tax: number; service_charge: number; total: number };

export function getGeminiConfig() {
  return { apiKey: process.env.GEMINI_API_KEY ?? "", model: "gemini-2.0-flash" };
}

export async function parseReceipt(): Promise<Receipt> {
  throw new Error("Receipt OCR is not connected yet. Add the Gemini vision request in the AI pipeline branch.");
}

export async function explainSettlement(): Promise<string> {
  throw new Error("Settlement explanation is not connected yet. Add the Gemini text request in the AI pipeline branch.");
}
