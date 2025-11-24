export const formatTimestamp = (timestamp: string | number | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Converts a timestamp to a numeric value (milliseconds since epoch)
 * Handles both numeric timestamps and date strings
 * @param timestamp - The timestamp to convert (number, string, or Date)
 * @returns Numeric timestamp in milliseconds
 */
export const toNumericTimestamp = (timestamp: string | number | Date): number => {
  return typeof timestamp === 'number' 
    ? timestamp 
    : new Date(timestamp).getTime();
};
