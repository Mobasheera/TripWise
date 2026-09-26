// "use client";

// import { useState } from "react";
// import {
//   askTripAI,
//   AIMessage,
// } from "../../lib/ai-service";

// interface AIChatPanelProps {
//   trip: any;
//   onClose: () => void;
// }

// export default function AIChatPanel({
//   trip,
//   onClose,
// }: AIChatPanelProps) {
//   const [messages, setMessages] = useState<AIMessage[]>([]);

//   const [question, setQuestion] = useState("");

//   const [loading, setLoading] = useState(false);

//   async function sendMessage() {
//     const text = question.trim();

//     if (!text || loading) {
//       return;
//     }

//     const userMessage: AIMessage = {
//       role: "user",
//       content: text,
//     };

//     const previousMessages = [...messages];

//     setMessages([
//       ...previousMessages,
//       userMessage,
//     ]);

//     setQuestion("");

//     setLoading(true);

//     try {
//       const result = await askTripAI(
//         text,
//         trip,
//         previousMessages
//       );

//       const assistantMessage: AIMessage = {
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
//       const assistantMessage: AIMessage = {
//         role: "assistant",
//         content:
//           error instanceof Error
//             ? `Error: ${error.message}`
//             : "Something went wrong while contacting the AI.",
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

//   function useSuggestion(text: string) {
//     setQuestion(text);
//   }

//   return (
//     <div className="ai-panel">

//       {/* HEADER */}

//       <div className="ai-header">

//         <div className="ai-header-left">

//           <div className="ai-logo">
//             ✦
//           </div>

//           <div>
//             <h3>
//               TripWise AI
//             </h3>

//             <p>
//               Your intelligent trip assistant
//             </p>
//           </div>

//         </div>

//         <button
//           className="ai-close"
//           onClick={onClose}
//           aria-label="Close AI"
//         >
//           ×
//         </button>

//       </div>


//       {/* CHAT AREA */}

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
//               I can analyze your bookings,
//               expenses, budget and group
//               arrangements.
//             </p>


//             <div className="ai-suggestions">

//               <button
//                 onClick={() =>
//                   useSuggestion(
//                     "Analyze my trip"
//                   )
//                 }
//               >
//                 🔍 Analyze my trip
//               </button>

//               <button
//                 onClick={() =>
//                   useSuggestion(
//                     "Are there any booking problems?"
//                   )
//                 }
//               >
//                 🏨 Check booking problems
//               </button>

//               <button
//                 onClick={() =>
//                   useSuggestion(
//                     "How can I save money?"
//                   )
//                 }
//               >
//                 💰 Find cost savings
//               </button>

//               <button
//                 onClick={() =>
//                   useSuggestion(
//                     "Who owes whom?"
//                   )
//                 }
//               >
//                 💸 Check expense settlement
//               </button>

//             </div>

//           </div>

//         )}


//         {/* MESSAGES */}

//         {messages.map(
//           (message, index) => (

//             <div
//               key={index}
//               className={`ai-message ${message.role}`}
//             >

//               <div className="ai-message-content">
//                 {message.content}
//               </div>

//             </div>

//           )
//         )}


//         {/* LOADING */}

//         {loading && (

//           <div className="ai-message assistant">

//             <div className="ai-typing">

//               <span></span>
//               <span></span>
//               <span></span>

//             </div>

//           </div>

//         )}

//       </div>


//       {/* INPUT */}

//       <div className="ai-input-wrapper">

//         <textarea
//           value={question}
//           onChange={(event) =>
//             setQuestion(event.target.value)
//           }
//           onKeyDown={handleKeyDown}
//           placeholder="Ask Trip Ledger AI..."
//           rows={1}
//           disabled={loading}
//         />

//         <button
//           className="ai-send"
//           onClick={sendMessage}
//           disabled={
//             loading ||
//             !question.trim()
//           }
//         >
//           ↑
//         </button>

//       </div>


//       <div className="ai-footer">
//         AI responses are generated from your trip data
//       </div>

//     </div>
//   );
// }

"use client";

import {
  useState,
} from "react";

import {
  AIMessage,
} from "@/lib/ai-service";

interface AIChatPanelProps {
  tripId: string | null;
  onClose: () => void;
}

export default function AIChatPanel({
  tripId,
  onClose,
}: AIChatPanelProps) {
  const [messages, setMessages] =
    useState<AIMessage[]>([]);

  const [question, setQuestion] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function sendMessage(
    customQuestion?: string
  ) {
    const text = (
      customQuestion ??
      question
    ).trim();

    if (!text || loading) {
      return;
    }

    const userMessage: AIMessage = {
      role: "user",
      content: text,
    };

    const previousMessages = [
      ...messages,
    ];

    setMessages([
      ...previousMessages,
      userMessage,
    ]);

    setQuestion("");

    setLoading(true);

    try {
      const response =
        await fetch("/api/ai", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question: text,
            tripId,
            history:
              previousMessages,
          }),
        });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "AI request failed."
        );
      }

      const assistantMessage:
        AIMessage = {
        role: "assistant",
        content:
          result.ai_response ||
          "I couldn't generate a response.",
      };

      setMessages([
        ...previousMessages,
        userMessage,
        assistantMessage,
      ]);
    } catch (error) {
      const assistantMessage:
        AIMessage = {
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      };

      setMessages([
        ...previousMessages,
        userMessage,
        assistantMessage,
      ]);
    } finally {
      setLoading(false);
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
    {
      text: "Analyze my trip",
      icon: "🔍",
    },
    {
      text: "Check booking problems",
      icon: "🏨",
    },
    {
      text: "Find cost savings",
      icon: "💰",
    },
    {
      text:
        "Check expense settlement",
      icon: "💸",
    },
  ];

  return (
    <div className="ai-panel">

      {/* HEADER */}

      <div className="ai-header">

        <div className="ai-header-left">

          <div className="ai-logo">
            ✦
          </div>

          <div>
            <h3>
              TripWise AI
            </h3>

            <p>
              Your personal travel assistant
            </p>
          </div>

        </div>

        <button
          className="ai-close"
          onClick={onClose}
        >
          ×
        </button>

      </div>

      {/* CHAT */}

      <div className="ai-messages">

        {messages.length === 0 && (
          <div className="ai-welcome">

            <div className="ai-welcome-icon">
              ✦
            </div>

            <h2>
              How can I help?
            </h2>

            <p>
              Ask me anything about your
              TripWise data or general topics.
            </p>

            <div className="ai-suggestions">

              {suggestions.map(
                (item) => (
                  <button
                    key={item.text}
                    onClick={() =>
                      sendMessage(
                        item.text
                      )
                    }
                  >
                    {item.icon}{" "}
                    {item.text}
                  </button>
                )
              )}

            </div>

          </div>
        )}

        {messages.map(
          (message, index) => (
            <div
              key={index}
              className={`ai-message ${message.role}`}
            >
              <div className="ai-message-content">
                {message.content}
              </div>
            </div>
          )
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

      {/* INPUT */}

      <div className="ai-input-wrapper">

        <textarea
          value={question}
          onChange={(event) =>
            setQuestion(
              event.target.value
            )
          }
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          disabled={loading}
        />

        <button
          className="ai-send"
          onClick={() =>
            sendMessage()
          }
          disabled={
            loading ||
            !question.trim()
          }
        >
          ↑
        </button>

      </div>

      <div className="ai-footer">
        TripWise AI uses your account data
        only when needed for TripWise questions.
      </div>

    </div>
  );
}