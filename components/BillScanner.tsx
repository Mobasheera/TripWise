"use client";

import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  Loader2,
  Receipt,
} from "lucide-react";

type ReceiptItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type ReceiptData = {
  id: string;
  merchant: string | null;
  subtotal: number;
  tax: number;
  total: number;
  items: ReceiptItem[];
};

interface BillScannerProps {
  tripId: string;
  onScanned?: (
    receipt: ReceiptData
  ) => void;
}

export function BillScanner({
  tripId,
  onScanned,
}: BillScannerProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [receipt, setReceipt] =
    useState<ReceiptData | null>(
      null
    );

  const [error, setError] =
    useState("");

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "tripId",
        tripId
      );

      const response =
        await fetch(
          "/api/bills/scan",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Receipt scan failed."
        );
      }

      setReceipt(
        result.receipt
      );

      onScanned?.(
        result.receipt
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Receipt scan failed."
      );
    } finally {
      setLoading(false);

      if (inputRef.current) {
        inputRef.current.value =
          "";
      }
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
          <Receipt size={20} />
        </div>

        <div>
          <h2 className="font-semibold">
            AI Bill Scanner
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload a receipt and AI will
            extract every item, tax and total.
          </p>
        </div>

      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <button
        type="button"
        onClick={() =>
          inputRef.current?.click()
        }
        disabled={loading}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? (
          <Loader2
            size={16}
            className="animate-spin"
          />
        ) : (
          <ImagePlus size={16} />
        )}

        {loading
          ? "Scanning..."
          : "Upload Receipt"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {receipt && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">

          <div className="flex justify-between">
            <span className="font-semibold">
              {receipt.merchant ||
                "Receipt"}
            </span>

            <span className="font-bold">
              ₹
              {receipt.total.toFixed(
                2
              )}
            </span>
          </div>

          <div className="mt-4 space-y-2">

            {receipt.items.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.name} ×{" "}
                    {item.quantity}
                  </span>

                  <span>
                    ₹
                    {item.price.toFixed(
                      2
                    )}
                  </span>
                </div>
              )
            )}

          </div>

          <div className="mt-4 border-t pt-3 text-sm">

            <div className="flex justify-between">
              <span>
                Subtotal
              </span>

              <span>
                ₹
                {receipt.subtotal.toFixed(
                  2
                )}
              </span>
            </div>

            <div className="mt-1 flex justify-between">
              <span>
                Tax
              </span>

              <span>
                ₹
                {receipt.tax.toFixed(
                  2
                )}
              </span>
            </div>

            <div className="mt-2 flex justify-between font-bold">
              <span>
                Total
              </span>

              <span>
                ₹
                {receipt.total.toFixed(
                  2
                )}
              </span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}