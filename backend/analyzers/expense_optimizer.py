# from collections import defaultdict


# def optimize_expenses(travelers, expenses):

#     if not travelers:

#         return {
#             "total_expenses": 0,
#             "settlements": [],
#             "message": "No travelers available."
#         }

#     names = {
#         traveler.id: traveler.name
#         for traveler in travelers
#     }

#     total = sum(
#         expense.amount
#         for expense in expenses
#     )

#     count = len(travelers)

#     fair_share = total / count if count else 0

#     paid = defaultdict(float)

#     for expense in expenses:

#         paid[expense.paid_by] += expense.amount

#     balances = {}

#     for traveler in travelers:

#         person_paid = paid.get(
#             traveler.id,
#             0
#         )

#         balances[traveler.id] = round(
#             person_paid - fair_share,
#             2
#         )

#     creditors = []
#     debtors = []

#     for traveler_id, balance in balances.items():

#         if balance > 0:

#             creditors.append([
#                 traveler_id,
#                 balance
#             ])

#         elif balance < 0:

#             debtors.append([
#                 traveler_id,
#                 -balance
#             ])

#     settlements = []

#     i = 0
#     j = 0

#     while i < len(debtors) and j < len(creditors):

#         debtor_id, debt = debtors[i]
#         creditor_id, credit = creditors[j]

#         amount = min(debt, credit)

#         settlements.append({
#             "from": names.get(
#                 debtor_id,
#                 debtor_id
#             ),
#             "to": names.get(
#                 creditor_id,
#                 creditor_id
#             ),
#             "amount": round(amount, 2)
#         })

#         debtors[i][1] -= amount
#         creditors[j][1] -= amount

#         if debtors[i][1] <= 0.01:
#             i += 1

#         if creditors[j][1] <= 0.01:
#             j += 1

#     return {
#         "total_expenses": round(total, 2),
#         "fair_share_per_person": round(
#             fair_share,
#             2
#         ),
#         "balances": {
#             names.get(person_id, person_id): balance
#             for person_id, balance in balances.items()
#         },
#         "settlements": settlements
#     }

from collections import defaultdict


def optimize_expenses(travelers, expenses):

    if not travelers:
        return {
            "total_expenses": 0,
            "fair_share_per_person": 0,
            "balances": {},
            "settlements": [],
        }

    names = {
        traveler["id"]: traveler["name"]
        for traveler in travelers
    }

    total = sum(
        float(expense.get("amount") or 0)
        for expense in expenses
    )

    count = len(travelers)

    fair_share = (
        total / count
        if count
        else 0
    )

    paid = defaultdict(float)

    for expense in expenses:

        payer = expense.get("paid_by")

        if payer:
            paid[payer] += float(
                expense.get("amount") or 0
            )

    balances = {}

    for traveler in travelers:

        traveler_id = traveler["id"]

        person_paid = paid.get(
            traveler_id,
            0
        )

        balances[traveler_id] = round(
            person_paid - fair_share,
            2
        )

    creditors = []
    debtors = []

    for traveler_id, balance in balances.items():

        if balance > 0:
            creditors.append([
                traveler_id,
                balance
            ])

        elif balance < 0:
            debtors.append([
                traveler_id,
                -balance
            ])

    settlements = []

    i = 0
    j = 0

    while (
        i < len(debtors)
        and j < len(creditors)
    ):

        debtor_id, debt = debtors[i]
        creditor_id, credit = creditors[j]

        amount = min(debt, credit)

        settlements.append({
            "from": names.get(
                debtor_id,
                "Traveler"
            ),
            "to": names.get(
                creditor_id,
                "Traveler"
            ),
            "amount": round(
                amount,
                2
            )
        })

        debtors[i][1] -= amount
        creditors[j][1] -= amount

        if debtors[i][1] <= 0.01:
            i += 1

        if creditors[j][1] <= 0.01:
            j += 1

    return {
        "total_expenses": round(
            total,
            2
        ),

        "fair_share_per_person": round(
            fair_share,
            2
        ),

        "balances": {
            names.get(
                person_id,
                "Traveler"
            ): balance

            for person_id, balance
            in balances.items()
        },

        "settlements": settlements,
    }