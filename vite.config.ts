import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '할일 정리',
        lang: 'ko',
        short_name: '할일',
        display: 'standalone',
        start_url: '/',
        theme_color: '#4f46e5',
        background_color: '#f4f6fb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      // 앱 셸만 캐시. 데이터 요청(supabase)은 캐시하지 않는다(오프라인은 범위 밖).
      workbox: { navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//] },
    }),
  ],
})
