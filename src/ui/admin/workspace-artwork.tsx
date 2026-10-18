import type { ReactElement } from "react";
import careUrl from "../../brand/decoration-hands-and-heart-v1.png";
import notesUrl from "../../brand/decoration-nurse-review-v1.png";
import connectionsUrl from "../../brand/decoration-companionship-v1.png";

export type WorkspaceArtworkKind = "care" | "notes" | "connections";

const ARTWORK: Readonly<Record<WorkspaceArtworkKind, string>> = {
	care: careUrl,
	notes: notesUrl,
	connections: connectionsUrl,
};

/** 原创品牌插画只作装饰；不表示实际住户、临床结果或 AI 状态。 */
export function WorkspaceArtwork({ kind = "care" }: { kind?: WorkspaceArtworkKind }): ReactElement {
	return (
		<div className={`ck-workspace-art ck-workspace-art--${kind}`} aria-hidden="true">
			<img src={ARTWORK[kind]} alt="" width={1254} height={1254} decoding="async" />
		</div>
	);
}
