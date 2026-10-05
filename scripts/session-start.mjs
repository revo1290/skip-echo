// Deliberately ignore stdin: never inspect prompts, transcripts, or user files.
// No network, storage, child process, or extra model call.
process.stdout.on('error', () => { process.exitCode = 0; });
try {
 const { default: policy } = await import('./policy.generated.mjs');
 if (typeof policy !== 'string' || !policy.trim() || policy.length > 9000) throw new Error('Invalid policy');
 process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:policy}})+'\n');
} catch {
 // Fail open. A generic diagnostic contains no user data.
 process.stderr.write('SkipEcho: policy unavailable; continuing without response guidance.\n');
 process.exitCode = 0;
}
