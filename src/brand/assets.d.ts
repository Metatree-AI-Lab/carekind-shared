// Vite/Vitest 导入设计系统原创 PNG；这里只声明资源 URL，不处理图片内容。
declare module "*.png" {
	const url: string;
	export default url;
}
