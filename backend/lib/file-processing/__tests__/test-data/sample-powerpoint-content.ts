// Sample PowerPoint content for testing

export const sampleSlideXml = `
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Introduction to Data Science</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Data science is an interdisciplinary field</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:t>It combines statistics, programming, and domain expertise</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>
`;

export const sampleSlideWithTableXml = `
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Data Comparison</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:graphicFrame>
        <a:graphic>
          <a:graphicData>
            <a:tbl>
              <a:tr>
                <a:tc>
                  <a:txBody>
                    <a:p>
                      <a:r>
                        <a:t>Method</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
                <a:tc>
                  <a:txBody>
                    <a:p>
                      <a:r>
                        <a:t>Accuracy</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
              </a:tr>
              <a:tr>
                <a:tc>
                  <a:txBody>
                    <a:p>
                      <a:r>
                        <a:t>Linear Regression</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
                <a:tc>
                  <a:txBody>
                    <a:p>
                      <a:r>
                        <a:t>85%</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
              </a:tr>
            </a:tbl>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>
    </p:spTree>
  </p:cSld>
</p:sld>
`;

export const sampleNotesXml = `
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Remember to explain the importance of data quality</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:t>Mention real-world examples</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>
`;

export const sampleCoreXml = `
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">
  <dc:title>Data Science Fundamentals</dc:title>
  <dc:creator>Dr. Jane Smith</dc:creator>
  <dc:subject>Introduction to Data Science</dc:subject>
  <dcterms:created>2024-01-15T10:30:00Z</dcterms:created>
  <dcterms:modified>2024-01-16T14:45:00Z</dcterms:modified>
</cp:coreProperties>
`;

export const mockPowerPointArrayBuffer = new ArrayBuffer(2048);

export function createMockPowerPointFile(name: string = 'test.pptx', size: number = 2048): File {
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
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    lastModified: Date.now(),
    arrayBuffer: () => Promise.resolve(buffer),
    stream: () => new ReadableStream(),
    text: () => Promise.resolve(''),
    slice: () => new Blob([buffer])
  } as File;
  
  return file;
}

export const mockPowerPointZipStructure = {
  files: {
    'ppt/slides/slide1.xml': {
      dir: false,
      async: jest.fn().mockResolvedValue(sampleSlideXml)
    },
    'ppt/slides/slide2.xml': {
      dir: false,
      async: jest.fn().mockResolvedValue(sampleSlideWithTableXml)
    },
    'ppt/notesSlides/notesSlide1.xml': {
      dir: false,
      async: jest.fn().mockResolvedValue(sampleNotesXml)
    },
    'docProps/core.xml': {
      dir: false,
      async: jest.fn().mockResolvedValue(sampleCoreXml)
    },
    'ppt/media/image1.png': {
      dir: false,
      async: jest.fn().mockResolvedValue('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    },
    'ppt/media/image2.jpg': {
      dir: false,
      async: jest.fn().mockResolvedValue('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==')
    }
  }
};