import { OrderStatus, PrepStation, PrepStatus } from '@prisma/client';

export const POS_ORDERS_SYNC_EVENT = 'pos.orders.sync';
export const POS_PREP_SYNC_EVENT = 'pos.prep.sync';

export type RealtimeEntityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'paid'
  | 'cancelled';

export type PrepRealtimeAction =
  | 'queued'
  | 'started'
  | 'ready'
  | 'fulfilled'
  | 'cancelled'
  | 'rerouted'
  | 'refired';

export type RealtimeEntityEnvelope<TType extends string, TData> = {
  type: TType;
  entity: string;
  action: RealtimeEntityAction;
  hotelId: string;
  timestamp: string;
  data: TData;
};

export type PosOrderSyncPayload = RealtimeEntityEnvelope<
  typeof POS_ORDERS_SYNC_EVENT,
  {
    orderId: string;
    orderNo: string;
    status: OrderStatus;
    isPaid: boolean;
    posTerminalId: string | null;
    tableNo: string | null;
    roomNo: string | null;
    reservationId: string | null;
  }
>;

export type PosPrepSyncPayload = {
  type: typeof POS_PREP_SYNC_EVENT;
  entity: 'pos.prep-item';
  action: PrepRealtimeAction;
  hotelId: string;
  timestamp: string;
  data: {
    orderId: string;
    orderNo: string;
    orderItemId: string;
    prepStation: PrepStation;
    prepStatus: PrepStatus;
    tableNo: string | null;
    roomNo: string | null;
    ticketSummary: {
      itemName: string;
      quantity: number;
      orderType: string;
      note: string | null;
    };
  };
};
