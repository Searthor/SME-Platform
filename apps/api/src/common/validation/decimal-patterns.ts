/**
 * Non-negative decimal strings for API inputs (MON-001): no signs, no exponent, bounded scale that
 * matches the numeric(20,4) money / numeric(20,6) quantity columns. Positivity rules that depend on
 * context (e.g. quantity > 0) are enforced in services.
 */
export const MONEY_PATTERN = /^\d{1,16}(?:\.\d{1,4})?$/
export const QUANTITY_PATTERN = /^\d{1,14}(?:\.\d{1,6})?$/
export const PERCENT_PATTERN = /^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/

export const MONEY_MESSAGE = '$property must be a non-negative amount with at most 4 decimals'
export const QUANTITY_MESSAGE = '$property must be a non-negative quantity with at most 6 decimals'
export const PERCENT_MESSAGE = '$property must be a percentage between 0 and 100'
