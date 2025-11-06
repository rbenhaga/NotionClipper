// vite.config.ts
import { defineConfig } from "file:///C:/Users/rayan/Desktop/Dev/NotionClipper/node_modules/.pnpm/vite@5.4.20_@types+node@20.19.19/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/rayan/Desktop/Dev/NotionClipper/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.20_@types+node@20.19.19_/node_modules/@vitejs/plugin-react/dist/index.js";
import { resolve } from "path";
import dts from "file:///C:/Users/rayan/Desktop/Dev/NotionClipper/node_modules/.pnpm/vite-plugin-dts@3.9.1_@type_831e488bab226374e3d02b899c5b583b/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\rayan\\Desktop\\Dev\\NotionClipper\\packages\\ui";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src/**/*"],
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.tsx"]
    })
  ],
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index"
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "framer-motion", "lucide-react"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM"
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") return "style.css";
          return assetInfo.name || "assets/[name].[ext]";
        }
      }
    },
    cssCodeSplit: false,
    emptyOutDir: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyYXlhblxcXFxEZXNrdG9wXFxcXERldlxcXFxOb3Rpb25DbGlwcGVyXFxcXHBhY2thZ2VzXFxcXHVpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyYXlhblxcXFxEZXNrdG9wXFxcXERldlxcXFxOb3Rpb25DbGlwcGVyXFxcXHBhY2thZ2VzXFxcXHVpXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9yYXlhbi9EZXNrdG9wL0Rldi9Ob3Rpb25DbGlwcGVyL3BhY2thZ2VzL3VpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IGR0cyBmcm9tICd2aXRlLXBsdWdpbi1kdHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgZHRzKHtcclxuICAgICAgaW5jbHVkZTogWydzcmMvKiovKiddLFxyXG4gICAgICBleGNsdWRlOiBbJ3NyYy8qKi8qLnN0b3JpZXMudHN4JywgJ3NyYy8qKi8qLnRlc3QudHN4J11cclxuICAgIH0pXHJcbiAgXSxcclxuICBidWlsZDoge1xyXG4gICAgbGliOiB7XHJcbiAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC50cycpLFxyXG4gICAgICBmb3JtYXRzOiBbJ2VzJ10sXHJcbiAgICAgIGZpbGVOYW1lOiAnaW5kZXgnXHJcbiAgICB9LFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBleHRlcm5hbDogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3QvanN4LXJ1bnRpbWUnLCAnZnJhbWVyLW1vdGlvbicsICdsdWNpZGUtcmVhY3QnXSxcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgZ2xvYmFsczoge1xyXG4gICAgICAgICAgcmVhY3Q6ICdSZWFjdCcsXHJcbiAgICAgICAgICAncmVhY3QtZG9tJzogJ1JlYWN0RE9NJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcclxuICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZSA9PT0gJ3N0eWxlLmNzcycpIHJldHVybiAnc3R5bGUuY3NzJztcclxuICAgICAgICAgIHJldHVybiBhc3NldEluZm8ubmFtZSB8fCAnYXNzZXRzL1tuYW1lXS5bZXh0XSc7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgY3NzQ29kZVNwbGl0OiBmYWxzZSxcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlXHJcbiAgfVxyXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQThWLFNBQVMsb0JBQW9CO0FBQzNYLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsT0FBTyxTQUFTO0FBSGhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLElBQUk7QUFBQSxNQUNGLFNBQVMsQ0FBQyxVQUFVO0FBQUEsTUFDcEIsU0FBUyxDQUFDLHdCQUF3QixtQkFBbUI7QUFBQSxJQUN2RCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsS0FBSztBQUFBLE1BQ0gsT0FBTyxRQUFRLGtDQUFXLGNBQWM7QUFBQSxNQUN4QyxTQUFTLENBQUMsSUFBSTtBQUFBLE1BQ2QsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxTQUFTLGFBQWEscUJBQXFCLGlCQUFpQixjQUFjO0FBQUEsTUFDckYsUUFBUTtBQUFBLFFBQ04sU0FBUztBQUFBLFVBQ1AsT0FBTztBQUFBLFVBQ1AsYUFBYTtBQUFBLFFBQ2Y7QUFBQSxRQUNBLGdCQUFnQixDQUFDLGNBQWM7QUFDN0IsY0FBSSxVQUFVLFNBQVMsWUFBYSxRQUFPO0FBQzNDLGlCQUFPLFVBQVUsUUFBUTtBQUFBLFFBQzNCO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGNBQWM7QUFBQSxJQUNkLGFBQWE7QUFBQSxFQUNmO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
