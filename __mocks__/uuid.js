// Mock for uuid module to handle ES module issues in Jest
let counter = 0;

export const v4 = () => {
  counter++;
  return `mock-uuid-${counter}`;
};

export default {
  v4
};