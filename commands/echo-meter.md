---
description: Measure how much of the assistant's prose in this project's Claude Code sessions repeated earlier turns. Runs one local script; no network or model calls.
argument-hint: "[--examples]"
disable-model-invocation: true
---

Run this one command with the shell tool, appending the arguments below if there are any, and show its output to the user unchanged in a code block:

node "${CLAUDE_PLUGIN_ROOT}/scripts/echo-meter.mjs" transcript --project

Arguments: $ARGUMENTS

Then explain in two or three sentences what the pooled share means: the share of prose after the first turn that sat in sentences mostly made of word sequences from earlier assistant turns. Say that it is surface overlap, that corrections, warnings, new test results, and requested full versions can legitimately repeat, and that comparing sessions with and without SkipEcho on similar work is the way to read it. Do not run other commands, read other files, or change any settings. If the command cannot run, say why and suggest running it from a terminal instead.
