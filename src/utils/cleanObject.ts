/**
 * Remove recursivamente todas as propriedades com valor `undefined` de um objeto ou array
 * para evitar erros de serialização do Firestore JS SDK ("Unsupported field value: undefined").
 */
export const cleanUndefinedProperties = <T extends any>(obj: T): T => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefinedProperties(item)) as unknown as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    Object.keys(obj).forEach((key) => {
      const value = (obj as any)[key];
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedProperties(value);
      }
    });
    return cleaned;
  }

  return obj;
};
