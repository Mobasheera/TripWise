def get_value(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)

    return getattr(obj, key, default)


def optimize_costs(bookings, expenses, budget=None):

    booking_total = sum(
        float(get_value(booking, "amount", 0) or 0)
        for booking in bookings
    )

    expense_total = sum(
        float(get_value(expense, "amount", 0) or 0)
        for expense in expenses
    )

    total = booking_total + expense_total

    suggestions = []

    # -----------------------------------------
    # Budget
    # -----------------------------------------

    if budget is not None:

        remaining = float(budget) - total

        if remaining < 0:

            suggestions.append({
                "type": "budget_exceeded",
                "message": (
                    f"Trip is currently over budget by "
                    f"₹{abs(remaining):.2f}."
                )
            })

        else:

            suggestions.append({
                "type": "budget_remaining",
                "message": (
                    f"₹{remaining:.2f} remains from the "
                    f"current trip budget."
                )
            })

    # -----------------------------------------
    # Largest booking
    # -----------------------------------------

    if bookings:

        highest_booking = max(
            bookings,
            key=lambda x: float(
                get_value(x, "amount", 0) or 0
            )
        )

        booking_amount = float(
            get_value(highest_booking, "amount", 0) or 0
        )

        booking_description = (
            get_value(highest_booking, "description")
            or get_value(highest_booking, "title")
            or get_value(highest_booking, "type")
            or "Booking"
        )

        suggestions.append({
            "type": "largest_booking",
            "message": (
                f"Largest booking is "
                f"{booking_description} "
                f"at ₹{booking_amount:.2f}."
            ),
            "booking_id": get_value(
                highest_booking,
                "id"
            )
        })

    # -----------------------------------------
    # Largest expense
    # -----------------------------------------

    if expenses:

        highest_expense = max(
            expenses,
            key=lambda x: float(
                get_value(x, "amount", 0) or 0
            )
        )

        expense_amount = float(
            get_value(highest_expense, "amount", 0) or 0
        )

        expense_description = (
            get_value(highest_expense, "description")
            or get_value(highest_expense, "title")
            or "Expense"
        )

        suggestions.append({
            "type": "largest_expense",
            "message": (
                f"Largest shared expense is "
                f"{expense_description} "
                f"at ₹{expense_amount:.2f}."
            ),
            "expense_id": get_value(
                highest_expense,
                "id"
            )
        })

    return {
        "booking_total": round(booking_total, 2),
        "expense_total": round(expense_total, 2),
        "total": round(total, 2),
        "suggestions": suggestions
    }