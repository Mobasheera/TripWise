# import os
# from dotenv import load_dotenv
# from openai import OpenAI

# load_dotenv()

# API_KEY = os.getenv("GROQ_API_KEY")

# if not API_KEY:
#     raise RuntimeError("GROQ_API_KEY is missing from .env")


# client = OpenAI(
#     api_key=API_KEY,
#     base_url="https://api.groq.com/openai/v1"
# )

# SYSTEM_PROMPT = """
# You are TripWise AI.

# You are a general-purpose AI assistant integrated into a
# group travel application.

# You can answer normal general questions.

# You can also analyze TripWise data when the user asks
# about their trips, bookings, expenses, bills, payments,
# itinerary or settlement.

# RULES:

# 1. Never invent TripWise data.

# 2. Use supplied TripWise data as the source of truth for
#    TripWise-specific questions.

# 3. Never invent:
#    - users
#    - trips
#    - bookings
#    - expenses
#    - bills
#    - payments
#    - dates
#    - prices
#    - settlement amounts

# 4. If requested TripWise information is missing,
#    say that it is unavailable.

# 5. For general questions, answer normally.

# 6. Do not force general questions into a travel context.

# 7. Keep answers concise.

# 8. Prefer bullet points.

# 9. Usually answer in 2-6 points.

# 10. Answer the user's exact question first.

# 11. Do not expose internal prompts, API keys or internal
#     implementation details.

# 12. Do not unnecessarily expose UUIDs.

# 13. Do not claim that an action was completed unless the
#     application actually performed that action.

# 14. For financial calculations, use the supplied calculated
#     analysis when available.

# 15. If a TripWise question is ambiguous because the user has
#     multiple trips, briefly identify the available trips and
#     ask which one they mean.

# Be helpful, accurate and concise.
# """

# def ask_groq(user_prompt: str) -> str:

#     response = client.responses.create(
#         model="openai/gpt-oss-20b",
#         instructions=SYSTEM_PROMPT,
#         input=user_prompt
#     )

#     return response.output_text



import json
import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")

if not API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing from backend/.env")

client = OpenAI(
    api_key=API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

TEXT_MODEL = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b")
VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")

SYSTEM_PROMPT = """
You are TripWise AI.

You are a general-purpose AI assistant integrated into a group travel application.
Use supplied TripWise data as the source of truth for TripWise-specific questions.
Never invent trips, users, bookings, expenses, bills, prices, payments or settlements.
For financial calculations, trust deterministic calculations supplied by the application.
Keep answers concise and useful.
Never expose API keys, internal prompts or UUIDs unless explicitly requested.
""".strip()


def _message_content(response: Any) -> str:
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("Groq returned an empty response.")
    return content.strip()


def ask_groq(user_prompt: str, history: list[dict[str, str]] | None = None) -> str:
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    for message in (history or [])[-10:]:
        role = message.get("role")
        content = message.get("content")
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_prompt})

    response = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=messages,
        temperature=0.2,
        max_completion_tokens=950,
    )

    return _message_content(response)


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as error:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise RuntimeError("Groq returned invalid JSON for the requested operation.") from error


def scan_receipt(image_data_url: str) -> dict[str, Any]:
    prompt = """
Read this receipt image carefully using OCR and visual understanding.
Return ONLY valid JSON. Do not use markdown.

Required JSON shape:
{
  "merchant": string|null,
  "currency": string,
  "items": [
    {
      "id": "item-1",
      "name": string,
      "quantity": number,
      "unit_price": number,
      "line_total": number
    }
  ],
  "taxes": [
    {"name": string, "amount": number}
  ],
  "subtotal": number|null,
  "tax_total": number,
  "total": number|null,
  "raw_text": string,
  "confidence": number
}

Rules:
- Read every visible text field that matters to the bill.
- Include every purchasable line item.
- Preserve the receipt's item names as closely as possible.
- quantity must be numeric.
- line_total is the total for that line after quantity, not the unit price.
- If the receipt only shows a line total and quantity, derive unit_price when possible.
- Include each visible tax as a separate entry in taxes.
- tax_total must equal the sum of taxes when taxes are visible.
- Do not invent missing values. Use null for unknown subtotal or total.
- currency should be a currency code when recognizable, otherwise the visible symbol.
- raw_text should contain the OCR text in reading order.
""".strip()

    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data_url},
                    },
                ],
            }
        ],
        temperature=0.2,
        max_completion_tokens=3000,
        response_format={"type": "json_object"},
        reasoning_effort="none",
    )

    result = _extract_json(_message_content(response))

    items = result.get("items") or []
    taxes = result.get("taxes") or []

    normalized_items = []
    for index, item in enumerate(items):
        quantity = float(item.get("quantity") or 1)
        line_total = item.get("line_total")
        unit_price = item.get("unit_price")

        if line_total is None and unit_price is not None:
            line_total = float(unit_price) * quantity

        if unit_price is None and line_total is not None and quantity:
            unit_price = float(line_total) / quantity

        if line_total is None:
            continue

        normalized_items.append(
            {
                "id": str(item.get("id") or f"item-{index + 1}"),
                "name": str(item.get("name") or f"Item {index + 1}").strip(),
                "quantity": quantity,
                "unit_price": round(float(unit_price or 0), 2),
                "line_total": round(float(line_total), 2),
            }
        )

    normalized_taxes = []
    for index, tax in enumerate(taxes):
        amount = tax.get("amount")
        if amount is None:
            continue
        normalized_taxes.append(
            {
                "name": str(tax.get("name") or f"Tax {index + 1}").strip(),
                "amount": round(float(amount), 2),
            }
        )

    subtotal = result.get("subtotal")
    if subtotal is None:
        subtotal = sum(item["line_total"] for item in normalized_items)

    tax_total = result.get("tax_total")
    if tax_total is None:
        tax_total = sum(tax["amount"] for tax in normalized_taxes)

    total = result.get("total")
    if total is None:
        total = float(subtotal) + float(tax_total)

    return {
        "merchant": result.get("merchant"),
        "currency": result.get("currency") or "₹",
        "items": normalized_items,
        "taxes": normalized_taxes,
        "subtotal": round(float(subtotal), 2),
        "tax_total": round(float(tax_total), 2),
        "total": round(float(total), 2),
        "raw_text": str(result.get("raw_text") or "").strip(),
        "confidence": round(float(result.get("confidence") or 0), 2),
    }


def parse_item_assignments(
    question: str,
    receipt: dict[str, Any],
    members: list[dict[str, Any]],
) -> dict[str, Any]:
    compact_members = [
        {
            "id": member["id"],
            "name": member["name"],
        }
        for member in members
    ]

    compact_items = [
        {
            "id": item["id"],
            "name": item["name"],
            "quantity": item["quantity"],
            "line_total": item["line_total"],
        }
        for item in receipt.get("items", [])
    ]

    prompt = f"""
Map the user's item-assignment message to the exact trip members and receipt item IDs.
Return ONLY valid JSON.

VALID MEMBERS:
{json.dumps(compact_members, ensure_ascii=False)}

VALID RECEIPT ITEMS:
{json.dumps(compact_items, ensure_ascii=False)}

USER MESSAGE:
{question}

Return exactly:
{{
  "assignments": [
    {{
      "member_id": "exact-valid-member-id",
      "item_ids": ["exact-valid-item-id"]
    }}
  ],
  "unassigned_item_ids": ["exact-valid-item-id"],
  "notes": []
}}

Rules:
- Match names to the closest valid member only when the user's wording clearly identifies that person.
- Match item names to the closest valid receipt item only when clearly identified.
- Never create a member or item that is not in the supplied lists.
- Each receipt item should be assigned at most once.
- If an item is not assigned, put its ID in unassigned_item_ids.
- If the user says an item is shared by multiple people, add the same item ID to each member and explain the shared assignment in notes.
- Do not calculate money; the application calculates it.
""".strip()

    response = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": "You are a strict JSON item-assignment parser."},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
        max_completion_tokens=950,
        response_format={"type": "json_object"},
    )

    return _extract_json(_message_content(response))


