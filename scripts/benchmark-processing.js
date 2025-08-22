#!/usr/bin/env node

// Benchmark script to compare CPU vs Memory processing modes

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class ProcessingBenchmark {
  constructor() {
    this.results = {
      cpu_optimized: {},
      memory_optimized: {},
      balanced: {}
    };
  }

  async runBenchmark() {
    console.log('🚀 Starting Processing Mode Benchmark\n');

    const modes = ['cpu_optimized', 'balanced', 'memory_optimized'];
    
    for (const mode of modes) {
      console.log(`📊 Testing ${mode} mode...`);
      await this.benchmarkMode(mode);
      console.log('');
    }

    this.displayResults();
  }

  async benchmarkMode(mode) {
    // Set environment variable
    process.env.PROCESSING_MODE = mode;
    
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      // Simulate file processing workload
      await this.simulateFileProcessing(mode);
      
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      
      this.results[mode] = {
        processingTime: Math.round(endTime - startTime),
        memoryUsed: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024),
        peakMemory: Math.round(endMemory.heapUsed / 1024 / 1024),
        success: true
      };
      
      console.log(`  ✅ Completed in ${this.results[mode].processingTime}ms`);
      console.log(`  📈 Memory used: ${this.results[mode].memoryUsed}MB`);
      console.log(`  🔝 Peak memory: ${this.results[mode].peakMemory}MB`);
      
    } catch (error) {
      this.results[mode] = {
        processingTime: 0,
        memoryUsed: 0,
        peakMemory: 0,
        success: false,
        error: error.message
      };
      
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }

  async simulateFileProcessing(mode) {
    const { getProcessingConfig } = require('../backend/lib/config/processing-config');
    const config = getProcessingConfig();
    
    // Simulate different processing patterns based on mode
    switch (mode) {
      case 'cpu_optimized':
        await this.simulateCPUIntensiveProcessing(config);
        break;
      case 'memory_optimized':
        await this.simulateMemoryIntensiveProcessing(config);
        break;
      case 'balanced':
        await this.simulateBalancedProcessing(config);
        break;
    }
  }

  async simulateCPUIntensiveProcessing(config) {
    // Simulate small chunk processing (CPU intensive)
    const iterations = 1000;
    const chunkSize = config.chunkSize;
    
    for (let i = 0; i < iterations; i++) {
      // Simulate chunk processing
      const data = Buffer.alloc(chunkSize);
      
      // CPU-intensive operations
      for (let j = 0; j < data.length; j++) {
        data[j] = Math.floor(Math.random() * 256);
      }
      
      // Simulate text processing
      const text = data.toString('base64');
      const processed = text.split('').reverse().join('');
      
      // Force garbage collection periodically
      if (i % 100 === 0 && global.gc) {
        global.gc();
      }
      
      // Yield control to prevent blocking
      if (i % 50 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  async simulateMemoryIntensiveProcessing(config) {
    // Simulate large buffer processing (Memory intensive)
    const buffers = [];
    const bufferSize = config.chunkSize;
    const bufferCount = Math.floor(config.maxMemory / bufferSize);
    
    // Allocate large buffers
    for (let i = 0; i < bufferCount; i++) {
      const buffer = Buffer.alloc(bufferSize);
      buffer.fill(i % 256);
      buffers.push(buffer);
      
      // Simulate processing
      if (i % 10 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    // Process all buffers at once
    const combined = Buffer.concat(buffers);
    const processed = combined.toString('base64');
    
    // Clean up
    buffers.length = 0;
  }

  async simulateBalancedProcessing(config) {
    // Simulate balanced approach
    const iterations = 500;
    const chunkSize = config.chunkSize;
    const buffers = [];
    
    for (let i = 0; i < iterations; i++) {
      const buffer = Buffer.alloc(chunkSize);
      
      // CPU processing
      for (let j = 0; j < buffer.length; j += 100) {
        buffer[j] = Math.floor(Math.random() * 256);
      }
      
      buffers.push(buffer);
      
      // Periodic cleanup
      if (buffers.length > 50) {
        const combined = Buffer.concat(buffers);
        const processed = combined.toString('base64');
        buffers.length = 0;
        
        if (global.gc) {
          global.gc();
        }
      }
      
      // Yield control
      if (i % 25 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  getMemoryUsage() {
    return process.memoryUsage();
  }

  displayResults() {
    console.log('📋 Benchmark Results Summary\n');
    console.log('Mode              | Time (ms) | Memory (MB) | Peak (MB) | Status');
    console.log('------------------|-----------|-------------|-----------|--------');
    
    Object.entries(this.results).forEach(([mode, result]) => {
      const status = result.success ? '✅ Pass' : '❌ Fail';
      const time = result.processingTime.toString().padStart(8);
      const memory = result.memoryUsed.toString().padStart(10);
      const peak = result.peakMemory.toString().padStart(8);
      
      console.log(`${mode.padEnd(17)} | ${time} | ${memory} | ${peak} | ${status}`);
    });
    
    console.log('\n🏆 Recommendations:');
    
    // Find best mode for different scenarios
    const fastestMode = Object.entries(this.results)
      .filter(([_, result]) => result.success)
      .sort((a, b) => a[1].processingTime - b[1].processingTime)[0];
    
    const lowestMemoryMode = Object.entries(this.results)
      .filter(([_, result]) => result.success)
      .sort((a, b) => a[1].memoryUsed - b[1].memoryUsed)[0];
    
    if (fastestMode) {
      console.log(`⚡ Fastest processing: ${fastestMode[0]} (${fastestMode[1].processingTime}ms)`);
    }
    
    if (lowestMemoryMode) {
      console.log(`💾 Lowest memory usage: ${lowestMemoryMode[0]} (${lowestMemoryMode[1].memoryUsed}MB)`);
    }
    
    // Environment-specific recommendations
    console.log('\n🎯 Environment Recommendations:');
    console.log('• Vercel/Serverless: Use cpu_optimized mode');
    console.log('• Local development: Use balanced mode');
    console.log('• High-memory server: Use memory_optimized mode');
    
    // Save results to file
    const resultsFile = path.join(__dirname, '..', 'benchmark-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
      recommendations: {
        fastest: fastestMode?.[0],
        lowestMemory: lowestMemoryMode?.[0]
      }
    }, null, 2));
    
    console.log(`\n💾 Results saved to: ${resultsFile}`);
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new ProcessingBenchmark();
  benchmark.runBenchmark().catch(console.error);
}

module.exports = ProcessingBenchmark;