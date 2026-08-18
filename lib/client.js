// dsh-file-mention — browser half.
// Adds a compact "📎" button to the composer input dock. Clicking opens a
// search panel listing workspace files AND directories (fetched from the host
// half's JSON route, rooted at the session's working directory); picking one
// inserts a backticked workspace-relative path reference into the draft, which
// the agent resolves unambiguously (file → read; directory → list contents).
window.__ModuleLoader__.load({
	id: "dsh-file-mention",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");

		// ---- styles ----
		const css = [
			".dfm-seat{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto;display:flex;justify-content:flex-start;padding-left:4px}",
			".dfm-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;cursor:pointer;padding:0}",
			".dfm-btn:hover,.dfm-btn:focus-visible{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}",
			".dfm-backdrop{position:fixed;inset:0;z-index:290;background:transparent}",
			".dfm-panel{position:fixed;z-index:300;width:min(640px,calc(100vw - 24px));max-height:min(440px,45vh);display:flex;flex-direction:column;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:var(--dsw-shadow-lv3);overflow:hidden;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}",
			".dfm-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px 6px;flex:none}",
			".dfm-title{margin:0;font-size:13px;font-weight:510;color:var(--dsw-alias-label-primary)}",
			".dfm-close{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:14px;line-height:1}",
			".dfm-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dfm-searchWrap{padding:0 12px 8px;flex:none}",
			".dfm-search{box-sizing:border-box;width:100%;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;outline:none}",
			".dfm-search:focus{border-color:var(--dsw-alias-border-l3)}",
			".dfm-filters{display:flex;align-items:center;gap:4px;padding:0 12px 8px;flex:none}",
			".dfm-chip{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:999px;height:20px;padding:0 8px;font-size:11px;line-height:18px;cursor:pointer}",
			".dfm-chip:hover{color:var(--dsw-alias-label-primary)}",
			".dfm-chip[data-on='true']{background:var(--dsw-alias-interactive-bg-active,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}",
			".dfm-list{flex:1;min-height:0;overflow-y:auto;padding:0 6px 6px}",
			".dfm-row{display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;text-align:left;border:0;background:transparent;border-radius:8px;padding:6px 8px;cursor:pointer}",
			".dfm-row:hover,.dfm-row[data-active='true']{background:var(--dsw-alias-interactive-bg-hover)}",
			".dfm-rowName{font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}",
			".dfm-rowDir{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}",
			".dfm-footer{padding:6px 12px 8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);border-top:1px solid var(--dsw-alias-border-l3);display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none}",
			".dfm-retry{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px;text-decoration:underline;padding:0}",
			".dfm-hint{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
		].join("");
		const tagId = "dsh-file-mention/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-file-mention";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		/** Services this client plugin needs before apply runs. */
		const inject = ["slots", "conversation", "sessions", "inputTriggers"];

		const MAX_RESULTS = 60;

		/** Entry icon by type. */
		function entryIcon(type) {
			return type === "dir" ? "📁" : "📄";
		}

		/**
		 * Filter + rank workspace entries against the query and type filter.
		 * Matches on basename first (prefix > substring), then on path
		 * prefix/substring.
		 */
		function matchEntries(entries, query, typeFilter) {
			if (!Array.isArray(entries)) return [];
			const q = query.trim().toLowerCase();
			const scored = [];
			for (const e of entries) {
				if (typeFilter === "file" && e.type !== "file") continue;
				if (typeFilter === "dir" && e.type !== "dir") continue;
				const name = e.name.toLowerCase();
				const path = e.path.toLowerCase();
				if (q !== "" && !name.includes(q) && !path.includes(q)) continue;
				let score;
				if (q === "") score = 0;
				else if (name.startsWith(q)) score = 0;
				else if (name.includes(q)) score = 1;
				else if (path.startsWith(q)) score = 2;
				else score = 3;
				scored.push({ score, e });
			}
			scored.sort((a, b) => a.score - b.score || a.e.path.localeCompare(b.e.path));
			return scored.slice(0, MAX_RESULTS).map((s) => s.e);
		}

		/**
		 * The dock entry: a compact icon button that opens the file/directory
		 * search panel. Session props arrive as `insertRef` (injected action that
		 * inserts a reference chip via the input shell), `useSessions` (session
		 * list carrying the working directory) and `sessionId`.
		 */
		function FileMentionDock(props) {
			const insertRef = props.insertRef;
			const useSessions = props.useSessions;
			const sessionId = props.sessionId;
			const [open, setOpen] = react.useState(false);
			const [query, setQuery] = react.useState("");
			const [typeFilter, setTypeFilter] = react.useState("all");
			const [data, setData] = react.useState(null);
			const [status, setStatus] = react.useState("idle");
			const [errorText, setErrorText] = react.useState("");
			const [highlight, setHighlight] = react.useState(0);
			const [anchor, setAnchor] = react.useState(null);
			const btnRef = react.useRef(null);
			// The session's working directory is authoritative for which project
			// the user is in — never rely on the host process cwd (dsh web may be
			// launched from anywhere). Fall back to the first listed session.
			const cwd = typeof useSessions === "function" ? useSessions((snap) => {
				if (snap === void 0 || snap === null) return void 0;
				const byId = snap.byId;
				if (sessionId !== void 0 && byId !== void 0 && byId[sessionId] !== void 0) return byId[sessionId].cwd;
				if (byId !== void 0) {
					for (const key of Object.keys(byId)) if (byId[key].cwd !== void 0) return byId[key].cwd;
				}
				return void 0;
			}) : void 0;

			const load = react.useCallback(() => {
				setStatus("loading");
				setErrorText("");
				const rootParam = typeof cwd === "string" && cwd.length > 0 ? "&root=" + encodeURIComponent(cwd) : "";
				fetch("/file-mention/files.json?t=" + Date.now() + rootParam)
					.then((r) => {
						if (!r.ok) throw new Error("HTTP " + r.status);
						return r.json();
					})
					.then((json) => {
						setData(json);
						setStatus("ready");
						setHighlight(0);
					})
					.catch((err) => {
						setStatus("error");
						setErrorText(err instanceof Error ? err.message : String(err));
					});
			}, [cwd]);

			const openPanel = react.useCallback(() => {
				const rect = btnRef.current !== null ? btnRef.current.getBoundingClientRect() : null;
				setAnchor(rect !== null ? { left: rect.left, top: rect.top } : null);
				setOpen(true);
				setQuery("");
				setTypeFilter("all");
				setHighlight(0);
				load();
			}, [load]);

			const closePanel = react.useCallback(() => {
				setOpen(false);
				setQuery("");
			}, []);

			const results = react.useMemo(
				() => matchEntries(data && data.entries, query, typeFilter),
				[data, query, typeFilter]
			);

			/** Insert a reference chip at the end of the draft and close. */
			const insert = react.useCallback((path) => {
				if (typeof insertRef === "function") {
					if (insertRef(path)) {
						closePanel();
						return;
					}
					console.warn("[file-mention] insertRef was not applied (phase or span CAS)");
				} else {
					console.warn("[file-mention] insertRef unavailable — cannot insert tag", insertRef);
				}
			}, [insertRef, closePanel]);

			const onKeyDown = react.useCallback((ev) => {
				if (ev.key === "ArrowDown") {
					ev.preventDefault();
					if (results.length > 0) setHighlight((h) => Math.min(h + 1, results.length - 1));
				} else if (ev.key === "ArrowUp") {
					ev.preventDefault();
					setHighlight((h) => Math.max(h - 1, 0));
				} else if (ev.key === "Enter") {
					ev.preventDefault();
					const f = results[highlight];
					if (f !== void 0) insert(f.path);
				} else if (ev.key === "Escape") {
					ev.preventDefault();
					closePanel();
				}
			}, [results, highlight, insert, closePanel]);

			const footer = (() => {
				if (status === "loading") return react_jsx_runtime.jsx("span", { className: "dfm-hint", children: "正在加载清单…" });
				if (status === "error") {
					return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
						children: [
							react_jsx_runtime.jsx("span", { className: "dfm-hint", children: "加载失败：" + errorText }),
							react_jsx_runtime.jsx("button", { type: "button", className: "dfm-retry", onClick: load, children: "重试" })
						]
					});
				}
				if (data !== null && typeof data === "object" && data.count !== void 0) {
					if (results.length === 0) return react_jsx_runtime.jsx("span", { className: "dfm-hint", children: "没有匹配项（共 " + data.count + " 个）" });
					return react_jsx_runtime.jsx("span", { className: "dfm-hint", children: (data.root !== void 0 ? data.root + " · " : "") + "显示 " + results.length + " / " + data.count + " 个 · 回车插入选中项" });
				}
				return null;
			})();

			// Panel anchored to the button's viewport position (left edge aligned
			// with the button, sitting just above it); falls back to centered
			// above the composer when the button is not measurable.
			const panelStyle = anchor !== null
				? { left: anchor.left, bottom: window.innerHeight - anchor.top + 6, transform: "none" }
				: { left: "50%", bottom: 104, transform: "translateX(-50%)" };

			return react_jsx_runtime.jsxs("div", {
				className: "dfm-seat",
				children: [
					react_jsx_runtime.jsx("button", {
						type: "button",
						ref: btnRef,
						className: "dfm-btn",
						onClick: openPanel,
						title: "插入文件/文件夹引用",
						"aria-label": "插入文件/文件夹引用",
						children: "📎"
					}),
					open &&
						react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
							children: [
								react_jsx_runtime.jsx("div", { className: "dfm-backdrop", onClick: closePanel }),
								react_jsx_runtime.jsxs("div", {
									className: "dfm-panel",
									style: panelStyle,
									role: "dialog",
									"aria-label": "插入文件/文件夹引用",
									children: [
										react_jsx_runtime.jsxs("div", {
											className: "dfm-header",
											children: [
												react_jsx_runtime.jsx("h3", { className: "dfm-title", children: "插入文件/文件夹引用" }),
												react_jsx_runtime.jsx("button", { type: "button", className: "dfm-close", onClick: closePanel, title: "关闭", children: "✕" })
											]
										}),
										react_jsx_runtime.jsx("div", {
											className: "dfm-searchWrap",
											children: react_jsx_runtime.jsx("input", {
												className: "dfm-search",
												type: "text",
												autoFocus: true,
												placeholder: "搜索文件名或路径…",
												value: query,
												onChange: (ev) => {
													setQuery(ev.target.value);
													setHighlight(0);
												},
												onKeyDown: onKeyDown
											})
										}),
										react_jsx_runtime.jsx("div", {
											className: "dfm-filters",
											children: [
												["all", "全部"],
												["file", "文件"],
												["dir", "文件夹"]
											].map(([value, label]) =>
												react_jsx_runtime.jsx(
													"button",
													{
														type: "button",
														className: "dfm-chip",
														"data-on": typeFilter === value ? "true" : "false",
														onClick: () => {
															setTypeFilter(value);
															setHighlight(0);
														},
														children: label
													},
													value
												)
											)
										}),
										react_jsx_runtime.jsx("div", {
											className: "dfm-list",
											children: results.map((e, index) =>
												react_jsx_runtime.jsx(
													"button",
													{
														type: "button",
														className: "dfm-row",
														"data-active": index === highlight ? "true" : "false",
														onClick: () => insert(e.path),
														onMouseEnter: () => setHighlight(index),
														children: [
															react_jsx_runtime.jsx("span", { className: "dfm-rowName", children: entryIcon(e.type) + " " + e.name }),
															react_jsx_runtime.jsx("span", { className: "dfm-rowDir", children: e.path })
														]
													},
													e.path
												)
											)
										}),
										react_jsx_runtime.jsxs("div", { className: "dfm-footer", children: [footer] })
									]
								})
							]
						})
				]
			});
		}

		/**
		 * Client plugin body: register the reference codec (so submitted tag
		 * occurrences serialize to the backticked path) and mount the dock entry.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			// Hidden '@' source: carries the reference codec for submit-time
			// serialization. candidates() stays empty, so the source renders
			// nothing in the @ menu (empty groups render null) while its codec
			// keeps `serializeReference("file-mention", ...)` resolvable.
			const inputTriggers = ctx.get("inputTriggers");
			ctx.effect(
				() =>
					inputTriggers.registerSource({
						trigger: "@",
						name: "file-mention",
						candidates: () => Promise.resolve([]),
						onPick: () => void 0,
						codec: {
							clipboardText: (ref) => "`" + ref + "`",
							serialize: (ref) => Promise.resolve("`" + ref + "`")
						}
					}),
				"file-mention: reference codec"
			);

			const sessions = ctx.sessions;
			const conversation = ctx.conversation;
			ctx.slots.inject("conversation.input.dock", () =>
				ctx.slots.register(
					{
						name: "conversation.input.dock",
						id: "file-mention",
						order: 20,
						inject: (sessionId) => ({
							/**
							 * Insert one file/directory reference chip at the end of the
							 * session's draft via the input shell (placeholder occurrence;
							 * the chip label and clipboard projection come from the
							 * ReferenceInsert, and submit-time serialization rides the
							 * registered codec). Returns whether the input applied it.
							 */
							insertRef: (path) => {
								const actx = sessions.binding(sessionId)?.ctx;
								if (actx === void 0) return false;
								const shell = conversation.input.for(actx);
								const snap = shell?.snapshot;
								if (snap === void 0) return false;
								const span = {
									start: snap.draft.length,
									end: snap.draft.length,
									draftRev: snap.draftRev
								};
								return shell.insertReference(
									{
										source: "file-mention",
										ref: path,
										label: path,
										clipboardText: "`" + path + "`"
									},
									span
								);
							}
						})
					},
					FileMentionDock
				)
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
