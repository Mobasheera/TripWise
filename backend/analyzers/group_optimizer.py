def optimize_group(travelers, bookings):

    people_count = len(travelers)

    if people_count == 0:

        return {
            "message": "No traveler information available."
        }

    booking_groups = {}

    for booking in bookings:

        booking_groups.setdefault(
            booking.type,
            []
        ).append(booking)

    suggestions = []

    if people_count >= 4:

        suggestions.append({
            "type": "group_booking",
            "message": (
                f"There are {people_count} travelers. "
                "Check whether group booking or shared "
                "accommodation options are available."
            )
        })

    for booking_type, items in booking_groups.items():

        if len(items) > 1:

            suggestions.append({
                "type": "consolidation",
                "message": (
                    f"Multiple {booking_type} bookings exist. "
                    "Check whether they can be consolidated "
                    "into a group booking."
                )
            })

    return {
        "traveler_count": people_count,
        "suggestions": suggestions
    }