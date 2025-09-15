#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');

class MemoryManager {
  constructor() {
    this.totalMemory = os.totalmem();
    this.criticalThreshold = 0.90; // 90%
    this.warningThreshold = 0.80;  // 80%
  }

  getCurrentMemoryUsage() {
    const freeMemory = os.freemem();
    const usedMemory = this.totalMemory - freeMemory;
    const usagePercentage = usedMemory / this.totalMemory;
    
    return {
      total: this.totalMemory,
      used: usedMemory,
      free: freeMemory,
      percentage: usagePercentage,
      totalGB: (this.totalMemory / 1024 / 1024 / 1024).toFixed(1),
      usedGB: (usedMemory / 1024 / 1024 / 1024).toFixed(1),
      freeGB: (freeMemory / 1024 / 1024 / 1024).toFixed(1)
    };
  }

  checkMemoryStatus() {
    const memory = this.getCurrentMemoryUsage();
    
    console.log(`Memory Status:`);
    console.log(`  Total: ${memory.totalGB}GB`);
    console.log(`  Used:  ${memory.usedGB}GB (${(memory.percentage * 100).toFixed(1)}%)`);
    console.log(`  Free:  ${memory.freeGB}GB`);
    
    if (memory.percentage > this.criticalThreshold) {
      console.log(`🔴 CRITICAL: Memory usage above ${(this.criticalThreshold * 100)}%`);
      return 'critical';
    } else if (memory.percentage > this.warningThreshold) {
      console.log(`🟡 WARNING: Memory usage above ${(this.warningThreshold * 100)}%`);
      return 'warning';
    } else {
      console.log(`🟢 OK: Memory usage is normal`);
      return 'ok';
    }
  }

  killMemoryHungryProcesses() {
    console.log('🧹 Cleaning up memory-hungry processes...');
    
    try {
      // Kill redundant Next.js processes
      execSync('pkill -f "next-server" || true', { stdio: 'inherit' });
      
      // Kill old node processes that might be hanging
      const processes = execSync('ps aux | grep -E "(node|next)" | grep -v grep || true', { encoding: 'utf8' });
      const lines = processes.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        if (line.includes('next-server') && !line.includes('grep')) {
          const pid = line.split(/\s+/)[1];
          try {
            execSync(`kill ${pid}`, { stdio: 'ignore' });
            console.log(`  Killed process ${pid}`);
          } catch (e) {
            // Process might already be dead
          }
        }
      });
      
      console.log('✅ Process cleanup completed');
    } catch (error) {
      console.log('⚠️  Some processes could not be cleaned up');
    }
  }

  clearCaches() {
    console.log('🧹 Clearing caches...');
    
    try {
      // Clear Next.js cache
      execSync('rm -rf .next/cache', { stdio: 'inherit' });
      
      // Clear node_modules cache if it exists
      execSync('rm -rf node_modules/.cache', { stdio: 'inherit' });
      
      // Clear npm cache
      execSync('npm cache clean --force', { stdio: 'inherit' });
      
      console.log('✅ Cache cleanup completed');
    } catch (error) {
      console.log('⚠️  Some caches could not be cleared');
    }
  }

  optimizeSystem() {
    console.log('🚀 Optimizing system for development...');
    
    const status = this.checkMemoryStatus();
    
    if (status === 'critical' || status === 'warning') {
      this.killMemoryHungryProcesses();
      this.clearCaches();
      
      // Wait a moment for cleanup to take effect
      setTimeout(() => {
        console.log('\n📊 Memory status after cleanup:');
        this.checkMemoryStatus();
      }, 2000);
    }
  }

  startDevelopmentServer() {
    console.log('🚀 Starting development server with memory optimization...');
    
    this.optimizeSystem();
    
    // Start with memory-optimized settings
    const nodeOptions = '--max-old-space-size=4096';
    execSync(`NODE_OPTIONS='${nodeOptions}' npm run dev`, { stdio: 'inherit' });
  }
}

// CLI interface
const command = process.argv[2];
const manager = new MemoryManager();

switch (command) {
  case 'check':
    manager.checkMemoryStatus();
    break;
  case 'clean':
    manager.optimizeSystem();
    break;
  case 'dev':
    manager.startDevelopmentServer();
    break;
  default:
    console.log('Memory Manager Commands:');
    console.log('  node scripts/memory-manager.js check  - Check current memory usage');
    console.log('  node scripts/memory-manager.js clean  - Clean up memory and caches');
    console.log('  node scripts/memory-manager.js dev    - Start dev server with optimization');
    break;
}