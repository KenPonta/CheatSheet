/** @type {import('next').NextConfig} */
const nextConfig = {
  // Update paths for new structure
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Memory optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Reduce memory usage during builds
    memoryBasedWorkers: true,
    // Enable webpack cache for faster builds
    webpackBuildWorker: true,
  },
  
  // Sharp configuration to prevent worker thread issues
  serverComponentsExternalPackages: ['sharp'],
  // Reduce bundle size and memory usage
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize for memory usage
  swcMinify: true,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Environment variable validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Webpack configuration for monitoring and Sharp compatibility
  webpack: (config, { isServer }) => {
    // Add source maps in production for better error tracking
    if (!isServer) {
      config.devtool = 'source-map';
    }
    
    // Fix Sharp worker script issue
    config.externals = config.externals || [];
    config.externals.push({
      sharp: 'commonjs sharp'
    });
    
    return config;
  },
}

export default nextConfig