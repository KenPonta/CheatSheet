// Test setup and mocks

export const mockPdfParse = jest.fn();
export const mockTesseract = {
  recognize: jest.fn()
};

// Mock pdf-parse module
jest.doMock('pdf-parse', () => ({
  __esModule: true,
  default: mockPdfParse
}));

// Mock tesseract.js module
jest.doMock('tesseract.js', () => mockTesseract);

export const resetMocks = () => {
  mockPdfParse.mockReset();
  mockTesseract.recognize.mockReset();
};