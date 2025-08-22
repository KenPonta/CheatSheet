#!/bin/bash

echo "🚀 System Memory Optimizer"
echo "=========================="

# Function to get memory usage
get_memory_usage() {
    local memory_info=$(top -l 1 | grep PhysMem)
    echo "$memory_info"
}

# Function to close memory-heavy applications
close_heavy_apps() {
    echo "🔄 Closing memory-heavy applications..."
    
    # Close Discord if running (saves ~500MB)
    if pgrep -f "Discord" > /dev/null; then
        echo "  Closing Discord..."
        osascript -e 'quit app "Discord"' 2>/dev/null || true
    fi
    
    # Close Safari if running
    if pgrep -f "Safari" > /dev/null; then
        echo "  Closing Safari..."
        osascript -e 'quit app "Safari"' 2>/dev/null || true
    fi
    
    # Close Chrome if running
    if pgrep -f "Google Chrome" > /dev/null; then
        echo "  Closing Chrome..."
        osascript -e 'quit app "Google Chrome"' 2>/dev/null || true
    fi
    
    echo "  ✅ Heavy applications closed"
}

# Function to optimize Kiro
optimize_kiro() {
    echo "🔧 Optimizing Kiro IDE..."
    
    # Close unnecessary Kiro windows/tabs
    osascript -e '
        tell application "System Events"
            tell process "Kiro"
                set windowCount to count of windows
                if windowCount > 2 then
                    repeat with i from 3 to windowCount
                        try
                            click button 1 of window i
                        end try
                    end repeat
                end if
            end tell
        end tell
    ' 2>/dev/null || true
    
    echo "  ✅ Kiro optimized"
}

# Function to increase swap space
increase_swap() {
    echo "💾 Checking swap space..."
    
    local swap_info=$(sysctl vm.swapusage)
    echo "  Current swap: $swap_info"
    
    # macOS manages swap automatically, but we can suggest increasing it
    echo "  💡 Tip: macOS manages swap automatically"
    echo "     If you need more memory, consider closing applications or restarting"
}

# Function to clear system caches
clear_system_caches() {
    echo "🧹 Clearing system caches..."
    
    # Clear user caches
    rm -rf ~/Library/Caches/* 2>/dev/null || true
    
    # Clear system font cache
    sudo atsutil databases -remove 2>/dev/null || true
    
    # Clear DNS cache
    sudo dscacheutil -flushcache 2>/dev/null || true
    
    echo "  ✅ System caches cleared"
}

# Main optimization function
optimize_system() {
    echo "📊 Initial memory status:"
    get_memory_usage
    echo ""
    
    close_heavy_apps
    sleep 2
    
    optimize_kiro
    sleep 2
    
    clear_system_caches
    sleep 2
    
    # Force garbage collection
    echo "🗑️  Forcing garbage collection..."
    sudo purge 2>/dev/null || echo "  ⚠️  Could not run purge (requires sudo)"
    
    echo ""
    echo "📊 Final memory status:"
    get_memory_usage
    echo ""
    echo "✅ System optimization complete!"
    echo ""
    echo "💡 Additional tips:"
    echo "   - Restart your Mac if memory usage is still high"
    echo "   - Close browser tabs you're not using"
    echo "   - Use Activity Monitor to identify memory-heavy processes"
    echo "   - Consider upgrading RAM if you frequently hit memory limits"
}

# Check if running with optimization flag
if [ "$1" = "optimize" ]; then
    optimize_system
elif [ "$1" = "check" ]; then
    echo "📊 Current memory status:"
    get_memory_usage
else
    echo "Usage:"
    echo "  ./scripts/system-optimizer.sh check     - Check memory usage"
    echo "  ./scripts/system-optimizer.sh optimize - Optimize system memory"
fi