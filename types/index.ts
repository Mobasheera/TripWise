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

export type Receipt = {
  id: string;
  merchant: string | null;
  subtotal: number;
  tax: number;
  total: number;
  items: BillItem[];
};

export type ItemParticipant = {
  id: string;
  item_id: string;
  participant_id: string;
  share: number;
  amount: number;
};

export type ItemSplitAssignment = {
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