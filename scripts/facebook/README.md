# Facebook Social Posting Scripts

Small helper scripts for maintaining the Scholars Republic Facebook social posting system without remembering long commands.

## Normal Workflow

1. Refresh the Facebook Page token in Meta when needed.
2. Put the final extended Page token on the clipboard.
3. Run `.\scripts\facebook\set-page-token.ps1` from the repository root.
4. Deploy Worker changes with `.\scripts\facebook\deploy-worker.ps1`.
5. On the server, check backend plan/log status with `./scripts/facebook/test-due-posts-no-post.sh`.
6. If existing scholarships need plans, run `./scripts/facebook/backfill-social-plans.sh` on the server.
7. For a controlled live test, run `.\scripts\facebook\test-one-post.ps1`.

## Scripts

- `deploy-worker.ps1`: checks and deploys the Cloudflare `facebook-poster` Worker.
- `set-page-token.ps1`: reads the Facebook Page token from the Windows clipboard, saves it as the Worker secret, and deploys.
- `test-one-post.ps1`: triggers `/run-due-posts` with `{"limit":1}` for one controlled posting attempt.
- `test-due-posts-no-post.sh`: server-side status check. It does not post to Facebook.
- `backfill-social-plans.sh`: server-side dry run plus confirmation before creating missing Facebook social plans.
- `clear-plan-error.sh`: clears `last_error` for one `OpportunitySocialPostPlan`.

Do not paste tokens into chat, commit tokens, or print tokens in logs.
