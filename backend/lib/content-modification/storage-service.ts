import { promises as fs } from 'fs';
import path from 'path';
import {
  StudyMaterial,
  MaterialStorage,
  ModificationHistory,
  ContentModificationError
} from './types';

export class FileSystemStorageService implements MaterialStorage {
  private readonly storageDir: string;
  private readonly historyDir: string;

  constructor(baseDir: string = './data/study-materials') {
    this.storageDir = path.resolve(baseDir);
    this.historyDir = path.resolve(baseDir, 'history');
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.historyDir, { recursive: true });
    } catch (error) {
      throw new ContentModificationError(
        'Failed to initialize storage directories',
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Save study material to storage
   */
  async save(material: StudyMaterial): Promise<void> {
    try {
      await this.initialize();
      
      const filePath = path.join(this.storageDir, `${material.id}.json`);
      const materialData = {
        ...material,
        updatedAt: new Date()
      };

      await fs.writeFile(filePath, JSON.stringify(materialData, null, 2), 'utf-8');
    } catch (error) {
      throw new ContentModificationError(
        `Failed to save material ${material.id}`,
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Load study material from storage
   */
  async load(materialId: string): Promise<StudyMaterial | null> {
    try {
      await this.initialize();
      
      const filePath = path.join(this.storageDir, `${materialId}.json`);
      
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const material = JSON.parse(data);
        
        // Convert date strings back to Date objects
        material.createdAt = new Date(material.createdAt);
        material.updatedAt = new Date(material.updatedAt);
        
        return material;
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code === 'ENOENT') {
          return null;
        }
        throw readError;
      }
    } catch (error) {
      throw new ContentModificationError(
        `Failed to load material ${materialId}`,
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Delete study material from storage
   */
  async delete(materialId: string): Promise<void> {
    try {
      await this.initialize();
      
      const filePath = path.join(this.storageDir, `${materialId}.json`);
      
      try {
        await fs.unlink(filePath);
        
        // Also delete history files for this material
        await this.deleteHistory(materialId);
      } catch (deleteError) {
        if ((deleteError as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw deleteError;
        }
      }
    } catch (error) {
      throw new ContentModificationError(
        `Failed to delete material ${materialId}`,
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * List all study materials
   */
  async list(userId?: string): Promise<StudyMaterial[]> {
    try {
      await this.initialize();
      
      const files = await fs.readdir(this.storageDir);
      const materials: StudyMaterial[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const materialId = file.replace('.json', '');
          const material = await this.load(materialId);
          
          if (material) {
            // Filter by userId if provided (assuming userId is stored in metadata)
            if (!userId || (material.metadata as any).userId === userId) {
              materials.push(material);
            }
          }
        }
      }

      // Sort by updatedAt descending
      return materials.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      throw new ContentModificationError(
        'Failed to list materials',
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Check if material exists
   */
  async exists(materialId: string): Promise<boolean> {
    try {
      await this.initialize();
      
      const filePath = path.join(this.storageDir, `${materialId}.json`);
      
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      throw new ContentModificationError(
        `Failed to check existence of material ${materialId}`,
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Save modification history
   */
  async saveHistory(history: ModificationHistory): Promise<void> {
    try {
      await this.initialize();
      
      const historyFile = path.join(this.historyDir, `${history.materialId}.json`);
      
      let existingHistory: ModificationHistory[] = [];
      try {
        const data = await fs.readFile(historyFile, 'utf-8');
        existingHistory = JSON.parse(data);
      } catch {
        // File doesn't exist, start with empty array
      }

      existingHistory.push(history);
      
      // Keep only last 100 history entries per material
      if (existingHistory.length > 100) {
        existingHistory = existingHistory.slice(-100);
      }

      await fs.writeFile(historyFile, JSON.stringify(existingHistory, null, 2), 'utf-8');
    } catch (error) {
      throw new ContentModificationError(
        `Failed to save history for material ${history.materialId}`,
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Load modification history
   */
  async loadHistory(materialId: string): Promise<ModificationHistory[]> {
    try {
      await this.initialize();
      
      const historyFile = path.join(this.historyDir, `${materialId}.json`);
      
      try {
        const data = await fs.readFile(historyFile, 'utf-8');
        const history = JSON.parse(data);
        
        // Convert date strings back to Date objects
        return history.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        }));
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code === 'ENOENT') {
          return [];
        }
        throw readError;
      }
    } catch (error) {
      throw new ContentModificationError(
        `Failed to load history for material ${materialId}`,
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Delete modification history
   */
  private async deleteHistory(materialId: string): Promise<void> {
    try {
      const historyFile = path.join(this.historyDir, `${materialId}.json`);
      
      try {
        await fs.unlink(historyFile);
      } catch (deleteError) {
        if ((deleteError as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw deleteError;
        }
      }
    } catch (error) {
      // Don't throw error for history deletion failure
      console.warn(`Failed to delete history for material ${materialId}:`, error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalMaterials: number;
    totalSize: number;
    oldestMaterial: Date | null;
    newestMaterial: Date | null;
  }> {
    try {
      await this.initialize();
      
      const files = await fs.readdir(this.storageDir);
      let totalSize = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;
      let materialCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storageDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          materialCount++;

          const material = await this.load(file.replace('.json', ''));
          if (material) {
            if (!oldestDate || material.createdAt < oldestDate) {
              oldestDate = material.createdAt;
            }
            if (!newestDate || material.updatedAt > newestDate) {
              newestDate = material.updatedAt;
            }
          }
        }
      }

      return {
        totalMaterials: materialCount,
        totalSize,
        oldestMaterial: oldestDate,
        newestMaterial: newestDate
      };
    } catch (error) {
      throw new ContentModificationError(
        'Failed to get storage statistics',
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Cleanup old materials (older than specified days)
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    try {
      await this.initialize();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const materials = await this.list();
      let deletedCount = 0;

      for (const material of materials) {
        if (material.updatedAt < cutoffDate) {
          await this.delete(material.id);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      throw new ContentModificationError(
        'Failed to cleanup old materials',
        'STORAGE_ERROR',
        error
      );
    }
  }
}

/**
 * In-memory storage service for testing and development
 */
export class InMemoryStorageService implements MaterialStorage {
  private materials = new Map<string, StudyMaterial>();
  private history = new Map<string, ModificationHistory[]>();

  async save(material: StudyMaterial): Promise<void> {
    const materialData = {
      ...material,
      updatedAt: new Date()
    };
    this.materials.set(material.id, materialData);
  }

  async load(materialId: string): Promise<StudyMaterial | null> {
    return this.materials.get(materialId) || null;
  }

  async delete(materialId: string): Promise<void> {
    this.materials.delete(materialId);
    this.history.delete(materialId);
  }

  async list(userId?: string): Promise<StudyMaterial[]> {
    const materials = Array.from(this.materials.values());
    
    // Filter by userId if provided
    const filtered = userId 
      ? materials.filter(m => (m.metadata as any).userId === userId)
      : materials;

    // Sort by updatedAt descending
    return filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async exists(materialId: string): Promise<boolean> {
    return this.materials.has(materialId);
  }

  async saveHistory(historyEntry: ModificationHistory): Promise<void> {
    const existing = this.history.get(historyEntry.materialId) || [];
    existing.push(historyEntry);
    
    // Keep only last 100 entries
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
    
    this.history.set(historyEntry.materialId, existing);
  }

  async loadHistory(materialId: string): Promise<ModificationHistory[]> {
    return this.history.get(materialId) || [];
  }

  clear(): void {
    this.materials.clear();
    this.history.clear();
  }

  size(): number {
    return this.materials.size;
  }
}