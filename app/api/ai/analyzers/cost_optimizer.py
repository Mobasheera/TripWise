def optimize_costs(bookings, expenses, budget=None):

    booking_total = sum(
        float(booking.get("amount") or 0)
        for booking in bookings
    )

    expense_total = sum(
        float(expense.get("amount") or 0)
        for expense in expenses
    )

    total = booking_total + expense_total

    suggestions = []

    if budget is not None:

        remaining = budget - total

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

    # Find expensive bookings

    if bookings:

        highest_booking = max(
            bookings,
            key=lambda x: float(x.get("amount") or 0)
        )

        suggestions.append({
            "type": "largest_booking",
            "message": (
                f"Largest booking is "
                f"{highest_booking.get('description') or highest_booking.get('type') or 'Unknown'} "
                f"at ₹{float(highest_booking.get('amount') or 0):.2f}."
            ),
            "booking_id": highest_booking.get("id")
        })

    # Find expensive expenses

    if expenses:

        highest_expense = max(
            expenses,
            key=lambda x: float(x.get("amount") or 0)
        )

        suggestions.append({
            "type": "largest_expense",
            "message": (
                f"Largest shared expense is "
                f"{highest_expense.get('description') or highest_expense.get('title') or 'Unknown'} "
                f"at ₹{float(highest_expense.get('amount') or 0):.2f}."
            ),
            "expense_id": highest_expense.get("id")
        })

    return {
        "booking_total": round(booking_total, 2),
        "expense_total": round(expense_total, 2),
        "total": round(total, 2),
        "suggestions": suggestions
    }