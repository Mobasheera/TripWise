"use client";

interface AIBubbleProps {
  onClick: () => void;
}

export default function AIBubble({
  onClick,
}: AIBubbleProps) {
  return (
    <button
      className="ai-bubble"
      onClick={onClick}
      aria-label="Open Trip Ledger AI"
    >
      <span>✦</span>
    </button>
  );
}