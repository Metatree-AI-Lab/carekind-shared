// ESLint flat config — meta repo rules/02-code-rules.md §5：禁用 any、导出必须写类型、禁止空 catch
import tseslint from "typescript-eslint";

export default tseslint.config(...tseslint.configs.recommended, {
	files: ["src/**/*.ts", "src/**/*.tsx"],
	rules: {
		"@typescript-eslint/no-explicit-any": "error",
		"@typescript-eslint/explicit-module-boundary-types": "error",
		"no-empty": "error",
	},
});
