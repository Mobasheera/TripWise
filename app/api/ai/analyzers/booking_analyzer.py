from collections import defaultdict


def analyze_bookings(bookings):

    issues = []

    # -----------------------------------------
    # Duplicate / overlapping bookings
    # -----------------------------------------

    grouped = defaultdict(list)

    for booking in bookings:

        booking_type = str(
            booking.get("type") or ""
        ).lower()

        booking_date = booking.get("date")

        key = (
            booking_type,
            booking_date
        )

        grouped[key].append(booking)

    for key, items in grouped.items():

        if len(items) > 1:

            travelers = set()

            for booking in items:
                booking_travelers = booking.get("travelers") or []

                travelers.update(booking_travelers)

            issues.append({
                "type": "possible_duplicate",
                "severity": "medium",
                "message": (
                    f"Multiple {key[0] or 'booking'} bookings exist for "
                    f"{key[1]}."
                ),
                "booking_ids": [
                    b.get("id") for b in items
                ]
            })

    # -----------------------------------------
    # Price difference
    # -----------------------------------------

    by_type = defaultdict(list)

    for booking in bookings:

        booking_type = str(
            booking.get("type") or ""
        ).lower()

        by_type[booking_type].append(booking)

    for booking_type, items in by_type.items():

        if len(items) >= 2:

            amounts = [
                float(b.get("amount") or 0)
                for b in items
            ]

            average = sum(amounts) / len(amounts)

            for booking in items:

                amount = float(
                    booking.get("amount") or 0
                )

                if average > 0:

                    difference = (
                        abs(amount - average)
                        / average
                    )

                    if difference >= 0.30:

                        description = (
                            booking.get("description")
                            or booking.get("type")
                            or "Booking"
                        )

                        issues.append({
                            "type": "price_difference",
                            "severity": "medium",
                            "message": (
                                f"{description} costs "
                                f"₹{amount:.2f}, which is "
                                f"significantly different from the "
                                f"average {booking_type} booking "
                                f"of ₹{average:.2f}."
                            ),
                            "booking_id": booking.get("id")
                        })

    return issues