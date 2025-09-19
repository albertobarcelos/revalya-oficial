export function isChargeActionable(status: string | null): boolean {
  const actionableStatuses = ['PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE'];
  return status ? actionableStatuses.includes(status.toUpperCase()) : false;
}
