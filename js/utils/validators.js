/**
 * utils/validators.js
 * Reusable validation functions for forms across the portal (profile edits,
 * settings, search inputs, file uploads, etc.). Every validator returns a
 * plain { valid, message } result rather than throwing or just returning
 * true/false — that way a form handler can drop the message straight into
 * an error label without writing its own copy per field.
 */

// ---------------------------------------------------------------
// Result helpers — keeps every validator's return shape identical
// ---------------------------------------------------------------

const ok = () => ({ valid: true, message: '' });
const fail = (message) => ({ valid: false, message });

// ---------------------------------------------------------------
// Basic field validators
// ---------------------------------------------------------------

/**
 * Value must be present (not empty/whitespace-only/null/undefined).
 * @param {*} value
 * @param {string} [fieldName='This field']
 */
export function isRequired(value, fieldName = 'This field') {
    const isEmpty =
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '');
    return isEmpty ? fail(`${fieldName} is required.`) : ok();
}

/**
 * Basic, pragmatic email shape check — not a full RFC 5322 validator
 * (those are famously overkill), just enough to catch obvious typos.
 * @param {string} value
 */
export function isEmail(value) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(String(value).trim()) ?
        ok() :
        fail('Enter a valid email address.');
}

/**
 * Accepts common phone formats: optional +country code, digits, spaces,
 * hyphens, parentheses. Intentionally permissive rather than strict, since
 * real-world phone formatting varies a lot by country.
 * @param {string} value
 */
export function isPhone(value) {
    const pattern = /^\+?[0-9\s\-()]{7,20}$/;
    return pattern.test(String(value).trim()) ?
        ok() :
        fail('Enter a valid phone number.');
}

/**
 * @param {string} value
 * @param {number} min
 * @param {string} [fieldName='This field']
 */
export function minLength(value, min, fieldName = 'This field') {
    return String(value ? ? '').length >= min ?
        ok() :
        fail(`${fieldName} must be at least ${min} characters.`);
}

/**
 * @param {string} value
 * @param {number} max
 * @param {string} [fieldName='This field']
 */
export function maxLength(value, max, fieldName = 'This field') {
    return String(value ? ? '').length <= max ?
        ok() :
        fail(`${fieldName} must be ${max} characters or fewer.`);
}

/**
 * Value must be a finite number (numeric strings like "42" also pass).
 * @param {*} value
 * @param {string} [fieldName='This field']
 */
export function isNumeric(value, fieldName = 'This field') {
    return value !== '' && value !== null && Number.isFinite(Number(value)) ?
        ok() :
        fail(`${fieldName} must be a number.`);
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {string} [fieldName='Value']
 */
export function isInRange(value, min, max, fieldName = 'Value') {
    const num = Number(value);
    return num >= min && num <= max ?
        ok() :
        fail(`${fieldName} must be between ${min} and ${max}.`);
}

// ---------------------------------------------------------------
// Dates
// ---------------------------------------------------------------

/**
 * @param {string|Date} value
 */
export function isValidDate(value) {
    const d = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(d.getTime()) ? ok() : fail('Enter a valid date.');
}

/**
 * Value must be a valid date strictly after today (e.g. a fee due date
 * or exam date field shouldn't accept the past).
 * @param {string|Date} value
 */
export function isFutureDate(value) {
    const dateCheck = isValidDate(value);
    if (!dateCheck.valid) return dateCheck;

    const d = value instanceof Date ? value : new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return d.getTime() > today.getTime() ?
        ok() :
        fail('Date must be in the future.');
}

// ---------------------------------------------------------------
// Passwords (settings.js — change password form)
// ---------------------------------------------------------------

/**
 * Requires 8+ characters with at least one letter and one number.
 * Deliberately doesn't force special characters — that tends to push
 * people toward weaker, more predictable passwords ("Password1!").
 * @param {string} value
 */
export function isStrongPassword(value) {
    const str = String(value ? ? '');
    if (str.length < 8) return fail('Password must be at least 8 characters.');
    if (!/[a-zA-Z]/.test(str)) return fail('Password must include at least one letter.');
    if (!/[0-9]/.test(str)) return fail('Password must include at least one number.');
    return ok();
}

/**
 * @param {string} password
 * @param {string} confirmPassword
 */
export function passwordsMatch(password, confirmPassword) {
    return password === confirmPassword ?
        ok() :
        fail('Passwords do not match.');
}

// ---------------------------------------------------------------
// File uploads (profile picture, assignment submission attachments)
// ---------------------------------------------------------------

/**
 * @param {File} file
 * @param {string[]} allowedTypes - MIME types, e.g. ['image/png', 'image/jpeg']
 */
export function isValidFileType(file, allowedTypes) {
    if (!file) return fail('No file selected.');
    return allowedTypes.includes(file.type) ?
        ok() :
        fail(`File must be one of: ${allowedTypes.join(', ')}.`);
}

/**
 * @param {File} file
 * @param {number} maxSizeMb
 */
export function isValidFileSize(file, maxSizeMb) {
    if (!file) return fail('No file selected.');
    const maxBytes = maxSizeMb * 1024 * 1024;
    return file.size <= maxBytes ?
        ok() :
        fail(`File must be smaller than ${maxSizeMb}MB.`);
}

// ---------------------------------------------------------------
// Composition — run multiple validators for one field, stop at first failure
// ---------------------------------------------------------------

/**
 * Runs validator functions in order, returning the first failure (or ok()
 * if all pass). Each validator must already be "applied" to its value —
 * pass an array of zero-arg functions, e.g.:
 *
 *   composeValidators([
 *     () => isRequired(email, 'Email'),
 *     () => isEmail(email),
 *   ]);
 *
 * @param {Array<() => {valid: boolean, message: string}>} validatorFns
 */
export function composeValidators(validatorFns) {
    for (const fn of validatorFns) {
        const result = fn();
        if (!result.valid) return result;
    }
    return ok();
}