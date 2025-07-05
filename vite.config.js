import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
	plugins: [vue()],
	build: {
		target: "esnext",
		lib: {
			entry: resolve(__dirname, "posawesome/public/js/posawesome.bundle.js"),
			name: "PosAwesome",
			fileName: "posawesome",
		},
		outDir: "posawesome/public/dist/js",
		emptyOutDir: true,
		rollupOptions: {
			external: ["socket.io-client"],
			output: {
				globals: {
					"socket.io-client": "io",
				},
			},
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "posawesome/public/js"),
		},
	},
});
