---
description: Check the SkipEcho plugin installation and whether its SessionStart hook would inject the policy. Runs one local script; no network or model calls.
argument-hint: "[--debug-log <file>]"
disable-model-invocation: true
---

Run this one command with the shell tool, appending the arguments below if there are any, and show its output to the user unchanged in a code block:

node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"

Arguments: $ARGUMENTS

Then, for each line marked `fail` or `warn`, explain its hint in one sentence. Do not run other commands, read other files, or change any settings. If the command cannot run, say why and suggest running it from a terminal instead.
