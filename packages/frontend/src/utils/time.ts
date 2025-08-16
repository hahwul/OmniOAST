export const formatTimestamp = (timestamp: string | number | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};
