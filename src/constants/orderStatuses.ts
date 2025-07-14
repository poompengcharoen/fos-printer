export const ORDER_STATUSES = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUSES.PENDING]: "Pending",
  [ORDER_STATUSES.IN_PROGRESS]: "In Progress",
  [ORDER_STATUSES.DONE]: "Done",
};

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUSES);
