"use client";

import {
  useState,
} from "react";

import {
  Loader2,
  Users,
} from "lucide-react";

type Item = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type Assignment = {
  participantId: string;
  participantName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    totalAmount: number;
  }[];
  total: number;
};

interface ItemAssignmentProps {
  tripId: string;
  billId: string;
  items: Item[];
  onAssigned?: (
    assignments: Assignment[]
  ) => void;
}

export function ItemAssignment({
  tripId,
  billId,
  items,
  onAssigned,
}: ItemAssignmentProps) {
  const [instruction, setInstruction] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  async function assignItems() {
    if (!instruction.trim()) {
      setError(
        "Enter who gets which item."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/bills/assign",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              tripId,
              billId,
              instruction,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to split items."
        );
      }

      setAssignments(
        result.assignments || []
      );

      onAssigned?.(
        result.assignments || []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to split items."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Users size={18} />
        </div>

        <div>
          <h2 className="font-semibold">
            Item-based split
          </h2>

          <p className="text-sm text-slate-500">
            Tell AI who gets each receipt item.
          </p>
        </div>

      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        Example:
        <br />
        <strong>
          Rahul gets pizza and coke. Aman gets
          burger. Priya gets water.
        </strong>
      </div>

      <textarea
        value={instruction}
        onChange={(event) =>
          setInstruction(
            event.target.value
          )
        }
        rows={4}
        placeholder="Rahul gets pizza and coke. Aman gets burger..."
        className="mt-4 w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
      />

      <button
        type="button"
        onClick={assignItems}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading && (
          <Loader2
            size={15}
            className="animate-spin"
          />
        )}

        Calculate Item Split
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {assignments.length > 0 && (
        <div className="mt-5 space-y-3">

          {assignments.map(
            (assignment) => (
              <div
                key={
                  assignment.participantId
                }
                className="rounded-xl border bg-slate-50 p-4"
              >

                <div className="flex justify-between font-semibold">
                  <span>
                    {
                      assignment.participantName
                    }
                  </span>

                  <span>
                    ₹
                    {assignment.total.toFixed(
                      2
                    )}
                  </span>
                </div>

                <div className="mt-3 space-y-1">

                  {assignment.items.map(
                    (item) => (
                      <div
                        key={
                          item.itemId
                        }
                        className="flex justify-between text-sm text-slate-600"
                      >
                        <span>
                          {item.itemName} ×{" "}
                          {item.quantity}
                        </span>

                        <span>
                          ₹
                          {item.totalAmount.toFixed(
                            2
                          )}
                        </span>
                      </div>
                    )
                  )}

                </div>

              </div>
            )
          )}

        </div>
      )}

      {items.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          {items.length} receipt items must
          be assigned.
        </p>
      )}

    </div>
  );
}