# from collections import defaultdict


# def analyze_bookings(bookings):

#     issues = []

#     # -----------------------------------------
#     # Duplicate / overlapping bookings
#     # -----------------------------------------

#     grouped = defaultdict(list)

#     for booking in bookings:
#         key = (
#             booking.type.lower(),
#             booking.date
#         )

#         grouped[key].append(booking)

#     for key, items in grouped.items():

#         if len(items) > 1:

#             travelers = set()

#             for booking in items:
#                 travelers.update(booking.travelers)

#             issues.append({
#                 "type": "possible_duplicate",
#                 "severity": "medium",
#                 "message": (
#                     f"Multiple {key[0]} bookings exist for "
#                     f"{key[1]}."
#                 ),
#                 "booking_ids": [
#                     b.id for b in items
#                 ]
#             })

#     # -----------------------------------------
#     # Price difference
#     # -----------------------------------------

#     by_type = defaultdict(list)

#     for booking in bookings:
#         by_type[booking.type.lower()].append(booking)

#     for booking_type, items in by_type.items():

#         if len(items) >= 2:

#             amounts = [
#                 b.amount for b in items
#             ]

#             average = sum(amounts) / len(amounts)

#             for booking in items:

#                 if average > 0:

#                     difference = (
#                         abs(booking.amount - average)
#                         / average
#                     )

#                     if difference >= 0.30:

#                         issues.append({
#                             "type": "price_difference",
#                             "severity": "medium",
#                             "message": (
#                                 f"{booking.description} costs "
#                                 f"{booking.amount:.2f}, which is "
#                                 f"significantly different from the "
#                                 f"average {booking_type} booking."
#                             ),
#                             "booking_id": booking.id
#                         })

#     return issues


from collections import defaultdict


def analyze_bookings(bookings):

    issues = []

    grouped = defaultdict(list)

    for booking in bookings:

        key = (
            str(
                booking.get("type") or ""
            ).lower(),

            str(
                booking.get("booking_date") or ""
            )
        )

        grouped[key].append(
            booking
        )

    for key, items in grouped.items():

        if len(items) > 1:

            issues.append({
                "type": "possible_duplicate",
                "severity": "medium",
                "message":
                    f"Multiple {key[0] or 'booking'} "
                    f"records exist for {key[1]}.",
                "booking_ids": [
                    item.get("id")
                    for item in items
                ]
            })

    return issues