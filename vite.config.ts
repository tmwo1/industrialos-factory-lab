import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{target:'esnext',minify:false,chunkSizeWarningLimit:3000,rollupOptions:{output:{manualChunks:{three:['three','@react-three/fiber']}}}},server:{port:5173,strictPort:true}});
