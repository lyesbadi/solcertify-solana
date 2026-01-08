// vite.config.ts
import { defineConfig } from "file:///C:/solana-projects/decentravote-solana/app/node_modules/vite/dist/node/index.js";
import react from "file:///C:/solana-projects/decentravote-solana/app/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  define: {
    // Polyfill pour les modules Node.js utilisés par Solana
    "process.env": {},
    global: "globalThis"
  },
  resolve: {
    alias: {
      // Polyfills nécessaires pour @solana/web3.js
      buffer: "buffer",
      // Fix pour rpc-websockets avec les nouvelles versions
      "rpc-websockets/dist/lib/client": "rpc-websockets",
      "rpc-websockets/dist/lib/client/websocket.browser": "rpc-websockets"
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis"
      }
    },
    include: ["buffer", "@solana/web3.js", "rpc-websockets"]
  },
  build: {
    rollupOptions: {
      external: []
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxzb2xhbmEtcHJvamVjdHNcXFxcZGVjZW50cmF2b3RlLXNvbGFuYVxcXFxhcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXHNvbGFuYS1wcm9qZWN0c1xcXFxkZWNlbnRyYXZvdGUtc29sYW5hXFxcXGFwcFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovc29sYW5hLXByb2plY3RzL2RlY2VudHJhdm90ZS1zb2xhbmEvYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICAgIGRlZmluZToge1xyXG4gICAgICAgIC8vIFBvbHlmaWxsIHBvdXIgbGVzIG1vZHVsZXMgTm9kZS5qcyB1dGlsaXNcdTAwRTlzIHBhciBTb2xhbmFcclxuICAgICAgICAncHJvY2Vzcy5lbnYnOiB7fSxcclxuICAgICAgICBnbG9iYWw6ICdnbG9iYWxUaGlzJyxcclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgICAgYWxpYXM6IHtcclxuICAgICAgICAgICAgLy8gUG9seWZpbGxzIG5cdTAwRTljZXNzYWlyZXMgcG91ciBAc29sYW5hL3dlYjMuanNcclxuICAgICAgICAgICAgYnVmZmVyOiAnYnVmZmVyJyxcclxuICAgICAgICAgICAgLy8gRml4IHBvdXIgcnBjLXdlYnNvY2tldHMgYXZlYyBsZXMgbm91dmVsbGVzIHZlcnNpb25zXHJcbiAgICAgICAgICAgICdycGMtd2Vic29ja2V0cy9kaXN0L2xpYi9jbGllbnQnOiAncnBjLXdlYnNvY2tldHMnLFxyXG4gICAgICAgICAgICAncnBjLXdlYnNvY2tldHMvZGlzdC9saWIvY2xpZW50L3dlYnNvY2tldC5icm93c2VyJzogJ3JwYy13ZWJzb2NrZXRzJyxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICAgIGVzYnVpbGRPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIC8vIE5vZGUuanMgZ2xvYmFsIHRvIGJyb3dzZXIgZ2xvYmFsVGhpc1xyXG4gICAgICAgICAgICBkZWZpbmU6IHtcclxuICAgICAgICAgICAgICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5jbHVkZTogWydidWZmZXInLCAnQHNvbGFuYS93ZWIzLmpzJywgJ3JwYy13ZWJzb2NrZXRzJ10sXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIGV4dGVybmFsOiBbXSxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VCxTQUFTLG9CQUFvQjtBQUNyVixPQUFPLFdBQVc7QUFHbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDeEIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQTtBQUFBLElBRUosZUFBZSxDQUFDO0FBQUEsSUFDaEIsUUFBUTtBQUFBLEVBQ1o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQTtBQUFBLE1BRUgsUUFBUTtBQUFBO0FBQUEsTUFFUixrQ0FBa0M7QUFBQSxNQUNsQyxvREFBb0Q7QUFBQSxJQUN4RDtBQUFBLEVBQ0o7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNWLGdCQUFnQjtBQUFBO0FBQUEsTUFFWixRQUFRO0FBQUEsUUFDSixRQUFRO0FBQUEsTUFDWjtBQUFBLElBQ0o7QUFBQSxJQUNBLFNBQVMsQ0FBQyxVQUFVLG1CQUFtQixnQkFBZ0I7QUFBQSxFQUMzRDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0gsZUFBZTtBQUFBLE1BQ1gsVUFBVSxDQUFDO0FBQUEsSUFDZjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
