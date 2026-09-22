export type Participant = {
  id: string;
  name: string;
  email?: string;
  upiId?: string;
};

export type Trip = {
  id: string;
  name: string;
  destination?: string;
  startDate: string;
  endDate: string;
};

export type Expense = {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidBy: string;
  category: string;
  date: string;
};

export type Booking = {
  id: string;
  tripId: string;
  title: string;
  type: string;
  amount: number;
  paidBy: string;
  date: string;
};

export type BillItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type SettlementTransaction = {
  from: string;
  to: string;
  amount: number;
};
