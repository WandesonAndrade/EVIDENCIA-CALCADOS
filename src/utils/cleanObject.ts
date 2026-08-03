/**
 * Remove recursivamente todas as propriedades com valor `undefined` de um objeto
 * para evitar erros de serialização do Firestore JS SDK ("Unsupported field value: undefined").
 */
export const cleanUndefinedProperties = <T extends Record<string, any>>(obj: T): Partial<T> => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanUndefinedProperties(value);
      } else {
        cleaned[key] = value;
      }
    }
  });
  return cleaned;
};
