# control-plane-domain-check

The check of the domain of the control plane resolves the record A, and it compares that answer with the public address of the host. A domain behind Cloudflare, behind another CDN or behind NAT resolves to an address of the proxy, so the check fails and the API answers 400. The operator cannot save a valid domain.

The check becomes advisory. The operator writes the public address of the host in the settings, the platform resolves the records A and AAAA, and it names Cloudflare when it recognizes the resolved address. A failed check gives a warning, and the operator confirms the write with a field of the request. The domains of a service run no DNS check, and this feature does not change them.

## Phase 1 — The address of the host, and the record AAAA

**Agent:** implementer
**Paths:** packages/contracts/src/server/, apps/backend/src/features/server/

- [x] 1.1 Add the field `publicHostAddress` to `platformSettingsSchema`, as an optional address IPv4 or IPv6, and add its column with its migration.
- [x] 1.2 Replace `HttpPublicHostAddressAdapter` with a read of that field, and delete the constants of `api.ipify.org`.
- [x] 1.3 Resolve the record AAAA in `NodeDnsResolverAdapter`, and return one merged list with the record A.
- [x] 1.4 Update the tests of the adapter of the DNS, of the port of the address of the host, and of the settings.

## Phase 2 — The recognition of Cloudflare

**Agent:** implementer
**Paths:** apps/backend/src/features/server/
**The user installs `ipaddr.js` before this phase.**

- [x] 2.1 Add the port and the adapter that fetch the ranges of Cloudflare, IPv4 and IPv6, with a timeout and a cache.
- [x] 2.2 Add the function that matches one address against those ranges with `ipaddr.js`, and that names the provider.
- [x] 2.3 Give the failed fetch an empty list of ranges, so the check reports no provider and never throws.
- [x] 2.4 Write the tests of the adapter, of the cache and of the matcher.

## Phase 3 — The warning, and the field of the confirmation

**Agent:** implementer
**Paths:** packages/contracts/src/server/, apps/backend/src/features/server/, apps/backend/src/core/ui/translators/

- [ ] 3.1 Add the schema of the warning with the host, the resolved addresses, the address of the host, the reason, the provider and the message.
- [ ] 3.2 Give the four reasons one text each: the mismatch, the unknown address of the host, the empty resolution, and the recognized CDN.
- [ ] 3.3 Extend `checkControlPlaneDomainUseCase` with the provider and the reason, and split the answer of the PUT from its request.
- [ ] 3.4 Add the field `acknowledgeDomainWarning` to the request of the PUT; `updatePlatformSettingsUseCase` throws as today without it, and it writes and returns the warning with it.
- [ ] 3.5 Add the endpoint `POST /server/settings/domain-check` for the administrator, which runs the check and returns the warning.
- [ ] 3.6 Update the tests of the two use cases, of the errors, of the translator, of the service and of the controller.

## Phase 4 — The tab of the settings of the server

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/server/

- [ ] 4.1 Add the field of the public address of the host to the form, with its validation.
- [ ] 4.2 Call the endpoint of the check when the tab opens, and when the operator changes the domain.
- [ ] 4.3 Show the warning in a block of warning, and show its text inside the modal of the confirmation.
- [ ] 4.4 Send `acknowledgeDomainWarning` when the operator confirms a domain that holds a warning.
- [ ] 4.5 Correct the hint that tells the operator to point the record A at this host.
- [ ] 4.6 Update the tests of the container, of the repository of the API and of the use case that describes a failure.

## Phase 5 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 5.1 Rewrite the rules and the scenarios of the check of the domain in `docs/business/server.md`.
- [ ] 5.2 Write the new field of the public address of the host, the warning and the confirmation of the operator.
- [ ] 5.3 Delete the folder `docs/roadmap/control-plane-domain-check/`, and its line of `docs/roadmap.md`.
