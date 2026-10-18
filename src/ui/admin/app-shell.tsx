import { useId, useState, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { Icon, type IconName } from "../base/icon.tsx";

// COMPONENTS.md §12A.1：跳转链接 → 持续标识条 → 侧栏（产品名、租户切换位置、导航）→ 顶栏（当前租户全称、用户）→ 主区域。
// Demo 身份条和支持访问会话条不随滚动消失、**不能被关闭**，所以这里没有关闭按钮。
// 没有权限的导航项由调用方直接不传（不是灰掉），避免暴露不存在的能力。

export interface NavItem {
	href: string;
	label: string;
	icon?: IconName;
	isCurrent?: boolean;
}

export interface NavGroup {
	/** 分组标题是文字，不是可点元素。 */
	heading?: string;
	items: readonly NavItem[];
}

/** 标识条一次只显示一种：Demo 身份或支持访问会话。 */
export type ShellBanner =
	| { kind: "demo"; text: ReactNode; exitLabel?: string; onExit: () => void }
	| { kind: "support"; text: ReactNode; endLabel?: string; onEnd: () => void };

export interface ShellUser {
	name: string;
	role: string;
	onSignOut: () => void;
}

export interface AppShellProps {
	productName?: string;
	/** 侧栏顶部的品牌区，放标准 Logo（`@carekind/shared/brand/*.svg`，最小宽度 160px）；不传时显示 productName 文字。 */
	brand?: ReactNode;
	/** 当前租户全称，例如 "Wattle Grove Care Group / Banksia Park Aged Care (VIC)"；平台层写 "careKind platform"。 */
	tenantName: string;
	contextLabel?: string;
	/** 租户切换位置（侧栏里只有一个），放 Select；不需要切换时不传。 */
	tenantSwitcher?: ReactNode;
	navGroups: readonly NavGroup[];
	/** 客户端路由：传入后普通点击交给路由，修饰键点击（新标签页）保持浏览器默认。 */
	onNavigate?: (href: string) => void;
	user: ShellUser;
	banner?: ShellBanner;
	/** 切换租户后的播报："Now viewing Banksia Park Aged Care"。 */
	announcement?: string;
	footer?: ReactNode;
	children: ReactNode;
}

function initialsOf(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

function Banner({ banner }: { banner: ShellBanner }): ReactElement {
	if (banner.kind === "demo") {
		return (
			<div className="ck-shell-banner" role="region" aria-label="Demo workspace">
				<span className="ck-shell-banner-text">{banner.text}</span>
				<button type="button" onClick={banner.onExit}>
					{banner.exitLabel ?? "Exit demo"}
				</button>
			</div>
		);
	}
	return (
		<div className="ck-shell-banner ck-shell-banner--support" role="region" aria-label="Support access session">
			<span className="ck-shell-banner-text">{banner.text}</span>
			<button type="button" onClick={banner.onEnd}>
				{banner.endLabel ?? "End session"}
			</button>
		</div>
	);
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: (href: string) => void }): ReactElement {
	function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
		if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		event.preventDefault();
		onNavigate(item.href);
	}
	return (
		<a href={item.href} aria-current={item.isCurrent ? "page" : undefined} onClick={handleClick}>
			{item.icon ? <Icon name={item.icon} /> : null}
			{item.label}
		</a>
	);
}

export function AppShell(props: AppShellProps): ReactElement {
	const [isNavExpanded, setIsNavExpanded] = useState(false);
	const collapsibleId = useId();
	return (
		<div className="ck-app-shell">
			<a className="ck-skip-link" href="#main">
				Skip to main content
			</a>
			{props.banner ? <Banner banner={props.banner} /> : null}
			<nav className="ck-sidenav" aria-label="Main">
				<div className="ck-sidenav-brand">{props.brand ?? props.productName ?? "careKind"}</div>
				<button
					type="button"
					className="ck-sidenav-toggle"
					aria-expanded={isNavExpanded}
					aria-controls={collapsibleId}
					onClick={() => setIsNavExpanded((expanded) => !expanded)}
				>
					<Icon name="menu" />
					Menu
				</button>
				<div className="ck-sidenav-collapsible" id={collapsibleId}>
					{props.tenantSwitcher ? <div className="ck-sidenav-switcher">{props.tenantSwitcher}</div> : null}
					{props.navGroups.map((group, index) => (
						<div key={group.heading ?? index}>
							{group.heading ? <p className="ck-sidenav-heading">{group.heading}</p> : null}
							<ul className="ck-sidenav-group">
								{group.items.map((item) => (
									<li key={item.href}>
										<NavLink
											item={item}
											onNavigate={
												props.onNavigate
													? (href) => {
															props.onNavigate?.(href);
															setIsNavExpanded(false);
														}
													: undefined
											}
										/>
									</li>
								))}
							</ul>
						</div>
					))}
					{props.footer ? <div className="ck-sidenav-footer">{props.footer}</div> : null}
				</div>
			</nav>
			<header className="ck-shell-topbar">
				<div className="ck-shell-context">
					<span className="ck-shell-context-label">{props.contextLabel ?? "Viewing:"}</span>
					<span className="ck-shell-context-value">{props.tenantName}</span>
				</div>
				<div className="ck-shell-user">
					<span className="ck-avatar ck-avatar--sm" aria-hidden="true">
						{initialsOf(props.user.name)}
					</span>
					<span className="ck-shell-user-details">
						<span className="ck-shell-user-name">{props.user.name}</span>
						<span className="ck-shell-user-role">{props.user.role}</span>
					</span>
					<button type="button" className="ck-btn ck-btn--text" onClick={props.user.onSignOut}>
						Sign out
					</button>
				</div>
			</header>
			<main className="ck-shell-main" id="main" tabIndex={-1}>
				<span className="ck-sr-only" role="status">
					{props.announcement ?? ""}
				</span>
				{props.children}
			</main>
		</div>
	);
}
