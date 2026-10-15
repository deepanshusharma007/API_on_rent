/** Mirrors the server's password rules: 8+ characters, at most 72 bytes, a letter and a number. */
export function meetsPasswordPolicy(password) {
  return password.length >= 8
    && new TextEncoder().encode(password).length <= 72
    && /[A-Za-z]/.test(password)
    && /\d/.test(password);
}

/** 0 (too weak) .. 4 (strong). Never above 0 unless the password meets the policy. */
export function passwordScore(password) {
  if (!meetsPasswordPolicy(password)) return 0;
  let score = 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}
