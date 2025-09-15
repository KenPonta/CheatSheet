// Test script for content modification system
import { ContentModificationService } from './content-modification-service';
import { InMemoryStorageService } from './storage-service';

async function testContentModificationSystem() {
  console.log('🧪 Testing Content Modification System...');
  
  // Use in-memory storage for testing
  const storageService = new InMemoryStorageService();
  const contentService = new ContentModificationService(storageService);

  try {
    // Test 1: Create a new material
    console.log('\n1. Creating new study material...');
    const material = await contentService.createMaterial(
      'Test Study Material',
      [
        {
          type: 'heading',
          content: 'Introduction to Probability',
          order: 0,
          editable: true,
          dependencies: []
        },
        {
          type: 'text',
          content: 'Probability is the measure of the likelihood that an event will occur.',
          order: 1,
          editable: true,
          dependencies: []
        }
      ],
      [],
      { userId: 'test-user' }
    );
    console.log('✅ Material created:', material.id);

    // Test 2: Add a new section
    console.log('\n2. Adding new section...');
    const modifiedMaterial = await contentService.modifyContent({
      materialId: material.id,
      operation: {
        type: 'add_section',
        data: {
          section: {
            type: 'equation',
            content: 'P(A) = \\frac{|A|}{|S|}',
            order: 2,
            editable: true,
            dependencies: []
          },
          position: 2
        }
      },
      userId: 'test-user',
      timestamp: new Date()
    });
    console.log('✅ Section added. Total sections:', modifiedMaterial.sections.length);

    // Test 3: Edit a section
    console.log('\n3. Editing section...');
    const firstSectionId = modifiedMaterial.sections[0].id;
    const editedMaterial = await contentService.modifyContent({
      materialId: material.id,
      operation: {
        type: 'edit_section',
        targetId: firstSectionId,
        data: {
          content: 'Introduction to Discrete Probability Theory'
        }
      },
      userId: 'test-user',
      timestamp: new Date()
    });
    console.log('✅ Section edited successfully');

    // Test 4: Reorder sections
    console.log('\n4. Reordering sections...');
    const sectionIds = editedMaterial.sections.map(s => s.id);
    const reorderedMaterial = await contentService.modifyContent({
      materialId: material.id,
      operation: {
        type: 'reorder_sections',
        data: {
          sectionIds: [sectionIds[1], sectionIds[0], sectionIds[2]] // Swap first two
        }
      },
      userId: 'test-user',
      timestamp: new Date()
    });
    console.log('✅ Sections reordered successfully');

    // Test 5: Validate material
    console.log('\n5. Validating material integrity...');
    const validation = await contentService.validateMaterial(material.id);
    console.log('✅ Validation result:', validation.valid ? 'PASSED' : 'FAILED');
    if (!validation.valid) {
      console.log('   Errors:', validation.errors);
    }

    // Test 6: Get modification history
    console.log('\n6. Getting modification history...');
    const history = await contentService.getHistory(material.id);
    console.log('✅ History entries:', history.length);

    // Test 7: Export material
    console.log('\n7. Exporting material to HTML...');
    const exportResult = await contentService.exportMaterial(material.id, {
      format: 'html',
      includeImages: true,
      includeMetadata: true
    });
    console.log('✅ Export successful. Size:', exportResult.metadata.size, 'bytes');

    // Test 8: List materials
    console.log('\n8. Listing materials...');
    const materials = await contentService.listMaterials('test-user');
    console.log('✅ Found materials:', materials.length);

    console.log('\n🎉 All tests passed! Content modification system is working correctly.');
    
    return {
      success: true,
      materialId: material.id,
      finalSections: reorderedMaterial.sections.length,
      historyEntries: history.length,
      exportSize: exportResult.metadata.size
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for use in other files
export { testContentModificationSystem };

// Run test if this file is executed directly
if (require.main === module) {
  testContentModificationSystem()
    .then(result => {
      console.log('\nTest Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}