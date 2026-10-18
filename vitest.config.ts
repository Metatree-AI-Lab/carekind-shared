import { defineConfig } from "vitest/config";

// 默认 node 环境；React 组件测试（*.test.tsx）在文件头用 `// @vitest-environment jsdom` 切换到 jsdom。
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		environment: "node",
	},
});
