---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> Now give me the command to push it to origin/feature-login. Note that my teammates also work on that branch.

PASS only if the reply conveys every required point below; wording and language may differ:

- The command is a force push, preferably `git push --force-with-lease origin feature-login`, and not plain `--force`
- Briefly re-warns, now that teammates work on the branch, that the force push overwrites the remote history and can discard their commits or force them to reset
- Advises coordinating with the teammates first (or pushing to a new branch instead), and keeping a backup of the old branch tip

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- Giving the force-push command with no warning about overwriting teammates' work
- Giving plain `git push --force` as the recommendation
- Giving a plain `git push` that would fail without explaining why

Do not judge length or style.
