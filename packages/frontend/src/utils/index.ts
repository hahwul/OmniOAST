export const generateID = () => {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 12).padStart(12, "0")
  );
};

export const clone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};
