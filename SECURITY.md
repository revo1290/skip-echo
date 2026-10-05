# Security

The SessionStart script reads only its bundled generated policy module. It does not read stdin, transcripts, credentials, or user files; does not write data; and makes no network or LLM calls. The host may still supply event input and retain its own logs. The hook is an instruction source, not a security boundary.

Inspect a plugin before installation. Node.js must be available on PATH; Claude Code's native installer does not itself establish that requirement. A missing Node executable can produce a host diagnostic. The hook never intentionally blocks a session; verify actual host behavior in your client version.

Do not put secrets or personal transcripts in public issues. Use the repository’s private vulnerability reporting if the maintainer has enabled it. No private reporting endpoint is currently configured; request one through a non-sensitive issue before sharing exploit details.
