import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  // Accesible desde las estaciones, no solo desde el servidor (en producción
  // el frontend se sirve con vite preview, que recibe --host en iniciar-frontend.cmd).
  server: {
    host: "0.0.0.0",
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})