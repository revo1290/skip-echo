# Security

The SessionStart script reads only its bundled generated policy module and the `SKIP_ECHO` environment variable, which can only turn injection off. It does not read stdin, transcripts, credentials, or user files; does not write data; and makes no network or LLM calls. The host may still supply event input and retain its own logs. The hook is an instruction source, not a security boundary: anyone who can change the installed policy module can change what the model is told, so install only from a source you trust.

The doctor (`scripts/doctor.mjs`, `/skip-echo:doctor`) runs only when you start it. It reads the plugin's own files and `SKIP_ECHO`, runs the hook script once, checks whether a standalone `skip-echo` skill file exists in the user and project skills directories, and reads a Claude Code debug log only when you pass one with `--debug-log`. It writes nothing, makes no network or model calls, prints no policy text, and shortens the home directory to `~` or `$HOME`. A debug log itself contains paths and every hook's context; share the doctor's summary, not the log.

Inspect a plugin before installation. Node.js must be available on PATH; Claude Code's native installer does not itself establish that requirement. A missing Node executable can produce a host diagnostic. The hook never intentionally blocks a session; verify actual host behavior in your client version.

Do not put secrets or personal transcripts in public issues. Use the repository’s private vulnerability reporting if the maintainer has enabled it. No private reporting endpoint is currently configured; request one through a non-sensitive issue before sharing exploit details.
