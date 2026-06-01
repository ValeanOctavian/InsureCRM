import type {
  Policy,
  Task,
  Document,
  RenewalRequest,
  Client,
} from "./database";

export interface PolicyWithClient extends Policy {
  clients: Pick<Client, "first_name" | "last_name">;
}

export interface TaskWithClient extends Task {
  clients: Pick<Client, "first_name" | "last_name"> | null;
}

export interface DocumentWithClient extends Document {
  clients: Pick<Client, "first_name" | "last_name">;
}

export interface RenewalRequestWithPolicy extends RenewalRequest {
  clients: Pick<Client, "first_name" | "last_name">;
  policies: Pick<Policy, "policy_number" | "type">;
}
