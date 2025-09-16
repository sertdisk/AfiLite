# Qwen Code Session - Project Rules

## Date
13 Eylül 2025 Cumartesi

## Project Context
- Working Directory: `/home/berennas/Belgeler/apps/AfiLite`
- OS: linux

## Core Working Principles
These 10 rules are mandatory and override any conflicting instructions:

1. **Project Structure**: Two panels exist: Admin and Influencer.
   - Influencer: Manages personal info and views sales/payment data linked to their codes.
   - Admin: Manages all influencer info, codes, related fields, and project settings.

2. **Architecture Reference**: Always review `mimari.md` for project architecture details.

3. **Area Isolation**: Operations in the Influencer area must not affect the Admin panel, and vice versa.

4. **Mandatory Interaction**: If an operation affects the other area, implement all necessary revisions across both.

5. **Harmony and Isolation**: Keep Admin and Influencer panels as isolated as possible while maintaining overall project coherence.

6. **No Repetition**: Avoid duplicating functions; use shared components/services.

7. **No Workarounds**: Never delete or reduce functionality to suppress errors. Fix incomplete/broken areas properly.

8. **Revision Approach**: Make necessary revisions across the entire project when needed during work.

9. **Architecture Documentation**:
   - Update `mimari.md` after work is completed.
   - Include changes to file/directory structure, routes, APIs, or architecture.
   - Add any learned information that may be useful in the future.

10. **Port Stability**: Backend runs on port 5003, frontend on port 4000. Do not change ports.

## Test Accounts
- Admin: `admin@afi.com` / `123456`
- Influencer: `inf1@test.com` / `123456`
- Test Influencer Code: `TESTQUFDLE`