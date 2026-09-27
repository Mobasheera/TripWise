import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {}
        },
      },
    }
  );
}

type Member = {
  user_id: string;
  name: string;
};

type Assignment = {
  participantId: string;
  participantName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    baseAmount: number;
    taxAmount: number;
    totalAmount: number;
  }[];
  total: number;
};

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const tripId =
      String(body?.tripId || "");

    const billId =
      String(body?.billId || "");

    const instruction =
      String(
        body?.instruction || ""
      ).trim();

    if (
      !tripId ||
      !billId ||
      !instruction
    ) {
      return NextResponse.json(
        {
          error:
            "tripId, billId and assignment instruction are required.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await getSupabaseServer();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Please sign in first.",
        },
        { status: 401 }
      );
    }

    /*
     * Verify membership.
     */
    const {
      data: membership,
    } = await supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You are not a member of this trip.",
        },
        { status: 403 }
      );
    }

    /*
     * Load receipt.
     */
    const {
      data: bill,
      error: billError,
    } =
      await supabase
        .from("bills")
        .select(
          "id, trip_id, subtotal, tax, total"
        )
        .eq("id", billId)
        .eq("trip_id", tripId)
        .single();

    if (billError || !bill) {
      return NextResponse.json(
        {
          error:
            "Receipt was not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Load items.
     */
    const {
      data: items,
      error: itemsError,
    } =
      await supabase
        .from("bill_items")
        .select(
          "id, name, quantity, price"
        )
        .eq("bill_id", billId)
        .order("id");

    if (itemsError) {
      throw itemsError;
    }

    if (!items?.length) {
      return NextResponse.json(
        {
          error:
            "This receipt has no items.",
        },
        { status: 400 }
      );
    }

    /*
     * Load trip members and profiles.
     */
    const {
      data: memberRows,
      error: membersError,
    } =
      await supabase
        .from("trip_members")
        .select(
          `
          user_id,
          profiles (
            id,
            name,
            email
          )
          `
        )
        .eq("trip_id", tripId);

    if (membersError) {
      throw membersError;
    }

    const members: Member[] =
      (memberRows || []).map(
        (row: any) => ({
          user_id: row.user_id,
          name:
            row.profiles?.name ||
            row.profiles?.email ||
            "Traveler",
        })
      );

    if (!members.length) {
      return NextResponse.json(
        {
          error:
            "No participants found for this trip.",
        },
        { status: 400 }
      );
    }

    /*
     * Parse:
     *
     * Rahul gets pizza and coke.
     * Aman gets burger.
     *
     * Also supports:
     *
     * Rahul: pizza, coke
     * Aman: burger
     */
    const parsedAssignments =
      parseAssignments(
        instruction,
        members,
        items
      );

    if (
      parsedAssignments.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "I could not match the names and items. Try: Rahul gets pizza and coke. Aman gets burger.",
        },
        { status: 400 }
      );
    }

    /*
     * Ensure every receipt item has an
     * assignment.
     */
    const assignedItemIds =
      new Set<string>();

    for (
      const assignment of parsedAssignments
    ) {
      for (
        const item of assignment.items
      ) {
        assignedItemIds.add(
          item.itemId
        );
      }
    }

    const missingItems =
      items.filter(
        (item) =>
          !assignedItemIds.has(
            item.id
          )
      );

    if (missingItems.length) {
      return NextResponse.json(
        {
          error:
            `These items were not assigned: ${missingItems
              .map((item) => item.name)
              .join(", ")}. Please assign every item.`,
        },
        { status: 400 }
      );
    }

    /*
     * Tax is distributed proportionally according
     * to each item/base share.
     */
    const subtotal =
      Number(bill.subtotal || 0);

    const tax =
      Number(bill.tax || 0);

    const total =
      Number(bill.total || 0);

    const totalItemBase =
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0),
        0
      );

    const resultMap =
      new Map<
        string,
        Assignment
      >();

    /*
     * First calculate all raw item allocations.
     */
    for (
      const assignment of parsedAssignments
    ) {
      const finalItems =
        assignment.items.map(
          (item) => {
            const taxAmount =
              totalItemBase > 0
                ? Number(
                    (
                      (item.baseAmount /
                        totalItemBase) *
                      tax
                    ).toFixed(2)
                  )
                : 0;

            return {
              ...item,
              taxAmount,
              totalAmount:
                Number(
                  (
                    item.baseAmount +
                    taxAmount
                  ).toFixed(2)
                ),
            };
          }
        );

      const participantBase =
        finalItems.reduce(
          (sum, item) =>
            sum +
            item.baseAmount,
          0
        );

      const participantTax =
        finalItems.reduce(
          (sum, item) =>
            sum +
            item.taxAmount,
          0
        );

      resultMap.set(
        assignment.participantId,
        {
          ...assignment,
          items: finalItems,
          total:
            Number(
              (
                participantBase +
                participantTax
              ).toFixed(2)
            ),
        }
      );
    }

    const assignments =
      Array.from(
        resultMap.values()
      );

    /*
     * Correct rounding difference so that
     * allocation exactly equals receipt total.
     */
    const allocatedTotal =
      assignments.reduce(
        (sum, assignment) =>
          sum +
          assignment.total,
        0
      );

    const difference =
      Number(
        (
          total -
          allocatedTotal
        ).toFixed(2)
      );

    if (
      Math.abs(difference) >= 0.01 &&
      assignments.length
    ) {
      const last =
        assignments[
          assignments.length - 1
        ];

      last.total =
        Number(
          (
            last.total +
            difference
          ).toFixed(2)
        );
    }

    /*
     * Remove old item participants for this bill.
     */
    const itemIds =
      items.map(
        (item) => item.id
      );

    await supabase
      .from("item_participants")
      .delete()
      .in(
        "item_id",
        itemIds
      );

    /*
     * Save item participants.
     */
    const rows: any[] = [];

    for (
      const assignment of assignments
    ) {
      for (
        const item of assignment.items
      ) {
        const share =
          Number(
            item.baseAmount
          ) /
          Number(
            items.find(
              (source) =>
                source.id ===
                item.itemId
            )?.price || 1
          );

        rows.push({
          item_id:
            item.itemId,
          participant_id:
            assignment.participantId,
          share,
          amount:
            item.totalAmount,
        });
      }
    }

    const {
      error: insertError,
    } =
      await supabase
        .from("item_participants")
        .insert(rows);

    if (insertError) {
      throw insertError;
    }

    /*
     * Mark bill as assigned.
     */
    await supabase
      .from("bills")
      .update({
        scan_status:
          "assigned",
      })
      .eq("id", billId);

    const finalAllocated =
      assignments.reduce(
        (sum, assignment) =>
          sum +
          assignment.total,
        0
      );

    return NextResponse.json({
      success: true,

      assignments,

      summary: {
        subtotal,
        tax,
        receiptTotal:
          total,
        allocatedTotal:
          Number(
            finalAllocated.toFixed(2)
          ),
      },
    });
  } catch (error) {
    console.error(
      "Bill assignment error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to assign receipt items.",
      },
      { status: 500 }
    );
  }
}

function normalize(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function parseAssignments(
  instruction: string,
  members: Member[],
  items: any[]
): Assignment[] {
  const text =
    instruction
      .replace(/\r/g, "\n")
      .trim();

  const chunks =
    text
      .split(
        /(?:\n|[.;])+/g
      )
      .map(
        (chunk) =>
          chunk.trim()
      )
      .filter(Boolean);

  const assignments: Assignment[] =
    [];

  for (
    const member of members
  ) {
    const memberName =
      normalize(member.name);

    if (!memberName) {
      continue;
    }

    const memberPattern =
      new RegExp(
        `\\b${escapeRegex(
          memberName
        )}\\b\\s*(?:gets?|has|:|->|[-])\\s*(.+)`,
        "i"
      );

    for (
      const chunk of chunks
    ) {
      const match =
        chunk.match(
          memberPattern
        );

      if (!match) {
        continue;
      }

      const itemText =
        match[1]
          .replace(
            /\band\b/gi,
            ","
          )
          .replace(
            /\+/g,
            ","
          );

      const requestedNames =
        itemText
          .split(",")
          .map(
            (name) =>
              normalize(
                name
              )
          )
          .filter(Boolean);

      const matchedItems =
        items.filter(
          (item) => {
            const itemName =
              normalize(
                item.name
              );

            return requestedNames.some(
              (requested) =>
                itemName ===
                  requested ||
                itemName.includes(
                  requested
                ) ||
                requested.includes(
                  itemName
                )
            );
          }
        );

      if (
        matchedItems.length
      ) {
        const existing =
          assignments.find(
            (assignment) =>
              assignment.participantId ===
              member.user_id
          );

        const newItems =
          matchedItems.map(
            (item) => ({
              itemId: item.id,
              itemName:
                item.name,
              quantity:
                Number(
                  item.quantity ||
                    1
                ),
              baseAmount:
                Number(
                  item.price ||
                    0
                ),
              taxAmount: 0,
              totalAmount: 0,
            })
          );

        if (existing) {
          const ids =
            new Set(
              existing.items.map(
                (item) =>
                  item.itemId
              )
            );

          for (
            const item of newItems
          ) {
            if (
              !ids.has(
                item.itemId
              )
            ) {
              existing.items.push(
                item
              );
            }
          }
        } else {
          assignments.push({
            participantId:
              member.user_id,
            participantName:
              member.name,
            items: newItems,
            total: 0,
          });
        }
      }
    }
  }

  /*
   * Also support:
   *
   * Rahul gets pizza and coke, Aman gets burger
   *
   * by scanning the whole string.
   */
  if (
    assignments.length === 0
  ) {
    for (
      const member of members
    ) {
      const memberName =
        normalize(member.name);

      const startRegex =
        new RegExp(
          `\\b${escapeRegex(
            memberName
          )}\\b\\s*(?:gets?|has|:|->|[-])\\s*`,
          "i"
        );

      const match =
        startRegex.exec(text);

      if (!match) {
        continue;
      }

      const start =
        match.index +
        match[0].length;

      const rest =
        text.slice(start);

      const nextMemberIndexes =
        members
          .filter(
            (other) =>
              other.user_id !==
              member.user_id
          )
          .map(
            (other) => ({
              index:
                rest
                  .toLowerCase()
                  .indexOf(
                    normalize(
                      other.name
                    )
                  ),
              member:
                other,
            })
          )
          .filter(
            (entry) =>
              entry.index >= 0
          )
          .sort(
            (a, b) =>
              a.index -
              b.index
          );

      const end =
        nextMemberIndexes.length
          ? nextMemberIndexes[0]
              .index
          : rest.length;

      const itemText =
        rest
          .slice(0, end)
          .replace(
            /\band\b/gi,
            ","
          );

      const requested =
        itemText
          .split(",")
          .map(
            (item) =>
              normalize(item)
          )
          .filter(Boolean);

      const matched =
        items.filter(
          (item) =>
            requested.some(
              (name) => {
                const itemName =
                  normalize(
                    item.name
                  );

                return (
                  itemName.includes(
                    name
                  ) ||
                  name.includes(
                    itemName
                  )
                );
              }
            )
        );

      if (matched.length) {
        assignments.push({
          participantId:
            member.user_id,
          participantName:
            member.name,
          items:
            matched.map(
              (item) => ({
                itemId:
                  item.id,
                itemName:
                  item.name,
                quantity:
                  Number(
                    item.quantity ||
                      1
                  ),
                baseAmount:
                  Number(
                    item.price ||
                      0
                  ),
                taxAmount: 0,
                totalAmount: 0,
              })
            ),
          total: 0,
        });
      }
    }
  }

  return assignments;
}

function escapeRegex(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}