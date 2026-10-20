import vue from "@vitejs/plugin-vue";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

// Manifest V2 scripts cannot load ES module chunks, so the content and background scripts
// are each built on their own as an IIFE (vite build --mode content / --mode background)
const SCRIPT_ENTRIES: Record<string, string> = {
	content: "src/main/transparent-zen.ts",
	background: "src/worker/background.ts",
};

export default defineConfig(({ mode }) => {
	const scriptEntry = SCRIPT_ENTRIES[mode];
	return {
		root: "src/",
		base: "",
		build: {
			sourcemap: true,
			outDir: "dist",
			emptyOutDir: !scriptEntry,
			rollupOptions: {
				input: scriptEntry
					? { [mode === "content" ? "transparent-zen" : mode]: resolve(dirname("./"), scriptEntry) }
					: {
							popup: resolve(dirname("./"), "src/popup/popup.html"),
							settings: resolve(dirname("./"), "src/settings/settings.html"),
							// Loaded through the manifest, an IIFE build would inject it before document.head exists
							"transparent-zen": resolve(dirname("./"), "src/main/transparent-zen.css"),
						},
				output: {
					format: scriptEntry ? "iife" : "es",
					entryFileNames: "[name].js",
					chunkFileNames: "[name].js",
					assetFileNames: "[name].[ext]",
					dir: "dist",
				},
			},
		},
		server: {
			port: 3000,
			open: "http://localhost:3000/popup.html",
		},
		plugins: [vue()],
	};
});
