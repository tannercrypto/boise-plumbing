// src/lib/jobber/jobberMutations.ts
// ─────────────────────────────────────────────────────────────────────────────
// JOBBER GRAPHQL MUTATION DEFINITIONS
//
// ⚠️  MUTATIONS ARE UNVERIFIED — SET MUTATIONS_VERIFIED = true AFTER STEP 5
//
// WHY THIS EXISTS:
//   Jobber's GraphQL schema varies by account and API version.
//   The mutation names and input field names below are best-guess stubs.
//   They WILL fail with a GraphQL error until confirmed against your account.
//
// WHAT HAPPENS WHEN UNVERIFIED:
//   syncLeadToJobber() checks MUTATIONS_VERIFIED before making any API call.
//   If false → lead saves to DB, jobberSyncStatus = SKIPPED, clear log message.
//   No crash. No data loss. Leads are queued for manual Jobber entry.
//
// HOW TO VERIFY (one-time, ~15 minutes):
//   1. Connect Jobber from Admin → Sites → Connect Jobber
//   2. Copy your accessToken from Prisma Studio (JobberConnection table)
//   3. Open https://studio.apollographql.com/sandbox or Insomnia
//   4. POST https://api.getjobber.com/api/graphql
//      Headers:
//        Authorization: Bearer <accessToken>
//        X-JOBBER-GRAPHQL-VERSION: 2024-11-15
//   5. Run this introspection query to list all mutations:
//
//      {
//        __schema {
//          mutationType {
//            fields {
//              name
//              args {
//                name
//                type { name kind ofType { name kind } }
//              }
//            }
//          }
//        }
//      }
//
//   6. Find the client creation mutation — likely "clientCreate"
//      Expand its args to see the input type name, then introspect that type:
//
//      { __type(name: "ClientCreateInput") { inputFields { name type { name kind } } } }
//
//   7. Repeat for request creation — likely "requestCreate"
//   8. Update the mutation strings + interfaces below
//   9. Set MUTATIONS_VERIFIED = true
//  10. Redeploy
//  11. Submit a test lead and verify it appears in Jobber → Requests
//
// Jobber Developer Docs: https://developer.getjobber.com/docs/
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set to true ONLY after verifying mutation names and input types in GraphiQL.
 * When false, syncLeadToJobber() skips API calls and marks status as SKIPPED.
 * Leads are saved to the database regardless.
 */
export const MUTATIONS_VERIFIED = false;

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT CREATE
// TODO: verify mutation name — may be clientCreate or customerCreate
// TODO: verify ClientCreateInput field names via introspection
// ─────────────────────────────────────────────────────────────────────────────

export const CLIENT_CREATE_MUTATION = /* GraphQL */ `
  mutation ClientCreate($input: ClientCreateInput!) {
    clientCreate(input: $input) {
      client {
        id
        firstName
        lastName
      }
      userErrors {
        message
        path
      }
    }
  }
`;

// TODO: replace field names after introspecting ClientCreateInput
export interface ClientCreateInput {
  firstName: string;
  lastName:  string;
  // TODO: verify phones input type — may be PhoneInput or PhoneCreateInput
  phones?:   Array<{ number: string; primary?: boolean }>;
  // TODO: verify emails input type — may be EmailInput or EmailCreateInput
  emails?:   Array<{ address: string; primary?: boolean }>;
  // TODO: verify address input type — may be AddressInput or BillingAddressInput
  billingAddress?: {
    street1?:    string;
    city?:       string;
    province?:   string;
    postalCode?: string;
    country?:    string;
  };
  notes?: string;
}

export interface ClientCreateResponse {
  clientCreate: {
    client: { id: string; firstName: string; lastName: string } | null;
    userErrors: JobberUserError[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST CREATE
// TODO: verify mutation name — may be requestCreate or workRequestCreate
// TODO: verify RequestCreateInput field names via introspection
// ─────────────────────────────────────────────────────────────────────────────

export const REQUEST_CREATE_MUTATION = /* GraphQL */ `
  mutation RequestCreate($input: RequestCreateInput!) {
    requestCreate(input: $input) {
      request {
        id
        title
      }
      userErrors {
        message
        path
      }
    }
  }
`;

// TODO: replace field names after introspecting RequestCreateInput
export interface RequestCreateInput {
  clientId: string;
  title:    string;
  // TODO: verify this is the correct field for notes/description
  instructions?: string;
  // TODO: verify property address input type
  propertyAddress?: {
    street1?:    string;
    city?:       string;
    province?:   string;
    postalCode?: string;
    country?:    string;
  };
}

export interface RequestCreateResponse {
  requestCreate: {
    request: { id: string; title: string } | null;
    userErrors: JobberUserError[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface JobberUserError {
  message: string;
  path:    string[];
}
