// import { defineConfig, loadEnv } from 'vite'
// import react from '@vitejs/plugin-react'
// import { fileURLToPath, URL } from 'node:url'

// export default defineConfig(({ mode }) => {
//   const env = loadEnv(mode, '.', '')
//   const apiUrl = env.VITE_API_URL || 'http://localhost:9000'

//   return {
//     plugins: [react()],
//     resolve: {
//       alias: {
//         '@': fileURLToPath(new URL('./src', import.meta.url)),
//       },
//     },
//     server: {
//       proxy: {
//         '/paper': apiUrl,
//         '/translate': apiUrl,
//         '/model-review': apiUrl,
//         '/todo': apiUrl,
//       },
//     },
//   }
// })
