import { mainWorkflow } from './main';
import { webhookWorkflow } from './webhook';
import { syncChargesWorkflow } from './sync-charges';
import { bulkMessagesWorkflow } from './bulk-messages';

export const workflows = [
  mainWorkflow,
  webhookWorkflow,
  syncChargesWorkflow,
  bulkMessagesWorkflow
];
