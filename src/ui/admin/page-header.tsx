import type { ReactElement, ReactNode } from "react";
import { WorkspaceArtwork, type WorkspaceArtworkKind } from "./workspace-artwork.tsx";

// COMPONENTS.md §12A.2：标题是页面唯一的 h1；最多一个主按钮 + 1–2 个次按钮；
// 不放统计数字，不承载错误（错误用 Alert）。危险操作不放在头部主按钮位置。

export interface PageHeaderProps {
	/** 名词："Providers"、"Wattle Grove Care Group"。 */
	title: string;
	description?: string;
	/** 深层页面才用的面包屑（`nav.ck-breadcrumb`）。 */
	breadcrumb?: ReactNode;
	/** 状态标签，例如 <Tag>Published v3</Tag>。 */
	meta?: ReactNode;
	actions?: ReactNode;
	/** 页头辅助品牌插画；不承载数据或临床状态。 */
	artwork?: WorkspaceArtworkKind;
}

export function PageHeader({ title, description, breadcrumb, meta, actions, artwork }: PageHeaderProps): ReactElement {
	return (
		<div className="ck-page-header">
			{breadcrumb ?? null}
			<div className="ck-page-header-summary">
				<div>
					<h1 className="ck-page-header-title">{title}</h1>
					{description ? <p className="ck-page-header-desc">{description}</p> : null}
					{meta ? <div className="ck-page-header-meta">{meta}</div> : null}
				</div>
				{artwork ? (
					<div className="ck-page-header-art">
						<WorkspaceArtwork kind={artwork} />
					</div>
				) : null}
			</div>
			{actions ? <div className="ck-page-header-actions">{actions}</div> : null}
		</div>
	);
}
