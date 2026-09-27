// const AI_API_URL = "http://localhost:8000";

// export interface AIMessage {
//   role: "user" | "assistant";
//   content: string;
// }

// export async function askTripAI(
//   question: string,
//   trip: any,
//   history: AIMessage[] = []
// ) {
//   const response = await fetch(`${AI_API_URL}/api/analyze`, {
//     method: "POST",

//     headers: {
//       "Content-Type": "application/json",
//     },

//     body: JSON.stringify({
//       question,
//       trip,
//       history,
//     }),
//   });

//   if (!response.ok) {
//     const error = await response.text();

//     throw new Error(
//       error || "Failed to connect to Trip Ledger AI"
//     );
//   }

//   return response.json();
// }

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}