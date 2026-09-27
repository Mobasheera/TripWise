
// "use client";

// import {
//   ChangeEvent,
//   useRef,
//   useState,
// } from "react";

// import {
//   ArrowLeft,
//   ImagePlus,
//   Loader2,
//   Send,
//   Upload,
//   X,
// } from "lucide-react";

// import { AIMessage } from "@/lib/ai-service";

// type ReceiptItem = {
//   id: string;
//   name: string;
//   quantity: number;
//   price: number;
// };

// type Receipt = {
//   id: string;
//   merchant: string | null;
//   subtotal: number;
//   tax: number;
//   total: number;
//   items: ReceiptItem[];
// };

// type Assignment = {
//   participantId: string;
//   participantName: string;
//   items: {
//     itemId: string;
//     itemName: string;
//     quantity: number;
//     baseAmount: number;
//     taxAmount: number;
//     totalAmount: number;
//   }[];
//   total: number;
// };

// interface AIChatPanelProps {
//   tripId: string | null;
//   onClose: () => void;
// }

// export default function AIChatPanel({
//   tripId,
//   onClose,
// }: AIChatPanelProps) {
//   const fileInputRef =
//     useRef<HTMLInputElement | null>(null);

//   const [messages, setMessages] =
//     useState<AIMessage[]>([]);

//   const [question, setQuestion] =
//     useState("");

//   const [loading, setLoading] =
//     useState(false);

//   const [uploadingReceipt, setUploadingReceipt] =
//     useState(false);

//   const [receipt, setReceipt] =
//     useState<Receipt | null>(null);

//   const [assignments, setAssignments] =
//     useState<Assignment[]>([]);

//   async function uploadReceipt(
//     file: File
//   ) {
//     if (!tripId) {
//       alert(
//         "Open the AI from inside a trip before uploading a receipt."
//       );
//       return;
//     }

//     if (!file.type.startsWith("image/")) {
//       alert("Please upload an image receipt.");
//       return;
//     }

//     setUploadingReceipt(true);

//     try {
//       const formData = new FormData();

//       formData.append("file", file);
//       formData.append("tripId", tripId);

//       const response = await fetch(
//         "/api/bills/scan",
//         {
//           method: "POST",
//           body: formData,
//         }
//       );

//       const result =
//         await response.json();

//       if (!response.ok) {
//         throw new Error(
//           result?.error ||
//             "Unable to scan receipt."
//         );
//       }

//       const scannedReceipt =
//         result.receipt as Receipt;

//       setReceipt(scannedReceipt);
//       setAssignments([]);

//       setMessages((current) => [
//         ...current,
//         {
//           role: "user",
//           content:
//             `📷 Uploaded receipt: ${
//               file.name
//             }`,
//         },
//         {
//           role: "assistant",
//           content:
//             buildReceiptMessage(
//               scannedReceipt
//             ),
//         },
//       ]);

//       setQuestion("");
//     } catch (error) {
//       setMessages((current) => [
//         ...current,
//         {
//           role: "assistant",
//           content:
//             error instanceof Error
//               ? error.message
//               : "Unable to scan the receipt.",
//         },
//       ]);
//     } finally {
//       setUploadingReceipt(false);

//       if (fileInputRef.current) {
//         fileInputRef.current.value = "";
//       }
//     }
//   }

//   function handleReceiptUpload(
//     event: ChangeEvent<HTMLInputElement>
//   ) {
//     const file =
//       event.target.files?.[0];

//     if (file) {
//       uploadReceipt(file);
//     }
//   }

//   async function assignReceiptItems(
//     assignmentText: string
//   ) {
//     if (!receipt || !tripId) {
//       return false;
//     }

//     const response = await fetch(
//       "/api/bills/assign",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type":
//             "application/json",
//         },
//         body: JSON.stringify({
//           tripId,
//           billId: receipt.id,
//           instruction:
//             assignmentText,
//         }),
//       }
//     );

//     const result =
//       await response.json();

//     if (!response.ok) {
//       throw new Error(
//         result?.error ||
//           "Unable to assign receipt items."
//       );
//     }

//     setAssignments(
//       result.assignments || []
//     );

//     return result;
//   }

//   async function sendMessage(
//     customQuestion?: string
//   ) {
//     const text = (
//       customQuestion ??
//       question
//     ).trim();

//     if (!text || loading) {
//       return;
//     }

//     const userMessage: AIMessage = {
//       role: "user",
//       content: text,
//     };

//     const previousMessages = [
//       ...messages,
//     ];

//     setMessages([
//       ...previousMessages,
//       userMessage,
//     ]);

//     setQuestion("");
//     setLoading(true);

//     try {
//       /*
//        * IMPORTANT:
//        *
//        * After a receipt is scanned, the next
//        * message is treated as the item assignment
//        * instruction.
//        *
//        * Example:
//        *
//        * Rahul gets pizza and coke.
//        * Aman gets burger.
//        * Priya gets water.
//        */
//       if (receipt) {
//         const result =
//           await assignReceiptItems(
//             text
//           );

//         const assistantMessage:
//           AIMessage = {
//           role: "assistant",
//           content:
//             buildAssignmentMessage(
//               result.assignments || [],
//               result.summary
//             ),
//         };

//         setMessages([
//           ...previousMessages,
//           userMessage,
//           assistantMessage,
//         ]);

//         /*
//          * Keep receipt available so the user can
//          * correct the assignment in another message.
//          */
//         return;
//       }

//       const response =
//         await fetch("/api/ai", {
//           method: "POST",

//           headers: {
//             "Content-Type":
//               "application/json",
//           },

//           body: JSON.stringify({
//             question: text,
//             tripId,
//             history:
//               previousMessages,
//           }),
//         });

//       const result =
//         await response.json();

//       if (!response.ok) {
//         throw new Error(
//           result?.error ||
//             "AI request failed."
//         );
//       }

//       const assistantMessage:
//         AIMessage = {
//         role: "assistant",
//         content:
//           result.ai_response ||
//           "I couldn't generate a response.",
//       };

//       setMessages([
//         ...previousMessages,
//         userMessage,
//         assistantMessage,
//       ]);
//     } catch (error) {
//       const assistantMessage:
//         AIMessage = {
//         role: "assistant",
//         content:
//           error instanceof Error
//             ? error.message
//             : "Something went wrong.",
//       };

//       setMessages([
//         ...previousMessages,
//         userMessage,
//         assistantMessage,
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleKeyDown(
//     event: React.KeyboardEvent<HTMLTextAreaElement>
//   ) {
//     if (
//       event.key === "Enter" &&
//       !event.shiftKey
//     ) {
//       event.preventDefault();

//       sendMessage();
//     }
//   }

//   function clearReceipt() {
//     setReceipt(null);
//     setAssignments([]);
//   }

//   const suggestions = [
//     {
//       text: "Analyze my trip",
//       icon: "🔍",
//     },
//     {
//       text: "Check booking problems",
//       icon: "🏨",
//     },
//     {
//       text: "Find cost savings",
//       icon: "💰",
//     },
//     {
//       text: "Check expense settlement",
//       icon: "💸",
//     },
//   ];

//   return (
//     <div className="ai-panel">

//       {/* HEADER */}

//       <div className="ai-header">

//         <div className="ai-header-left">

//           <button
//             type="button"
//             className="ai-back"
//             onClick={onClose}
//             aria-label="Go back"
//             title="Back"
//           >
//             <ArrowLeft size={18} />
//           </button>

//           <div className="ai-logo">
//             ✦
//           </div>

//           <div>
//             <h3>
//               TripWise AI
//             </h3>

//             <p>
//               Your personal travel assistant
//             </p>
//           </div>

//         </div>

//         <button
//           type="button"
//           className="ai-close"
//           onClick={onClose}
//           aria-label="Close AI"
//         >
//           ×
//         </button>

//       </div>

//       {/* RECEIPT STATUS */}

//       {receipt && (
//         <div className="border-b border-black/10 bg-[#f4f0e6] p-3">

//           <div className="flex items-center justify-between gap-3">

//             <div className="min-w-0">

//               <p className="truncate text-xs font-bold">
//                 {receipt.merchant ||
//                   "Receipt scanned"}
//               </p>

//               <p className="mt-0.5 text-[11px] text-slate-500">
//                 {receipt.items.length} items ·{" "}
//                 ₹{receipt.total.toFixed(2)}
//               </p>

//             </div>

//             <button
//               type="button"
//               onClick={clearReceipt}
//               className="rounded-lg p-1.5 text-slate-500 hover:bg-white"
//               title="Clear receipt"
//             >
//               <X size={15} />
//             </button>

//           </div>

//         </div>
//       )}

//       {/* CHAT */}

//       <div className="ai-messages">

//         {messages.length === 0 && (
//           <div className="ai-welcome">

//             <div className="ai-welcome-icon">
//               ✦
//             </div>

//             <h2>
//               How can I help?
//             </h2>

//             <p>
//               Ask me anything about your
//               TripWise data or upload a receipt.
//             </p>

//             <div className="ai-suggestions">

//               {suggestions.map(
//                 (item) => (
//                   <button
//                     key={item.text}
//                     onClick={() =>
//                       sendMessage(
//                         item.text
//                       )
//                     }
//                   >
//                     {item.icon}{" "}
//                     {item.text}
//                   </button>
//                 )
//               )}

//             </div>

//           </div>
//         )}

//         {messages.map(
//           (message, index) => (
//             <div
//               key={index}
//               className={`ai-message ${message.role}`}
//             >
//               <div className="ai-message-content whitespace-pre-wrap">
//                 {message.content}
//               </div>
//             </div>
//           )
//         )}

//         {loading && (
//           <div className="ai-message assistant">
//             <div className="ai-typing">
//               <span />
//               <span />
//               <span />
//             </div>
//           </div>
//         )}

//         {assignments.length > 0 && (
//           <div className="mx-3 mb-3 rounded-2xl border border-[#292a25]/10 bg-white p-4">

//             <p className="text-xs font-bold uppercase tracking-wider text-[#927543]">
//               Item-based split
//             </p>

//             <div className="mt-3 space-y-3">

//               {assignments.map(
//                 (assignment) => (
//                   <div
//                     key={
//                       assignment.participantId
//                     }
//                     className="rounded-xl bg-[#f8f5ec] p-3"
//                   >
//                     <div className="flex justify-between gap-3">

//                       <span className="font-bold">
//                         {
//                           assignment.participantName
//                         }
//                       </span>

//                       <span className="font-bold">
//                         ₹
//                         {assignment.total.toFixed(
//                           2
//                         )}
//                       </span>

//                     </div>

//                     <div className="mt-2 space-y-1">

//                       {assignment.items.map(
//                         (item) => (
//                           <div
//                             key={
//                               item.itemId
//                             }
//                             className="flex justify-between gap-3 text-xs text-slate-600"
//                           >
//                             <span>
//                               {item.itemName}
//                               {" × "}
//                               {item.quantity}
//                             </span>

//                             <span>
//                               ₹
//                               {item.totalAmount.toFixed(
//                                 2
//                               )}
//                             </span>
//                           </div>
//                         )
//                       )}

//                     </div>
//                   </div>
//                 )
//               )}

//             </div>
//           </div>
//         )}

//       </div>

//       {/* INPUT */}

//       <div className="ai-input-wrapper">

//         <input
//           ref={fileInputRef}
//           type="file"
//           accept="image/*"
//           className="hidden"
//           onChange={
//             handleReceiptUpload
//           }
//         />

//         <button
//           type="button"
//           className="ai-upload"
//           onClick={() =>
//             fileInputRef.current?.click()
//           }
//           disabled={
//             loading ||
//             uploadingReceipt
//           }
//           aria-label="Upload receipt image"
//         >
//           {uploadingReceipt ? (
//             <Loader2
//               size={17}
//               className="animate-spin"
//             />
//           ) : (
//             <ImagePlus size={17} />
//           )}
//         </button>

//         <textarea
//           value={question}
//           onChange={(event) =>
//             setQuestion(
//               event.target.value
//             )
//           }
//           onKeyDown={handleKeyDown}
//           placeholder={
//             receipt
//               ? "Tell me who gets which items..."
//               : "Ask anything..."
//           }
//           rows={1}
//           disabled={
//             loading ||
//             uploadingReceipt
//           }
//         />

//         <button
//           className="ai-send"
//           onClick={() =>
//             sendMessage()
//           }
//           disabled={
//             loading ||
//             uploadingReceipt ||
//             !question.trim()
//           }
//         >
//           <Send size={16} />
//         </button>

//       </div>

//       <div className="ai-footer">
//         {receipt
//           ? "Receipt scanned. Your next message assigns the items."
//           : "TripWise AI uses your account data only when needed."}
//       </div>

//     </div>
//   );
// }

// function buildReceiptMessage(
//   receipt: Receipt
// ) {
//   const lines = [
//     "Receipt scanned successfully.",
//     "",
//     `Merchant: ${
//       receipt.merchant || "Unknown"
//     }`,
//     "",
//     "Items:",
//   ];

//   receipt.items.forEach(
//     (item) => {
//       lines.push(
//         `• ${item.name} × ${item.quantity} — ₹${item.price.toFixed(
//           2
//         )}`
//       );
//     }
//   );

//   lines.push(
//     "",
//     `Subtotal: ₹${receipt.subtotal.toFixed(
//       2
//     )}`,
//     `Tax: ₹${receipt.tax.toFixed(2)}`,
//     `Total: ₹${receipt.total.toFixed(2)}`,
//     "",
//     "Now tell me who gets which item.",
//     "Example: Rahul gets pizza and coke. Aman gets burger."
//   );

//   return lines.join("\n");
// }

// function buildAssignmentMessage(
//   assignments: Assignment[],
//   summary: any
// ) {
//   const lines = [
//     "Item-based split calculated.",
//     "",
//   ];

//   assignments.forEach(
//     (assignment) => {
//       lines.push(
//         `${assignment.participantName}: ₹${assignment.total.toFixed(
//           2
//         )}`
//       );

//       assignment.items.forEach(
//         (item) => {
//           lines.push(
//             `  • ${item.itemName}: ₹${item.totalAmount.toFixed(
//               2
//             )}`
//           );
//         }
//       );

//       lines.push("");
//     }
//   );

//   if (summary) {
//     lines.push(
//       `Receipt total: ₹${Number(
//         summary.receiptTotal
//       ).toFixed(2)}`
//     );

//     lines.push(
//       `Allocated: ₹${Number(
//         summary.allocatedTotal
//       ).toFixed(2)}`
//     );
//   }

//   return lines.join("\n");
// }


"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { AIMessage } from "@/lib/ai-service";

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  database_item_id?: string | null;
}

interface ReceiptTax {
  name: string;
  amount: number;
}

interface ReceiptData {
  bill_id?: string;
  merchant?: string | null;
  currency: string;
  items: ReceiptItem[];
  taxes: ReceiptTax[];
  subtotal: number;
  tax_total: number;
  total: number;
  raw_text?: string;
  confidence?: number;
}

interface ReceiptSettlementPerson {
  member_id: string;
  name: string;
  items_total: number;
  tax_share: number;
  total: number;
}

interface ReceiptSplit {
  currency: string;
  merchant?: string | null;
  subtotal: number;
  tax_total: number;
  receipt_total: number;
  item_splits: Array<{
    item_id: string;
    item_name: string;
    line_total: number;
    shares: Array<{
      member_id: string;
      amount: number;
    }>;
  }>;
  settlement: ReceiptSettlementPerson[];
  unassigned_item_ids: string[];
  assigned_total: number;
}

interface AIChatPanelProps {
  tripId: string | null;
  onClose: () => void;
}

async function resizeReceiptImage(file: File) {
  const source = await createImageBitmap(file);

  const maxDimension = 1800;
  const scale = Math.min(
    1,
    maxDimension / Math.max(source.width, source.height)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    source.close();
    throw new Error("Unable to prepare the receipt image.");
  }

  context.drawImage(
    source,
    0,
    0,
    canvas.width,
    canvas.height
  );

  source.close();

  let quality = 0.86;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Keep the browser -> Next.js request comfortably small.
  while (dataUrl.length > 1_200_000 && quality > 0.5) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}

export default function AIChatPanel({
  tripId,
  onClose,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptSplit, setReceiptSplit] = useState<ReceiptSplit | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function requestAI(
    text: string,
    receiptOverride: ReceiptData | null,
    history: AIMessage[]
  ) {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: text,
        tripId,
        history,
        receipt: receiptOverride,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "AI request failed."
      );
    }

    return result;
  }

  async function sendMessage(
    customQuestion?: string,
    receiptOverride: ReceiptData | null = receipt
  ) {
    const text = (
      customQuestion ?? question
    ).trim();

    if (!text || loading) return;

    const userMessage: AIMessage = {
      role: "user",
      content: text,
    };

    const previousMessages = [...messages];
    const nextHistory = [
      ...previousMessages,
      userMessage,
    ];

    setMessages(nextHistory);
    setQuestion("");
    setLoading(true);

    try {
      const result = await requestAI(
        text,
        receiptOverride,
        previousMessages
      );

      if (result.receipt_split) {
        setReceiptSplit(result.receipt_split);
      }

      const assistantMessage: AIMessage = {
        role: "assistant",
        content:
          result.ai_response ||
          "I couldn't generate a response.",
      };

      setMessages([
        ...nextHistory,
        assistantMessage,
      ]);
    } catch (error) {
      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReceiptUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!tripId) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Open the AI inside a trip before uploading a receipt.",
        },
      ]);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Please select a receipt image (JPG, PNG, WEBP or GIF).",
        },
      ]);
      return;
    }

    setUploadingReceipt(true);
    setReceiptSplit(null);

    const uploadMessage: AIMessage = {
      role: "user",
      content: "📷 Receipt uploaded",
    };

    const previousMessages = [...messages];
    const uploadHistory = [
      ...previousMessages,
      uploadMessage,
    ];

    setMessages(uploadHistory);

    try {
      const imageDataUrl =
        await resizeReceiptImage(file);

      const response = await fetch(
        "/api/ai/receipt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageDataUrl,
            tripId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Receipt OCR failed."
        );
      }

      const scannedReceipt: ReceiptData =
        result.receipt;

      setReceipt(scannedReceipt);

      const aiResult = await requestAI(
        "receipt_uploaded",
        scannedReceipt,
        uploadHistory
      );

      setMessages([
        ...uploadHistory,
        {
          role: "assistant",
          content:
            aiResult.ai_response ||
            "Receipt scanned successfully.",
        },
      ]);
    } catch (error) {
      setMessages([
        ...uploadHistory,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Unable to scan this receipt.",
        },
      ]);
    } finally {
      setUploadingReceipt(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  const suggestions = [
    { text: "Analyze my trip", icon: "🔍" },
    { text: "Check booking problems", icon: "🏨" },
    { text: "Find cost savings", icon: "💰" },
    { text: "Check expense settlement", icon: "💸" },
  ];

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-header-left">
          <button
            type="button"
            className="ai-back"
            onClick={onClose}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="ai-logo">
            <Sparkles size={19} />
          </div>

          <div>
            <h3>TripWise AI</h3>
            <p>Your personal travel assistant</p>
          </div>
        </div>

        <button
          type="button"
          className="ai-close"
          onClick={onClose}
          aria-label="Close AI"
        >
          <X size={20} />
        </button>
      </div>

      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <div className="ai-welcome-icon">
              <Sparkles size={24} />
            </div>

            <h2>How can I help?</h2>

            <p>
              Ask me anything about your TripWise data or upload a receipt.
            </p>

            <div className="ai-suggestions">
              {suggestions.map((item) => (
                <button
                  type="button"
                  key={item.text}
                  onClick={() =>
                    sendMessage(item.text)
                  }
                  disabled={loading}
                >
                  {item.icon} {item.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`ai-message ${message.role}`}
          >
            <div className="ai-message-content">
              {message.content}
            </div>
          </div>
        ))}

        {receipt && messages.length > 0 && (
          <div className="ai-receipt-card">
            <div className="ai-receipt-title">
              <span>
                {receipt.merchant || "Receipt"}
              </span>
              <strong>
                {receipt.currency}
                {receipt.total.toFixed(2)}
              </strong>
            </div>

            <div className="ai-receipt-items">
              {receipt.items.map((item) => (
                <div
                  className="ai-receipt-row"
                  key={item.id}
                >
                  <span>
                    {item.name} × {item.quantity.toLocaleString()}
                  </span>
                  <strong>
                    {receipt.currency}
                    {item.line_total.toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="ai-receipt-summary">
              <div>
                <span>Subtotal</span>
                <strong>
                  {receipt.currency}
                  {receipt.subtotal.toFixed(2)}
                </strong>
              </div>

              {receipt.taxes.map((tax) => (
                <div key={tax.name}>
                  <span>{tax.name}</span>
                  <strong>
                    {receipt.currency}
                    {tax.amount.toFixed(2)}
                  </strong>
                </div>
              ))}

              <div>
                <span>Tax</span>
                <strong>
                  {receipt.currency}
                  {receipt.tax_total.toFixed(2)}
                </strong>
              </div>

              <div className="ai-receipt-total">
                <span>Total</span>
                <strong>
                  {receipt.currency}
                  {receipt.total.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        )}

        {receiptSplit && (
          <div className="ai-settlement-card">
            <div className="ai-settlement-title">
              <span>Item-based settlement</span>
              <strong>
                {receiptSplit.currency}
                {receiptSplit.receipt_total.toFixed(2)}
              </strong>
            </div>

            {receiptSplit.settlement.map((person) => (
              <div
                className="ai-settlement-person"
                key={person.member_id}
              >
                <div className="ai-settlement-person-head">
                  <strong>{person.name}</strong>
                  <strong>
                    {receiptSplit.currency}
                    {person.total.toFixed(2)}
                  </strong>
                </div>

                <div className="ai-settlement-meta">
                  Items: {receiptSplit.currency}
                  {person.items_total.toFixed(2)}
                  <span>•</span>
                  Tax: {receiptSplit.currency}
                  {person.tax_share.toFixed(2)}
                </div>

                {receiptSplit.item_splits.map((item) => {
                  const share = item.shares.find(
                    (entry) =>
                      entry.member_id === person.member_id
                  );

                  if (!share) return null;

                  return (
                    <div
                      className="ai-settlement-item"
                      key={`${person.member_id}-${item.item_id}`}
                    >
                      <span>{item.item_name}</span>
                      <span>
                        {receiptSplit.currency}
                        {share.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="ai-message assistant">
            <div className="ai-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="ai-input-wrapper">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="ai-hidden-file"
          onChange={handleReceiptUpload}
        />

        <button
          type="button"
          className="ai-upload"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={
            loading || uploadingReceipt
          }
          aria-label="Upload receipt image"
        >
          {uploadingReceipt ? (
            <Loader2
              size={18}
              className="ai-spin"
            />
          ) : (
            <ImagePlus size={18} />
          )}
        </button>

        <textarea
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={
            receipt
              ? "Tell me who gets which item..."
              : "Ask anything..."
          }
          rows={1}
          disabled={
            loading || uploadingReceipt
          }
        />

        <button
          type="button"
          className="ai-send"
          onClick={() => sendMessage()}
          disabled={
            loading ||
            uploadingReceipt ||
            !question.trim()
          }
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </div>

      <div className="ai-footer">
        TripWise AI uses your account data only when needed for TripWise questions.
      </div>
    </div>
  );
}
