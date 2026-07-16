# Signal Works Booking (portable kit)

MA5 is the **first live Booking deployment**. It stays on `ma5_*` tables and current branding.

The reusable kit for the next Signal Works clients lives outside this repo:

**`../signalworks-booking/`**

| Doc | Purpose |
| --- | --- |
| `signalworks-booking/README.md` | Product name + overview |
| `signalworks-booking/docs/MODULE.md` | Module entry |
| `signalworks-booking/docs/INSTALL.md` | Install runbook |
| `signalworks-booking/docs/REFERENCE_IMPLEMENTATION.md` | Copy map from this MA5 codebase |
| `signalworks-booking/docs/ADDONS.md` | Core vs add-ons |
| `signalworks-booking/schema/` | Portable `swb_*` SQL |

**Do not** rename MA5 tables to `swb_*` as part of normal work. Do not change Hub/Operations behavior here when updating the kit.
