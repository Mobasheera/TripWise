// "use client";

// import { useState } from "react";

// import AIBubble from "./AIBubble";
// import AIChatPanel from "./AIChatPanel";

// export default function AIAssistant() {
//   const [aiOpen, setAiOpen] = useState(false);

//   // Temporary data only for testing the AI UI.
//   // Later this will come from the logged-in user's TripWise data.
//   const trip = {
//     trip_name: "Goa Trip",

//     budget: 30000,

//     travelers: [
//       {
//         id: "1",
//         name: "Rahul",
//       },
//       {
//         id: "2",
//         name: "Aman",
//       },
//       {
//         id: "3",
//         name: "Priya",
//       },
//     ],

//     bookings: [
//       {
//         id: "b1",
//         type: "hotel",
//         description: "Goa Hotel",
//         amount: 9000,
//         date: "2026-10-10",
//         travelers: ["1", "2", "3"],
//         status: "confirmed",
//       },
//     ],

//     expenses: [
//       {
//         id: "e1",
//         description: "Dinner",
//         amount: 2400,
//         paid_by: "1",
//         participants: ["1", "2", "3"],
//       },
//       {
//         id: "e2",
//         description: "Taxi",
//         amount: 1200,
//         paid_by: "2",
//         participants: ["1", "2", "3"],
//       },
//     ],
//   };

//   return (
//     <>
//       {!aiOpen && (
//         <AIBubble
//           onClick={() => setAiOpen(true)}
//         />
//       )}

//       {aiOpen && (
//         <AIChatPanel
//           trip={trip}
//           onClose={() => setAiOpen(false)}
//         />
//       )}
//     </>
//   );
// }


"use client";

import {
  useEffect,
  useState,
} from "react";

import AIBubble from "./AIBubble";
import AIChatPanel from "./AIChatPanel";
import { getSupabase } from "@/lib/supabase";

export default function AIAssistant() {
  const [aiOpen, setAiOpen] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [tripId, setTripId] =
    useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setLoggedIn(!!user);
      setCheckingAuth(false);
    }

    checkUser();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setLoggedIn(!!session?.user);
        }
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /*
   * Detect whether the current page
   * belongs to a particular trip.
   *
   * Example:
   *
   * /trip/abc-123
   * /trip/abc-123/bookings
   * /trip/abc-123/expenses
   */

  useEffect(() => {
    function detectTrip() {
      const match =
        window.location.pathname.match(
          /^\/trip\/([^/]+)/
        );

      setTripId(
        match ? match[1] : null
      );
    }

    detectTrip();

    window.addEventListener(
      "popstate",
      detectTrip
    );

    return () => {
      window.removeEventListener(
        "popstate",
        detectTrip
      );
    };
  }, []);

  if (
    checkingAuth ||
    !loggedIn
  ) {
    return null;
  }

  return (
    <>
      {!aiOpen && (
        <AIBubble
          onClick={() =>
            setAiOpen(true)
          }
        />
      )}

      {aiOpen && (
        <AIChatPanel
          tripId={tripId}
          onClose={() =>
            setAiOpen(false)
          }
        />
      )}
    </>
  );
}