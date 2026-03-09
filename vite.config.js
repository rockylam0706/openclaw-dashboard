import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 18790,
    host: '0.0.0.0', // 允许 LAN 访问
    proxy: {
      '/api': {
        target: 'http://localhost:18790',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:18790',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 生产环境禁用 sourcemap 减小体积
    target: 'es2015',
    minify: 'terser', // 使用 terser 压缩
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console.log
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // 合理的代码分割
        manualChunks: {
          vendor: ['react', 'react-dom'], // React 单独打包
        },
        // 固定文件名格式
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // 资源大小警告限制
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
