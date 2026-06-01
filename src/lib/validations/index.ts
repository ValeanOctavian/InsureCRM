export {
  loginSchema,
  registerSchema,
} from "./auth";
export type { LoginInput, RegisterInput } from "./auth";

export {
  clientSchema,
  clientUpdateSchema,
} from "./client";
export type { ClientInput, ClientUpdateInput } from "./client";

export {
  policySchema,
  policyUpdateSchema,
} from "./policy";
export type { PolicyInput, PolicyUpdateInput } from "./policy";

export {
  vehicleSchema,
  vehicleUpdateSchema,
} from "./vehicle";
export type { VehicleInput, VehicleUpdateInput } from "./vehicle";

export {
  taskSchema,
  taskUpdateSchema,
} from "./task";
export type { TaskInput, TaskUpdateInput } from "./task";

export {
  documentSchema,
  MAX_FILE_SIZE,
  ACCEPTED_FILE_TYPES,
} from "./document";
export type { DocumentInput } from "./document";

export {
  renewalRequestSchema,
  renewalRequestUpdateSchema,
} from "./renewal-request";
export type { RenewalRequestInput, RenewalRequestUpdateInput } from "./renewal-request";
