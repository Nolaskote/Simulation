import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages under https://nolaskote.github.io/Simulation
  base: '/Simulation/',
})
