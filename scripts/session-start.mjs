// Deliberately ignore stdin: never inspect prompts, transcripts, or user files.
// No network, storage, child process, or extra model call.
// The only input is the SKIP_ECHO environment variable: off, 0, or false injects nothing.
process.stdout.on('error', () => { process.exitCode = 0; });
const mode = (process.env.SKIP_ECHO ?? '').trim().toLowerCase();
if (['off', '0', 'false'].includes(mode)) {
 process.exitCode = 0;
} else {
 // Unknown values keep the default; the diagnostic does not echo the value.
 if (!['', 'on', '1', 'true'].includes(mode)) process.stderr.write('SkipEcho: unrecognized SKIP_ECHO value; expected on or off. Injecting the policy.\n');
 try {
  const { default: policy } = await import('./policy.generated.mjs');
  if (typeof policy !== 'string' || !policy.trim() || policy.length > 9000) throw new Error('Invalid policy');
  process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:policy}})+'\n');
 } catch {
  // Fail open. A generic diagnostic contains no user data.
  process.stderr.write('SkipEcho: policy unavailable; continuing without response guidance.\n');
  process.exitCode = 0;
 }
}
