/**
 * Example usage of the enhanced concept diagram generator
 */

import { SimpleImageGenerator, FlatLineImageRequest } from './simple-image-generator';

const generator = new SimpleImageGenerator();

// Example 1: Scientific Method Template
async function generateScientificMethodDiagram() {
  const request: FlatLineImageRequest = {
    type: 'concept',
    content: `title: Scientific Method Process
template: scientific-method`,
    context: 'Academic research methodology',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'vertical',
      annotations: true
    },
    dimensions: { width: 600, height: 500 }
  };

  const result = await generator.generateFlatLineImage(request);
  console.log('Scientific Method Diagram generated:', result.id);
  return result;
}

// Example 2: Custom Flowchart
async function generateCustomFlowchart() {
  const request: FlatLineImageRequest = {
    type: 'concept',
    content: `title: User Authentication Flow
type: flowchart
Start [type:start]
Check Credentials [type:process]
Valid User? [type:decision]
Grant Access [type:process]
Deny Access [type:process]
End [type:end]
Start -> Check Credentials
Check Credentials -> Valid User?
Valid User? -> Grant Access [label:yes]
Valid User? -> Deny Access [label:no]
Grant Access -> End
Deny Access -> End`,
    context: 'Software authentication process',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'vertical',
      annotations: true
    },
    dimensions: { width: 500, height: 600 }
  };

  const result = await generator.generateFlatLineImage(request);
  console.log('Authentication Flowchart generated:', result.id);
  return result;
}

// Example 3: Organizational Hierarchy
async function generateOrganizationChart() {
  const request: FlatLineImageRequest = {
    type: 'concept',
    content: `title: Company Structure
type: hierarchy
CEO [type:node] [level:0]
CTO [type:node] [level:1] [group:tech]
CFO [type:node] [level:1] [group:finance]
VP Engineering [type:node] [level:2] [group:tech]
VP Finance [type:node] [level:2] [group:finance]
Senior Developer [type:node] [level:3] [group:tech]
Junior Developer [type:node] [level:3] [group:tech]
Accountant [type:node] [level:3] [group:finance]
CEO -> CTO
CEO -> CFO
CTO -> VP Engineering
CFO -> VP Finance
VP Engineering -> Senior Developer
VP Engineering -> Junior Developer
VP Finance -> Accountant`,
    context: 'Corporate organizational structure',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'vertical',
      annotations: true
    },
    dimensions: { width: 800, height: 600 }
  };

  const result = await generator.generateFlatLineImage(request);
  console.log('Organization Chart generated:', result.id);
  return result;
}

// Example 4: Process Cycle
async function generateProcessCycle() {
  const request: FlatLineImageRequest = {
    type: 'concept',
    content: `title: Software Development Lifecycle
type: cycle
Planning [type:process]
Design [type:process]
Implementation [type:process]
Testing [type:process]
Deployment [type:process]
Maintenance [type:process]
Planning -> Design
Design -> Implementation
Implementation -> Testing
Testing -> Deployment
Deployment -> Maintenance
Maintenance -> Planning [label:iterate]`,
    context: 'Software development methodology',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    },
    dimensions: { width: 600, height: 600 }
  };

  const result = await generator.generateFlatLineImage(request);
  console.log('SDLC Cycle generated:', result.id);
  return result;
}

// Example 5: Network Diagram with Groups
async function generateNetworkDiagram() {
  const request: FlatLineImageRequest = {
    type: 'concept',
    content: `title: System Architecture
type: network
Web Server [type:process] [group:frontend]
Load Balancer [type:connector] [group:frontend]
API Gateway [type:process] [group:backend]
Database [type:data] [group:backend]
Cache [type:data] [group:backend]
User [type:node] [group:external]
Admin [type:node] [group:external]
User -> Load Balancer
Admin -> Load Balancer
Load Balancer -> Web Server
Web Server -> API Gateway
API Gateway -> Database
API Gateway -> Cache
API Gateway <-> Cache [label:read/write]`,
    context: 'System architecture overview',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'grid',
      annotations: true
    },
    dimensions: { width: 700, height: 500 }
  };

  const result = await generator.generateFlatLineImage(request);
  console.log('Network Diagram generated:', result.id);
  return result;
}

// Example 6: Timeline
async function generateProjectTimeline() {
  const request: FlatLineImageRequest = {
    type: 'concept',
    content: `title: Project Milestones
type: timeline
Kickoff [type:start]
Requirements [type:process]
Design Phase [type:process]
Development [type:process]
Testing [type:process]
Launch [type:end]
Kickoff -> Requirements
Requirements -> Design Phase
Design Phase -> Development
Development -> Testing
Testing -> Launch`,
    context: 'Project management timeline',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    },
    dimensions: { width: 800, height: 300 }
  };

  const result = await generator.generateFlatLineImage(request);
  console.log('Project Timeline generated:', result.id);
  return result;
}

// Run examples
async function runExamples() {
  console.log('Generating concept diagram examples...\n');
  
  try {
    await generateScientificMethodDiagram();
    await generateCustomFlowchart();
    await generateOrganizationChart();
    await generateProcessCycle();
    await generateNetworkDiagram();
    await generateProjectTimeline();
    
    console.log('\nAll examples generated successfully!');
  } catch (error) {
    console.error('Error generating examples:', error);
  }
}

// Export for use in other modules
export {
  generateScientificMethodDiagram,
  generateCustomFlowchart,
  generateOrganizationChart,
  generateProcessCycle,
  generateNetworkDiagram,
  generateProjectTimeline,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}