"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type ItineraryItem = {
  id: string;
  trip_id: string;
  title: string;
  item_date: string;
  location: string | null;
  type: string | null;
};

type DraftItem = {
  id?: string;
  title: string;
  item_date: string;
  location: string;
  type: string;
};

type Toast =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

const TYPE_OPTIONS = [
  "travel",
  "sightseeing",
  "hotel",
  "food",
  "activity",
  "booking",
  "free time",
  "other",
];

const COLORS = {
  page: "#f5f1e7",
  card: "#fbf8f0",
  ink: "#191a18",
  muted: "#777269",
  accent: "#806a37",
  accentSoft: "#e8dfd0",
  line: "rgba(41,42,37,.11)",
  sage: "#dce8d4",
};

/* =========================================================
   DATE HELPERS
========================================================= */

function todayISO() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidISODate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function addDaysToISO(date: string, days: number) {
  const base = new Date(`${date}T00:00:00`);

  base.setDate(base.getDate() + days);

  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  if (!isValidISODate(date)) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function dayLabel(date: string) {
  if (!isValidISODate(date)) {
    return "Unknown day";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00`));
}

/* =========================================================
   GENERAL HELPERS
========================================================= */

function normalizeType(type: string | null | undefined) {
  const normalized = (type || "other").trim().toLowerCase();

  return TYPE_OPTIONS.includes(normalized)
    ? normalized
    : "other";
}

function normalizeApiItem(
  value: unknown,
  fallbackTripId = ""
): ItineraryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  const id =
    typeof row.id === "string"
      ? row.id
      : "";

  const title =
    typeof row.title === "string"
      ? row.title.trim()
      : "";

  const itemDate =
    typeof row.item_date === "string"
      ? row.item_date
      : "";

  if (
    !id ||
    !title ||
    !isValidISODate(itemDate)
  ) {
    return null;
  }

  return {
    id,

    trip_id:
      typeof row.trip_id === "string"
        ? row.trip_id
        : fallbackTripId,

    title,

    item_date: itemDate,

    location:
      typeof row.location === "string" &&
      row.location.trim()
        ? row.location.trim()
        : null,

    type: normalizeType(
      typeof row.type === "string"
        ? row.type
        : "other"
    ),
  };
}

function normalizeApiItems(
  value: unknown,
  fallbackTripId = ""
): ItineraryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      normalizeApiItem(item, fallbackTripId)
    )
    .filter(
      (item): item is ItineraryItem =>
        Boolean(item)
    );
}

function isValidDraft(item: DraftItem) {
  return Boolean(
    item &&
      item.title.trim() &&
      isValidISODate(item.item_date)
  );
}

/* =========================================================
   PDF TYPE DETECTION
========================================================= */

function guessPdfType(line: string) {
  const text = line.toLowerCase();

  if (
    /flight|airport|drive|train|bus|departure|arrival|transfer|road trip/.test(
      text
    )
  ) {
    return "travel";
  }

  if (
    /hotel|resort|check.?in|check.?out|stay|accommodation/.test(
      text
    )
  ) {
    return "hotel";
  }

  if (
    /breakfast|lunch|dinner|restaurant|food|cafe|bar|meal/.test(
      text
    )
  ) {
    return "food";
  }

  if (
    /ticket|booking|reservation/.test(
      text
    )
  ) {
    return "booking";
  }

  if (
    /temple|museum|palace|fort|beach|sight|visit|tour|market|monument/.test(
      text
    )
  ) {
    return "sightseeing";
  }

  if (
    /activity|trek|hike|boating|safari|adventure/.test(
      text
    )
  ) {
    return "activity";
  }

  return "other";
}

/* =========================================================
   PDF DATE PARSING
========================================================= */

function parseDateFromText(text: string): string | null {
  /* 2026-09-28 */
  const iso = text.match(
    /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/
  );

  if (iso) {
    const value =
      `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(
        2,
        "0"
      )}`;

    if (isValidISODate(value)) {
      return value;
    }
  }

  /* 28-09-2026 / 28/09/2026 */
  const indian = text.match(
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/
  );

  if (indian) {
    const value =
      `${indian[3]}-${indian[2].padStart(
        2,
        "0"
      )}-${indian[1].padStart(2, "0")}`;

    if (isValidISODate(value)) {
      return value;
    }
  }

  /* 28 September 2026 */
  const longDate = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  );

  if (longDate) {
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];

    const monthIndex = monthNames.indexOf(
      longDate[2].toLowerCase()
    );

    if (monthIndex >= 0) {
      const value =
        `${longDate[3]}-${String(
          monthIndex + 1
        ).padStart(2, "0")}-${longDate[1].padStart(
          2,
          "0"
        )}`;

      if (isValidISODate(value)) {
        return value;
      }
    }
  }

  /* September 28, 2026 */
  const reverseLongDate = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/i
  );

  if (reverseLongDate) {
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];

    const monthIndex = monthNames.indexOf(
      reverseLongDate[1].toLowerCase()
    );

    if (monthIndex >= 0) {
      const value =
        `${reverseLongDate[3]}-${String(
          monthIndex + 1
        ).padStart(2, "0")}-${reverseLongDate[2].padStart(
          2,
          "0"
        )}`;

      if (isValidISODate(value)) {
        return value;
      }
    }
  }

  return null;
}

/* =========================================================
   PDF TEXT CLEANING
========================================================= */

function preparePdfLines(text: string) {
  let cleaned = text
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n");

  /*
   * Some PDFs return:
   *
   * Day 1 ... Day 2 ... Day 3 ...
   *
   * as ONE line.
   *
   * Force a new line before every Day.
   */
  cleaned = cleaned.replace(
    /\s+(?=Day\s*\d{1,2}\s*[-–—:])/gi,
    "\n"
  );

  /*
   * Force new lines before bullets.
   */
  cleaned = cleaned.replace(
    /\s+(?=[•●▪◦])/g,
    "\n"
  );

  /*
   * Clean repeated spaces.
   */
  return cleaned
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

/* =========================================================
   PDF ITINERARY PARSER
========================================================= */

function parsePdfItineraryText(
  text: string
): DraftItem[] {
  const lines = preparePdfLines(text);

  const result: DraftItem[] = [];

  let currentDate = "";
  let currentLocation = "";

  for (const originalLine of lines) {
    let line = originalLine
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!line) {
      continue;
    }

    /*
     * -----------------------------------------------------
     * STRUCTURED FORMAT
     *
     * 2026-09-28 | Indore | sightseeing | Visit Rajwada
     * -----------------------------------------------------
     */

    const structured = line
      .split("|")
      .map((part) => part.trim());

    if (
      structured.length >= 4 &&
      isValidISODate(structured[0]) &&
      structured.slice(3).join(" | ").trim()
    ) {
      result.push({
        title: structured
          .slice(3)
          .join(" | ")
          .trim(),

        item_date: structured[0],

        location: structured[1] || "",

        type: normalizeType(
          structured[2]
        ),
      });

      currentDate = structured[0];

      currentLocation =
        structured[1] || "";

      continue;
    }

    /*
     * -----------------------------------------------------
     * DATE DETECTION
     * -----------------------------------------------------
     */

    const detectedDate =
      parseDateFromText(line);

    if (detectedDate) {
      currentDate = detectedDate;
    }

    /*
     * -----------------------------------------------------
     * DAY DETECTION
     *
     * Day 1 – Kamothe → Indore
     * Day 2 – Indore & Mandu
     * -----------------------------------------------------
     */

    const dayMatch = line.match(
      /\bday\s*(\d{1,2})\b/i
    );

    if (dayMatch) {
      const dayNumber = Number(
        dayMatch[1]
      );

      /*
       * If the PDF has no exact date,
       * create Day 1 from today and
       * increment subsequent days.
       */
      if (!detectedDate) {
        currentDate = addDaysToISO(
          todayISO(),
          Math.max(dayNumber - 1, 0)
        );
      }

      let afterDay = line
        .replace(
          /\bday\s*\d{1,2}\b/i,
          ""
        )
        .replace(
          /^[\s:–—-]+/,
          ""
        )
        .trim();

      /*
       * Remove excessive itinerary wording.
       */
      afterDay = afterDay
        .replace(
          /^[-–—:]+\s*/,
          ""
        )
        .trim();

      if (afterDay.length > 0) {
        /*
         * Try to identify a location from
         * the first section before the dash.
         *
         * Example:
         *
         * Indore & Mandu – Option A:
         * Mandu day trip...
         */

        const locationPart =
          afterDay.split(
            /\s+[-–—]\s+/
          )[0];

        if (
          locationPart &&
          locationPart.length >= 2
        ) {
          currentLocation =
            locationPart.trim();
        }

        /*
         * Use the entire Day line as the
         * itinerary title.
         */
        let title = afterDay
          .replace(
            /^option\s*[ab]\s*:\s*/i,
            ""
          )
          .trim();

        if (
          title.length >= 3
        ) {
          result.push({
            title: `Day ${dayNumber} – ${title}`,
            item_date: currentDate,
            location: currentLocation,
            type: guessPdfType(
              title
            ),
          });
        }
      } else {
        result.push({
          title: `Day ${dayNumber}`,
          item_date: currentDate,
          location: currentLocation,
          type: "travel",
        });
      }

      continue;
    }

    /*
     * -----------------------------------------------------
     * IGNORE COMMON HEADINGS
     * -----------------------------------------------------
     */

    if (
      /^(itinerary|trip itinerary|travel itinerary|schedule|agenda)$/i.test(
        line
      )
    ) {
      continue;
    }

    if (
      /^(quick facts|quick facts & distances)$/i.test(
        line
      )
    ) {
      continue;
    }

    /*
     * Ignore distance-only information.
     */
    if (
      /distance|approx|approximately|hours?|hrs?|km|kilomet(er|re)s?/i.test(
        line
      ) &&
      !/day|visit|explore|drive|stay|temple|palace|mandu|ujjain|indore/i.test(
        line
      )
    ) {
      continue;
    }

    /*
     * -----------------------------------------------------
     * LOCATION
     * -----------------------------------------------------
     */

    const locationMatch =
      line.match(
        /(?:location|place|destination|at)\s*[:\-]\s*(.+)$/i
      );

    if (locationMatch) {
      currentLocation =
        locationMatch[1].trim();

      continue;
    }

    /*
     * -----------------------------------------------------
     * ONLY CREATE NORMAL ITEMS AFTER
     * A DATE OR DAY HAS BEEN FOUND.
     * -----------------------------------------------------
     */

    if (!currentDate) {
      continue;
    }

    let title = line
      .replace(
        /\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g,
        ""
      )
      .replace(
        /\b\d{1,2}[-/.]\d{1,2}[-/.]20\d{2}\b/g,
        ""
      )
      .replace(
        /^[•●▪◦\-:|]+/,
        ""
      )
      .trim();

    /*
     * Remove common quick-facts noise.
     */
    if (
      /quick facts|suggested\s+\d+\s*[-–]\s*\d+\s*day/i.test(
        title
      )
    ) {
      continue;
    }

    /*
     * Ignore tiny fragments.
     */
    if (title.length < 8) {
      continue;
    }

    result.push({
      title,
      item_date: currentDate,
      location: currentLocation,
      type: guessPdfType(title),
    });
  }

  /*
   * Final validation.
   */
  return result
    .filter(isValidDraft)
    .slice(0, 100);
}

/* =========================================================
   API
========================================================= */

async function readApiResponse(
  response: Response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const raw =
    await response.text();

  if (
    !contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    throw new Error(
      `The itinerary API returned ${response.status} ${response.statusText} instead of JSON. Check that app/api/trip/[tripId]/itinerary/route.ts exists at exactly that path.`
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "The itinerary API returned invalid JSON."
    );
  }
}

function makeEmptyDraft(): DraftItem {
  return {
    title: "",
    item_date: todayISO(),
    location: "",
    type: "sightseeing",
  };
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function ItineraryPage() {
  const params =
    useParams<{ tripId: string }>();

  const tripId = params?.tripId;

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [items, setItems] =
    useState<ItineraryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState("");

  const [selectedType, setSelectedType] =
    useState("all");

  const [toast, setToast] =
    useState<Toast>(null);

  const [showAdd, setShowAdd] =
    useState(false);

  const [draft, setDraft] =
    useState<DraftItem>(
      makeEmptyDraft()
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [textMode, setTextMode] =
    useState(false);

  const [textInput, setTextInput] =
    useState("");

  const [textDate, setTextDate] =
    useState(todayISO());

  const [textLocation, setTextLocation] =
    useState("");

  const [textType, setTextType] =
    useState("sightseeing");

  const [pdfName, setPdfName] =
    useState("");

  const [pdfProcessing, setPdfProcessing] =
    useState(false);

  const [pdfDrafts, setPdfDrafts] =
    useState<DraftItem[]>([]);

  const [pdfText, setPdfText] =
    useState("");

  const [showPdfPreview, setShowPdfPreview] =
    useState(false);

  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(next: Toast) {
    setToast(next);

    window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }

  /* =======================================================
     LOAD ITEMS
  ======================================================= */

  async function loadItems(
    showSpinner = true
  ) {
    if (!tripId) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (showSpinner) {
      setLoading(true);
    }

    try {
      const response =
        await fetch(
          `/api/trip/${encodeURIComponent(
            tripId
          )}/itinerary`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const result =
        await readApiResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          typeof result?.error ===
            "string"
            ? result.error
            : "Unable to load itinerary."
        );
      }

      const serverItems =
        normalizeApiItems(
          result?.items,
          tripId
        );

      setItems(serverItems);
    } catch (error) {
      console.error(
        "LOAD ITINERARY ERROR:",
        error
      );

      if (showSpinner) {
        setItems([]);
      }

      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load itinerary.",
      });
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadItems();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredItems =
    useMemo(() => {
      const q =
        query.trim().toLowerCase();

      return items.filter(
        (item): item is ItineraryItem => {
          if (
            !item ||
            !item.title ||
            !isValidISODate(
              item.item_date
            )
          ) {
            return false;
          }

          const matchesQuery =
            !q ||
            item.title
              .toLowerCase()
              .includes(q) ||
            (item.location || "")
              .toLowerCase()
              .includes(q) ||
            normalizeType(item.type)
              .includes(q);

          const matchesType =
            selectedType === "all" ||
            normalizeType(
              item.type
            ) === selectedType;

          return (
            matchesQuery &&
            matchesType
          );
        }
      );
    }, [
      items,
      query,
      selectedType,
    ]);

  /* =======================================================
     GROUP BY DATE
  ======================================================= */

  const groupedItems =
    useMemo(() => {
      const groups =
        new Map<
          string,
          ItineraryItem[]
        >();

      [...filteredItems]
        .filter(
          (item) =>
            Boolean(item) &&
            isValidISODate(
              item.item_date
            )
        )
        .sort((a, b) =>
          a.item_date.localeCompare(
            b.item_date
          )
        )
        .forEach((item) => {
          const list =
            groups.get(
              item.item_date
            ) ?? [];

          list.push(item);

          groups.set(
            item.item_date,
            list
          );
        });

      return Array.from(
        groups.entries()
      );
    }, [filteredItems]);

  /* =======================================================
     TRIP DAYS
  ======================================================= */

  const tripDays =
    useMemo(() => {
      return new Set(
        items
          .filter(
            (item) =>
              Boolean(item) &&
              isValidISODate(
                item.item_date
              )
          )
          .map(
            (item) =>
              item.item_date
          )
      ).size;
    }, [items]);

  /* =======================================================
     SAVE MANUAL ITEM
  ======================================================= */

  async function saveItem(
    event: FormEvent
  ) {
    event.preventDefault();

    const cleanTitle =
      draft.title.trim();

    const cleanLocation =
      draft.location.trim();

    const cleanType =
      normalizeType(
        draft.type
      );

    if (!tripId) {
      showToast({
        type: "error",
        message:
          "Trip ID is missing.",
      });
      return;
    }

    if (!cleanTitle) {
      showToast({
        type: "error",
        message:
          "Please enter a plan title.",
      });
      return;
    }

    if (
      !isValidISODate(
        draft.item_date
      )
    ) {
      showToast({
        type: "error",
        message:
          "Please select a valid date.",
      });
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `/api/trip/${encodeURIComponent(
            tripId
          )}/itinerary`,
          {
            method: editingId
              ? "PATCH"
              : "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              ...(editingId
                ? { id: editingId }
                : {}),

              title: cleanTitle,

              item_date:
                draft.item_date,

              location:
                cleanLocation,

              type: cleanType,
            }),
          }
        );

      const result =
        await readApiResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          typeof result?.error ===
            "string"
            ? result.error
            : "Unable to save itinerary item."
        );
      }

      /*
       * PATCH returns:
       * { item: {...} }
       *
       * POST returns:
       * { items: [{...}] }
       */
      const savedItem =
        normalizeApiItem(
          result?.item ??
            result?.items?.[0],
          tripId
        );

      if (!savedItem) {
        throw new Error(
          "The server returned an invalid itinerary item."
        );
      }

      setItems((current) => {
        if (editingId) {
          return current.map(
            (item) =>
              item.id === editingId
                ? savedItem
                : item
          );
        }

        return [
          ...current,
          savedItem,
        ];
      });

      setDraft(
        makeEmptyDraft()
      );

      setEditingId(null);
      setShowAdd(false);

      showToast({
        type: "success",
        message: editingId
          ? "Itinerary item updated."
          : "Itinerary item added.",
      });
    } catch (error) {
      console.error(
        "SAVE ITINERARY ITEM ERROR:",
        error
      );

      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save itinerary item.",
      });
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function beginEdit(
    item: ItineraryItem
  ) {
    if (
      !item?.id ||
      !item.title ||
      !isValidISODate(
        item.item_date
      )
    ) {
      showToast({
        type: "error",
        message:
          "This itinerary item cannot be edited because its data is incomplete.",
      });

      return;
    }

    setEditingId(item.id);

    setDraft({
      id: item.id,
      title: item.title,
      item_date:
        item.item_date,
      location:
        item.location || "",
      type: normalizeType(
        item.type
      ),
    });

    setShowAdd(true);
    setTextMode(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function deleteItem(
    id: string
  ) {
    if (
      !tripId ||
      !id ||
      !window.confirm(
        "Delete this itinerary item?"
      )
    ) {
      return;
    }

    setDeletingId(id);

    try {
      const response =
        await fetch(
          `/api/trip/${encodeURIComponent(
            tripId
          )}/itinerary?id=${encodeURIComponent(
            id
          )}`,
          {
            method: "DELETE",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const result =
        await readApiResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          typeof result?.error ===
            "string"
            ? result.error
            : "Unable to delete itinerary item."
        );
      }

      setItems((current) =>
        current.filter(
          (item) =>
            item.id !== id
        )
      );

      showToast({
        type: "success",
        message:
          "Itinerary item deleted.",
      });
    } catch (error) {
      console.error(
        "DELETE ITINERARY ERROR:",
        error
      );

      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete itinerary item.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  /* =======================================================
     PASTE TEXT
  ======================================================= */


async function addTextItinerary() {
  if (!tripId) {
    showToast({
      type: "error",
      message: "Trip ID is missing.",
    });

    return;
  }

  if (!textInput.trim()) {
    showToast({
      type: "error",
      message: "Please paste an itinerary first.",
    });

    return;
  }

  if (!isValidISODate(textDate)) {
    showToast({
      type: "error",
      message: "Please select a valid default date.",
    });

    return;
  }

  const lines = textInput
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const parsed: DraftItem[] = [];

  for (const line of lines) {
    const parts = line
      .split("|")
      .map((part) => part.trim());

    /*
     * ----------------------------------------------------
     * STRUCTURED FORMAT
     *
     * Supports BOTH:
     *
     * 2026-12-15 | Bangkok | sightseeing | Grand Palace
     *
     * AND:
     *
     * 15 Dec 2026 | Bangkok | sightseeing | Grand Palace
     * ----------------------------------------------------
     */

    if (parts.length >= 4) {
      const detectedDate = parseDateFromText(parts[0]);

      if (
        detectedDate &&
        parts.slice(3).join(" | ").trim()
      ) {
        parsed.push({
          title: parts
            .slice(3)
            .join(" | ")
            .trim(),

          item_date: detectedDate,

          location: parts[1] || "",

          type: normalizeType(parts[2]),
        });

        continue;
      }
    }

    /*
     * ----------------------------------------------------
     * TWO-PART FORMAT
     *
     * Bangkok | Visit Grand Palace
     *
     * Uses the selected default date.
     * ----------------------------------------------------
     */

    if (
      parts.length >= 2 &&
      parts.slice(1).join(" | ").trim()
    ) {
      parsed.push({
        title: parts
          .slice(1)
          .join(" | ")
          .trim(),

        item_date: textDate,

        location: parts[0] || "",

        type: normalizeType(textType),
      });

      continue;
    }

    /*
     * ----------------------------------------------------
     * NORMAL TEXT
     *
     * Dinner at Sarafa Bazaar
     *
     * Uses default date/location/type.
     * ----------------------------------------------------
     */

    parsed.push({
      title: line,

      item_date: textDate,

      location: textLocation.trim(),

      type: normalizeType(textType),
    });
  }

  const validItems = parsed
    .filter(isValidDraft)
    .slice(0, 100);

  if (!validItems.length) {
    showToast({
      type: "error",
      message:
        "No valid itinerary items were found.",
    });

    return;
  }

  setSaving(true);

  try {
    const response = await fetch(
      `/api/trip/${encodeURIComponent(tripId)}/itinerary`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          items: validItems,
        }),
      }
    );

    const result =
      await readApiResponse(response);

    if (!response.ok) {
      throw new Error(
        typeof result?.error === "string"
          ? result.error
          : "Unable to add text itinerary."
      );
    }

    const savedItems =
      normalizeApiItems(
        result?.items,
        tripId
      );

    if (!savedItems.length) {
      throw new Error(
        "The server returned no valid saved itinerary items."
      );
    }

    /*
     * Add the actual Supabase rows
     * returned by the API to the UI.
     */
    setItems((current) => [
      ...current,
      ...savedItems,
    ]);

    setTextInput("");
    setTextMode(false);

    showToast({
      type: "success",
      message:
        `${savedItems.length} itinerary item(s) added.`,
    });

  } catch (error) {
    console.error(
      "ADD TEXT ITINERARY ERROR:",
      error
    );

    showToast({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to add text itinerary.",
    });

  } finally {
    setSaving(false);
  }
}



  /* =======================================================
     PDF TEXT EXTRACTION
  ======================================================= */

  async function handlePdf(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Allow selecting the same PDF again.
     */
    event.target.value = "";

    if (!file || !tripId) {
      return;
    }

    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      showToast({
        type: "error",
        message:
          "Please select a PDF file.",
      });

      return;
    }

    /*
     * 10 MB maximum.
     */
    if (
      file.size >
      10 * 1024 * 1024
    ) {
      showToast({
        type: "error",
        message:
          "PDF must be 10 MB or smaller.",
      });

      return;
    }

    setPdfName(file.name);
    setPdfProcessing(true);
    setPdfDrafts([]);
    setPdfText("");
    setShowPdfPreview(false);

    try {
      /*
       * PDF.js is loaded only in the browser.
       */
      const pdfjs =
        await import(
          "pdfjs-dist/legacy/build/pdf.mjs"
        );

      /*
       * IMPORTANT:
       * This file must exist:
       *
       * public/pdf.worker.mjs
       */
      pdfjs.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.mjs";

      const buffer =
        new Uint8Array(
          await file.arrayBuffer()
        );

      const loadingTask =
        pdfjs.getDocument({
          data: buffer,
        });

      const pdf =
        await loadingTask.promise;

      const pages: string[] = [];

      /*
       * Read every page.
       *
       * IMPORTANT:
       * Instead of joining every text item
       * with spaces, we reconstruct lines
       * using their Y positions.
       *
       * This fixes PDFs where:
       *
       * Day 1 ...
       * Day 2 ...
       * Day 3 ...
       *
       * were returned as one huge line.
       */
      for (
        let pageNumber = 1;
        pageNumber <=
        pdf.numPages;
        pageNumber += 1
      ) {
        const page =
          await pdf.getPage(
            pageNumber
          );

        const content =
          await page.getTextContent();

        const rows =
          new Map<
            number,
            string[]
          >();

        for (const item of content.items) {
          const text =
            "str" in item &&
            typeof item.str ===
              "string"
              ? item.str
              : "";

          if (!text.trim()) {
            continue;
          }

          const transform =
            "transform" in item
              ? item.transform
              : null;

          const y =
            Array.isArray(
              transform
            ) &&
            typeof transform[5] ===
              "number"
              ? Math.round(
                  transform[5]
                )
              : 0;

          const existing =
            rows.get(y) ?? [];

          existing.push(text);

          rows.set(y, existing);
        }

        /*
         * PDF coordinates start from
         * bottom-left, so higher Y values
         * come first visually.
         */
        const pageLines =
          Array.from(
            rows.entries()
          )
            .sort(
              (a, b) =>
                b[0] - a[0]
            )
            .map(([, values]) =>
              values
                .join(" ")
                .replace(
                  /\s+/g,
                  " "
                )
                .trim()
            )
            .filter(Boolean);

        pages.push(
          pageLines.join("\n")
        );
      }

      const extractedText =
        pages.join("\n");

      const cleanedText =
        extractedText
          .replace(/\u00a0/g, " ")
          .trim();

      if (!cleanedText) {
        setPdfText("");
        setPdfDrafts([]);
        setShowPdfPreview(true);

        showToast({
          type: "error",
          message:
            "No readable text was found. This may be a scanned or image-only PDF.",
        });

        return;
      }

      /*
       * Show extracted text.
       */
      setPdfText(
        cleanedText
      );

      /*
       * Parse itinerary.
       */
      const parsedItems =
        parsePdfItineraryText(
          cleanedText
        );

      setPdfDrafts(
        parsedItems
      );

      setShowPdfPreview(
        true
      );

      if (!parsedItems.length) {
        showToast({
          type: "error",
          message:
            "PDF text was extracted, but no itinerary items were detected. You can copy the extracted text into Paste text.",
        });
      } else {
        showToast({
          type: "success",
          message: `${parsedItems.length} itinerary item(s) detected.`,
        });
      }
    } catch (error) {
      console.error(
        "PDF IMPORT ERROR:",
        error
      );

      setPdfDrafts([]);

      setShowPdfPreview(
        true
      );

      showToast({
        type: "error",
        message:
          error instanceof Error
            ? `Unable to process PDF: ${error.message}`
            : "Unable to process PDF.",
      });
    } finally {
      setPdfProcessing(false);
    }
  }

  /* =======================================================
     SAVE PDF ITEMS
  ======================================================= */

  async function savePdfDrafts() {
    if (!tripId) {
      setToast({
        type: "error",
        message:
          "Trip ID is missing.",
      });

      return;
    }

    const validDrafts =
      pdfDrafts
        .map((item) => ({
          ...item,

          title:
            item.title.trim(),

          item_date:
            item.item_date.trim(),

          location:
            item.location.trim(),

          type: normalizeType(
            item.type
          ),
        }))
        .filter(isValidDraft)
        .slice(0, 100);

    if (!validDrafts.length) {
      setToast({
        type: "error",
        message:
          "There are no valid PDF itinerary items to save.",
      });

      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `/api/trip/${encodeURIComponent(
            tripId
          )}/itinerary`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              items: validDrafts,
            }),
          }
        );

      const result =
        await readApiResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          typeof result?.error ===
            "string"
            ? result.error
            : "Unable to save PDF itinerary."
        );
      }

      const savedItems =
        normalizeApiItems(
          result?.items,
          tripId
        );

      if (!savedItems.length) {
        throw new Error(
          "The server returned no valid saved PDF itinerary items."
        );
      }

      setItems((current) => [
        ...current,
        ...savedItems,
      ]);

      setPdfDrafts([]);
      setPdfText("");
      setPdfName("");
      setShowPdfPreview(
        false
      );

      setToast({
        type: "success",
        message: `${savedItems.length} PDF itinerary item(s) saved.`,
      });
    } catch (error) {
      console.error(
        "SAVE PDF ITINERARY ERROR:",
        error
      );

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save PDF itinerary.",
      });
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f5f1e7] text-[#191a18]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(128,106,55,.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(90,105,76,.06),transparent_25%)]">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="sticky top-0 z-50 border-b border-[#292a25]/10 bg-[#f5f1e7]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[78px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-10">

            <Link
              href={`/trip/${tripId}`}
              className="flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#191a18] font-serif text-lg font-bold text-[#f5f1e7]">
                T
              </span>

              <span>
                <span className="block font-serif text-xl font-bold tracking-[-.03em]">
                  TripWise
                </span>

                <span className="block text-[9px] font-bold uppercase tracking-[.2em] text-[#806a37]">
                  Group travel
                </span>
              </span>
            </Link>

            <Link
              href={`/trip/${tripId}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#292a25]/15 bg-[#faf7ef] px-4 py-2.5 text-sm font-bold transition hover:bg-white"
            >
              <ArrowLeft size={15} />

              <span className="hidden sm:inline">
                Trip overview
              </span>

              <span className="sm:hidden">
                Back
              </span>
            </Link>
          </div>
        </header>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <section className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

          {/* HERO */}

          <div className="mb-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#806a37]">
                  Trip planning
                </p>

                <h1 className="mt-3 font-serif text-4xl leading-none tracking-[-.05em] sm:text-6xl">
                  Your itinerary.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#777269]">
                  Build the trip day by day, add plans manually, or turn an existing PDF itinerary into editable TripWise items.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(
                      makeEmptyDraft()
                    );
                    setShowAdd(true);
                    setTextMode(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(25,26,24,.12)] transition hover:-translate-y-0.5"
                >
                  <Plus size={16} />
                  Add plan
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTextMode(
                      (value) =>
                        !value
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-[#292a25]/15 bg-[#faf7ef] px-5 py-3 text-sm font-bold transition hover:bg-white"
                >
                  <FileText size={16} />
                  Paste text
                </button>

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    pdfProcessing
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-[#806a37]/25 bg-[#e8dfd0] px-5 py-3 text-sm font-bold text-[#5e4e2f] transition hover:bg-[#e0d4bf] disabled:opacity-60"
                >
                  {pdfProcessing ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload size={16} />
                  )}

                  {pdfProcessing
                    ? "Reading PDF…"
                    : "Import PDF"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={
                    handlePdf
                  }
                />
              </div>
            </div>
          </div>

          {/* STATS */}

          <div className="mb-7 grid gap-3 sm:grid-cols-3">

            <StatCard
              icon={
                <CalendarDays
                  size={18}
                />
              }
              label="Planned days"
              value={String(
                tripDays
              )}
            />

            <StatCard
              icon={
                <MapPin size={18} />
              }
              label="Plans"
              value={String(
                items.length
              )}
            />

            <StatCard
              icon={
                <Clock3 size={18} />
              }
              label="Status"
              value={
                items.length
                  ? "In progress"
                  : "Ready to plan"
              }
            />
          </div>

          {/* =================================================
              ADD / PASTE SECTION
          ================================================= */}

          {(showAdd ||
            textMode) && (
            <section className="mb-8 overflow-hidden rounded-[28px] border border-[#292a25]/10 bg-[#fbf8f0] shadow-[0_18px_55px_rgba(44,40,29,.07)]">

              <div className="flex items-center justify-between border-b border-[#292a25]/10 px-5 py-4 sm:px-7">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#806a37]">
                    Add to trip
                  </p>

                  <h2 className="mt-1 font-serif text-2xl">
                    {textMode
                      ? "Paste an itinerary"
                      : editingId
                      ? "Edit itinerary item"
                      : "Add a plan"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(
                      false
                    );
                    setTextMode(
                      false
                    );
                    setEditingId(
                      null
                    );
                  }}
                  className="rounded-full p-2 text-[#777269] hover:bg-[#eee7da]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* PASTE MODE */}

              {textMode ? (
                <div className="p-5 sm:p-7">

                  <p className="text-xs leading-6 text-[#777269]">
                    One plan per line. You can simply paste text, or use{" "}
                    <b>
                      date | location |
                      type | title
                    </b>{" "}
                    for structured rows.
                  </p>

                  <textarea
                    value={
                      textInput
                    }
                    onChange={(e) =>
                      setTextInput(
                        e.target.value
                      )
                    }
                    placeholder={
                      "2026-09-28 | Dhule | travel | Drive from Kamothe to Dhule\n2026-09-29 | Indore | sightseeing | Explore Rajwada Palace\nDinner at Sarafa Bazaar"
                    }
                    className="mt-4 min-h-[190px] w-full rounded-2xl border border-[#292a25]/12 bg-white/70 p-4 text-sm leading-7 outline-none transition focus:border-[#806a37]/50 focus:ring-4 focus:ring-[#806a37]/10"
                  />

                  <div className="mt-4 grid gap-3 md:grid-cols-3">

                    <Field label="Default date">
                      <input
                        type="date"
                        value={
                          textDate
                        }
                        onChange={(e) =>
                          setTextDate(
                            e.target
                              .value
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    </Field>

                    <Field label="Default location">
                      <input
                        value={
                          textLocation
                        }
                        onChange={(e) =>
                          setTextLocation(
                            e.target
                              .value
                          )
                        }
                        placeholder="e.g. Ujjain"
                        className={
                          inputClass
                        }
                      />
                    </Field>

                    <Field label="Default type">
                      <TypeSelect
                        value={
                          textType
                        }
                        onChange={
                          setTextType
                        }
                      />
                    </Field>
                  </div>

                  <div className="mt-5 flex justify-end">

                    <button
                      type="button"
                      disabled={
                        saving ||
                        !textInput.trim()
                      }
                      onClick={
                        addTextItinerary
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-[#191a18] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Check
                          size={15}
                        />
                      )}

                      Save text itinerary
                    </button>
                  </div>
                </div>
              ) : (
                /* MANUAL FORM */

                <form
                  onSubmit={
                    saveItem
                  }
                  noValidate
                  className="p-5 sm:p-7"
                >
                  <div className="grid gap-4 md:grid-cols-2">

                    <Field
                      label="Title *"
                      className="md:col-span-2"
                    >
                      <input
                        autoFocus
                        value={
                          draft.title
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            title:
                              e.target
                                .value,
                          })
                        }
                        placeholder="e.g. Visit Mahakaleshwar Temple"
                        className={
                          inputClass
                        }
                      />
                    </Field>

                    <Field label="Date *">
                      <input
                        type="date"
                        value={
                          isValidISODate(
                            draft.item_date
                          )
                            ? draft.item_date
                            : ""
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            item_date:
                              e.target
                                .value,
                          })
                        }
                        className={
                          inputClass
                        }
                      />
                    </Field>

                    <Field label="Location">
                      <input
                        value={
                          draft.location
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            location:
                              e.target
                                .value,
                          })
                        }
                        placeholder="e.g. Ujjain, Madhya Pradesh"
                        className={
                          inputClass
                        }
                      />
                    </Field>

                    <Field label="Type">
                      <TypeSelect
                        value={
                          draft.type
                        }
                        onChange={(
                          value
                        ) =>
                          setDraft({
                            ...draft,
                            type: value,
                          })
                        }
                      />
                    </Field>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">

                    <button
                      type="button"
                      onClick={() => {
                        setShowAdd(
                          false
                        );
                        setEditingId(
                          null
                        );
                      }}
                      className="rounded-full border border-[#292a25]/15 px-5 py-3 text-sm font-bold"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        saving ||
                        !draft.title.trim()
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-[#191a18] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Check
                          size={15}
                        />
                      )}

                      {editingId
                        ? "Update plan"
                        : "Add plan"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {/* =================================================
              SEARCH
          ================================================= */}

          <section className="mb-7 flex flex-col gap-3 rounded-[24px] border border-[#292a25]/10 bg-white/45 p-3 sm:flex-row sm:items-center">

            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#918b80]"
              />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(
                    e.target.value
                  )
                }
                placeholder="Search plans, places or types…"
                className="h-11 w-full rounded-full border border-[#292a25]/10 bg-[#fbf8f0] pl-11 pr-4 text-sm outline-none focus:border-[#806a37]/40"
              />
            </div>

            <div className="relative sm:w-48">

              <select
                value={
                  selectedType
                }
                onChange={(e) =>
                  setSelectedType(
                    e.target.value
                  )
                }
                className="h-11 w-full appearance-none rounded-full border border-[#292a25]/10 bg-[#fbf8f0] px-4 pr-10 text-sm font-medium outline-none"
              >
                <option value="all">
                  All types
                </option>

                {TYPE_OPTIONS.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {capitalize(
                        type
                      )}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#777269]"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void loadItems()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#292a25]/10 bg-[#fbf8f0] px-4 text-sm font-bold hover:bg-white"
            >
              <RefreshCw
                size={15}
              />
              Refresh
            </button>
          </section>

          {/* =================================================
              CONTENT
          ================================================= */}

          {loading ? (
            <LoadingState />
          ) : groupedItems.length ===
            0 ? (
            items.length > 0 ? (
              <NoResultsState
                onClear={() => {
                  setQuery("");
                  setSelectedType(
                    "all"
                  );
                }}
              />
            ) : (
              <EmptyState
                onAdd={() => {
                  setShowAdd(
                    true
                  );
                  setTextMode(
                    false
                  );
                  setDraft(
                    makeEmptyDraft()
                  );
                }}
              />
            )
          ) : (
            <div className="space-y-8">

              {groupedItems.map(
                (
                  [
                    date,
                    dateItems,
                  ],
                  index
                ) => (
                  <section
                    key={date}
                  >

                    <div className="mb-4 flex items-center gap-4">

                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#191a18] text-white">
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          Day
                        </span>

                        <span className="font-serif text-lg leading-none">
                          {index + 1}
                        </span>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#806a37]">
                          {formatDate(
                            date
                          )}
                        </p>

                        <h2 className="mt-1 font-serif text-2xl">
                          {dayLabel(
                            date
                          )}
                        </h2>
                      </div>

                      <div className="ml-auto hidden h-px flex-1 bg-[#292a25]/10 sm:block" />

                      <span className="hidden rounded-full bg-[#e8dfd0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6b5936] sm:block">
                        {
                          dateItems.length
                        }{" "}
                        {dateItems.length ===
                        1
                          ? "plan"
                          : "plans"}
                      </span>
                    </div>

                    <div className="ml-0 border-l border-dashed border-[#806a37]/30 pl-4 sm:ml-6 sm:pl-7">

                      <div className="space-y-3">

                        {dateItems.map(
                          (item) => (
                            <article
                              key={
                                item.id
                              }
                              className="group relative rounded-[24px] border border-[#292a25]/10 bg-[#fbf8f0] p-5 shadow-[0_12px_38px_rgba(44,40,29,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(44,40,29,.08)]"
                            >

                              <span className="absolute -left-[25px] top-7 h-3 w-3 rounded-full border-2 border-[#f5f1e7] bg-[#806a37] shadow-[0_0_0_3px_rgba(128,106,55,.12)] sm:-left-[37px]" />

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8dfd0] text-[#715f3e]">
                                  <ItemIcon
                                    type={normalizeType(
                                      item.type
                                    )}
                                  />
                                </div>

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span className="rounded-full bg-[#e8dfd0] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#6b5936]">
                                      {capitalize(
                                        normalizeType(
                                          item.type
                                        )
                                      )}
                                    </span>

                                    {item.location && (
                                      <span className="flex items-center gap-1 text-xs text-[#777269]">
                                        <MapPin
                                          size={
                                            12
                                          }
                                        />

                                        {
                                          item.location
                                        }
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="mt-3 font-serif text-2xl leading-tight tracking-[-.02em]">
                                    {
                                      item.title
                                    }
                                  </h3>
                                </div>

                                <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      beginEdit(
                                        item
                                      )
                                    }
                                    className="rounded-full p-2 text-[#777269] hover:bg-[#eee7da] hover:text-[#191a18]"
                                    aria-label="Edit itinerary item"
                                  >
                                    <Pencil
                                      size={
                                        15
                                      }
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteItem(
                                        item.id
                                      )
                                    }
                                    disabled={
                                      deletingId ===
                                      item.id
                                    }
                                    className="rounded-full p-2 text-[#9a6c63] hover:bg-[#f0dfda] disabled:opacity-50"
                                    aria-label="Delete itinerary item"
                                  >
                                    {deletingId ===
                                    item.id ? (
                                      <RefreshCw
                                        size={
                                          15
                                        }
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2
                                        size={
                                          15
                                        }
                                      />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </article>
                          )
                        )}
                      </div>
                    </div>
                  </section>
                )
              )}
            </div>
          )}

          <div className="mt-14 border-t border-[#292a25]/10 pt-8 text-center text-xs leading-6 text-[#8a857c]">
            TripWise keeps itinerary items attached to this trip, so the same plan can be used alongside your expenses, bookings and trip members.
          </div>
        </section>

        {/* =================================================
            PDF PREVIEW MODAL
        ================================================= */}

        {showPdfPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#191a18]/45 p-4 backdrop-blur-sm">

            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/30 bg-[#f5f1e7] shadow-[0_30px_100px_rgba(0,0,0,.25)]">

              {/* MODAL HEADER */}

              <div className="flex items-center justify-between border-b border-[#292a25]/10 px-5 py-4 sm:px-7">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#806a37]">
                    PDF import
                  </p>

                  <h2 className="mt-1 font-serif text-2xl">
                    Review before saving
                  </h2>

                  <p className="mt-1 text-xs text-[#777269]">
                    {pdfName ||
                      "Uploaded itinerary.pdf"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowPdfPreview(
                      false
                    )
                  }
                  className="rounded-full p-2 hover:bg-[#e9e3d5]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* MODAL BODY */}

              <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1fr_1.2fr]">

                {/* EXTRACTED TEXT */}

                <div className="min-h-0 overflow-y-auto border-b border-[#292a25]/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">

                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#806a37]">
                    Extracted text
                  </p>

                  <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-[#ece7da] p-4 text-xs leading-6 text-[#5f5b53]">
                    {pdfText ||
                      "No readable text was found in this PDF."}
                  </pre>
                </div>

                {/* ITEMS */}

                <div className="min-h-0 overflow-y-auto p-5 sm:p-7">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#806a37]">
                        Items to save
                      </p>

                      <p className="mt-1 text-xs text-[#777269]">
                        Edit dates, places and types before saving.
                      </p>
                    </div>

                    <span className="rounded-full bg-[#dce8d4] px-3 py-1 text-xs font-bold">
                      {
                        pdfDrafts.length
                      }
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">

                    {pdfDrafts.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={`${item.title}-${index}`}
                          className="rounded-2xl border border-[#292a25]/10 bg-white/60 p-4"
                        >

                          <input
                            value={
                              item.title
                            }
                            onChange={(
                              e
                            ) =>
                              setPdfDrafts(
                                (
                                  current
                                ) =>
                                  current.map(
                                    (
                                      row,
                                      i
                                    ) =>
                                      i ===
                                      index
                                        ? {
                                            ...row,
                                            title:
                                              e
                                                .target
                                                .value,
                                          }
                                        : row
                                  )
                              )
                            }
                            className="w-full border-0 bg-transparent font-serif text-lg outline-none"
                          />

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">

                            <input
                              type="date"
                              value={
                                isValidISODate(
                                  item.item_date
                                )
                                  ? item.item_date
                                  : ""
                              }
                              onChange={(
                                e
                              ) =>
                                setPdfDrafts(
                                  (
                                    current
                                  ) =>
                                    current.map(
                                      (
                                        row,
                                        i
                                      ) =>
                                        i ===
                                        index
                                          ? {
                                              ...row,
                                              item_date:
                                                e
                                                  .target
                                                  .value,
                                            }
                                          : row
                                    )
                                )
                              }
                              className={
                                smallInputClass
                              }
                            />

                            <input
                              value={
                                item.location
                              }
                              onChange={(
                                e
                              ) =>
                                setPdfDrafts(
                                  (
                                    current
                                  ) =>
                                    current.map(
                                      (
                                        row,
                                        i
                                      ) =>
                                        i ===
                                        index
                                          ? {
                                              ...row,
                                              location:
                                                e
                                                  .target
                                                  .value,
                                            }
                                          : row
                                    )
                                )
                              }
                              placeholder="Location"
                              className={
                                smallInputClass
                              }
                            />

                            <select
                              value={
                                normalizeType(
                                  item.type
                                )
                              }
                              onChange={(
                                e
                              ) =>
                                setPdfDrafts(
                                  (
                                    current
                                  ) =>
                                    current.map(
                                      (
                                        row,
                                        i
                                      ) =>
                                        i ===
                                        index
                                          ? {
                                              ...row,
                                              type:
                                                e
                                                  .target
                                                  .value,
                                            }
                                          : row
                                    )
                                )
                              }
                              className={
                                smallInputClass
                              }
                            >
                              {TYPE_OPTIONS.map(
                                (
                                  type
                                ) => (
                                  <option
                                    key={
                                      type
                                    }
                                    value={
                                      type
                                    }
                                  >
                                    {capitalize(
                                      type
                                    )}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </div>
                      )
                    )}

                    {!pdfDrafts.length && (
                      <div className="rounded-2xl bg-[#ece7da] p-5 text-sm leading-6 text-[#777269]">
                        <p className="font-bold text-[#5f5b53]">
                          No itinerary rows could be detected.
                        </p>

                        <p className="mt-2">
                          The PDF text was extracted successfully. You can copy the extracted text into the Paste text option.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}

              <div className="flex flex-col-reverse gap-2 border-t border-[#292a25]/10 bg-[#fbf8f0] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">

                <button
                  type="button"
                  onClick={() =>
                    setShowPdfPreview(
                      false
                    )
                  }
                  className="rounded-full border border-[#292a25]/15 px-5 py-3 text-sm font-bold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    saving ||
                    !pdfDrafts.length
                  }
                  onClick={
                    savePdfDrafts
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#191a18] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Check
                      size={15}
                    />
                  )}

                  Save to itinerary
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            TOAST
        ================================================= */}

        {toast && (
          <div className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 px-4">

            <div
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_18px_50px_rgba(0,0,0,.2)] ${
                toast.type ===
                "success"
                  ? "bg-[#355244]"
                  : "bg-[#7b3f38]"
              }`}
            >
              {toast.type ===
              "success" ? (
                <Check
                  size={15}
                />
              ) : (
                <X size={15} />
              )}

              {toast.message}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   STYLES
========================================================= */

const inputClass =
  "h-11 w-full rounded-xl border border-[#292a25]/12 bg-white/70 px-3.5 text-sm outline-none transition focus:border-[#806a37]/50 focus:ring-4 focus:ring-[#806a37]/10";

const smallInputClass =
  "h-10 w-full rounded-xl border border-[#292a25]/10 bg-[#fbf8f0] px-3 text-xs outline-none focus:border-[#806a37]/40";

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`block ${className}`}
    >
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.16em] text-[#777269]">
        {label}
      </span>

      {children}
    </label>
  );
}

/* =========================================================
   TYPE SELECT
========================================================= */

function TypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div className="relative">

      <select
        value={normalizeType(
          value
        )}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className={`${inputClass} appearance-none pr-10`}
      >
        {TYPE_OPTIONS.map(
          (type) => (
            <option
              key={type}
              value={type}
            >
              {capitalize(
                type
              )}
            </option>
          )
        )}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#777269]"
      />
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#292a25]/10 bg-[#fbf8f0] p-4 shadow-[0_10px_30px_rgba(44,40,29,.04)]">

      <div className="flex items-center gap-3">

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8dfd0] text-[#715f3e]">
          {icon}
        </span>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8a857c]">
            {label}
          </p>

          <p className="mt-1 font-serif text-xl">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ITEM ICON
========================================================= */

function ItemIcon({
  type,
}: {
  type: string;
}) {
  if (
    type === "travel"
  ) {
    return (
      <span className="text-lg">
        ✈
      </span>
    );
  }

  if (
    type === "hotel"
  ) {
    return (
      <span className="text-lg">
        ⌂
      </span>
    );
  }

  if (
    type === "food"
  ) {
    return (
      <span className="text-lg">
        ◌
      </span>
    );
  }

  if (
    type === "booking"
  ) {
    return (
      <CalendarDays
        size={18}
      />
    );
  }

  if (
    type === "free time"
  ) {
    return (
      <Clock3
        size={18}
      />
    );
  }

  return (
    <MapPin size={18} />
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(
        (item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-[24px] border border-[#292a25]/10 bg-[#fbf8f0]"
          />
        )
      )}
    </div>
  );
}

/* =========================================================
   NO RESULTS
========================================================= */

function NoResultsState({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div className="rounded-[30px] border border-dashed border-[#806a37]/30 bg-[#fbf8f0]/70 px-6 py-16 text-center">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8dfd0] text-[#806a37]">
        <Search
          size={22}
        />
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-[#806a37]">
        No matching plans
      </p>

      <h2 className="mt-2 font-serif text-3xl">
        Nothing matches your filter.
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#777269]">
        Try another search term or reset the itinerary filters.
      </p>

      <button
        type="button"
        onClick={
          onClear
        }
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#191a18] px-6 py-3 text-sm font-bold text-white"
      >
        Clear filters
      </button>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <div className="rounded-[30px] border border-dashed border-[#806a37]/30 bg-[#fbf8f0]/70 px-6 py-20 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8dfd0] text-[#806a37]">
        <MapPin
          size={25}
        />
      </div>

      <p className="mt-6 text-[10px] font-bold uppercase tracking-[.22em] text-[#806a37]">
        No itinerary yet
      </p>

      <h2 className="mt-3 font-serif text-3xl">
        Plan the first stop.
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#777269]">
        Add a plan manually, paste an itinerary, or import your existing PDF.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#191a18] px-6 py-3 text-sm font-bold text-white"
      >
        <Plus
          size={16}
        />
        Add first plan
      </button>
    </div>
  );
}

/* =========================================================
   CAPITALIZE
========================================================= */

function capitalize(
  value: string
) {
  return value.replace(
    /\b\w/g,
    (char) =>
      char.toUpperCase()
  );
}