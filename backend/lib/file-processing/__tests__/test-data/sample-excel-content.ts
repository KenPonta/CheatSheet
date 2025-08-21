// Sample Excel content for testing

export const sampleExcelData = {
  basic: {
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {
        '!ref': 'A1:C3',
        A1: { v: 'Name', t: 's' },
        B1: { v: 'Age', t: 's' },
        C1: { v: 'City', t: 's' },
        A2: { v: 'John', t: 's' },
        B2: { v: 25, t: 'n' },
        C2: { v: 'New York', t: 's' },
        A3: { v: 'Jane', t: 's' },
        B3: { v: 30, t: 'n' },
        C3: { v: 'Boston', t: 's' }
      }
    },
    Props: {
      Title: 'Sample Excel File',
      Author: 'Test Author',
      Subject: 'Test Subject'
    }
  },

  multiSheet: {
    SheetNames: ['Data', 'Summary', 'Charts'],
    Sheets: {
      Data: {
        '!ref': 'A1:D5',
        A1: { v: 'Product', t: 's' },
        B1: { v: 'Price', t: 's' },
        C1: { v: 'Quantity', t: 's' },
        D1: { v: 'Total', t: 's' },
        A2: { v: 'Widget A', t: 's' },
        B2: { v: 10.99, t: 'n' },
        C2: { v: 100, t: 'n' },
        D2: { v: 1099, t: 'n' }
      },
      Summary: {
        '!ref': 'A1:B3',
        A1: { v: 'Total Products', t: 's' },
        B1: { v: 5, t: 'n' },
        A2: { v: 'Total Revenue', t: 's' },
        B2: { v: 5495, t: 'n' }
      },
      Charts: {
        '!ref': 'A1:A2',
        A1: { v: 'Sales Chart', t: 's' },
        A2: { v: 'Revenue by Product', t: 's' }
      }
    }
  },

  withFormulas: {
    SheetNames: ['Calculations'],
    Sheets: {
      Calculations: {
        '!ref': 'A1:C4',
        A1: { v: 'Value 1', t: 's' },
        B1: { v: 'Value 2', t: 's' },
        C1: { v: 'Sum', t: 's' },
        A2: { v: 10, t: 'n' },
        B2: { v: 20, t: 'n' },
        C2: { v: 30, t: 'n', f: 'A2+B2' },
        A3: { v: 15, t: 'n' },
        B3: { v: 25, t: 'n' },
        C3: { v: 40, t: 'n', f: 'A3+B3' }
      }
    }
  }
};

export const mockExcelArrayBuffer = new ArrayBuffer(1024);

export function createMockExcelFile(name: string = 'test.xlsx', size: number = 1024): File {
  // Create a buffer with actual content to avoid empty file validation errors
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  // Fill with some dummy data to make it non-empty
  for (let i = 0; i < Math.min(size, 100); i++) {
    view[i] = i % 256;
  }
  
  // Create a proper File object with the correct size
  const file = {
    name,
    size,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now(),
    arrayBuffer: () => Promise.resolve(buffer),
    stream: () => new ReadableStream(),
    text: () => Promise.resolve(''),
    slice: () => new Blob([buffer])
  } as File;
  
  return file;
}

export const mockExcelZipStructure = {
  files: {
    'xl/media/image1.png': {
      dir: false,
      async: jest.fn().mockResolvedValue('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    },
    'xl/charts/chart1.xml': {
      dir: false,
      async: jest.fn().mockResolvedValue(`
        <c:chartSpace>
          <c:chart>
            <c:title>
              <c:tx>
                <a:t>Sales Chart</a:t>
              </c:tx>
            </c:title>
            <c:plotArea>
              <c:barChart>
                <c:ser>
                  <c:tx>
                    <a:t>Revenue</a:t>
                  </c:tx>
                </c:ser>
              </c:barChart>
            </c:plotArea>
          </c:chart>
        </c:chartSpace>
      `)
    }
  }
};