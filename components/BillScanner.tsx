"use client";

import { useRef, useState } from "react";

type Props = {
  children?: React.ReactNode;
  onFileSelected?: (file: File) => void | Promise<void>;
};

export default function BillScanner({
  children,
  onFileSelected,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  async function handleFile(file: File) {
    setSelectedFile(file.name);

    if (!onFileSelected) {
      return;
    }

    try {
      setProcessing(true);
      await onFileSelected(file);
    } finally {
      setProcessing(false);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void handleFile(file);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e5dac2] text-pine">
          ✦
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            AI Bill Scanner
          </p>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Upload a receipt to extract the merchant, items, tax,
            service charge and total.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleChange}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
            className="mt-4 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-[#16261f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? "Processing receipt..." : "Upload Bill"}
          </button>

          {selectedFile && (
            <p className="mt-3 text-xs text-stone-500">
              Selected:{" "}
              <span className="font-semibold text-ink">
                {selectedFile}
              </span>
            </p>
          )}

          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </section>
  );
}