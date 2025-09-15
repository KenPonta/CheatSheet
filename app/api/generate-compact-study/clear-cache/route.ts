import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Clear the file processing cache
    const { clearGlobalCache } = await import("@/backend/lib/file-processing");
    clearGlobalCache();
    
    return NextResponse.json({
      success: true,
      message: "File processing cache cleared successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to clear cache:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to clear cache",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get cache statistics
    const { getGlobalCache } = await import("@/backend/lib/file-processing");
    const cache = getGlobalCache();
    const stats = cache.getStats();
    
    return NextResponse.json({
      success: true,
      cacheStats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to get cache statistics",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}