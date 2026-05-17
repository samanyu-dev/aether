import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// ── TREE DATA PROVIDER FOR SIDEBAR TRACE SCANNING ──────────────────────────────────
class AetherTraceTreeProvider implements vscode.TreeDataProvider<AetherTraceItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AetherTraceItem | undefined | null | void> = new vscode.EventEmitter<AetherTraceItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AetherTraceItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string | undefined) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AetherTraceItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AetherTraceItem): Thenable<AetherTraceItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }

        if (element) {
            return Promise.resolve([]);
        } else {
            const tracesFolder = path.join(this.workspaceRoot, '.aether', 'traces');
            if (!fs.existsSync(tracesFolder)) {
                return Promise.resolve([
                    new AetherTraceItem(
                        "No Traces Found",
                        "Instrument your agent to generate logs.",
                        vscode.TreeItemCollapsibleState.None,
                        undefined
                    )
                ]);
            }

            try {
                const files = fs.readdirSync(tracesFolder).filter((file: string) => file.endsWith('.json'));
                if (files.length === 0) {
                    return Promise.resolve([
                        new AetherTraceItem(
                            "No Traces Found",
                            "Empty traces folder.",
                            vscode.TreeItemCollapsibleState.None,
                            undefined
                        )
                    ]);
                }

                // Parse details from each JSON file to display nicely
                const items: AetherTraceItem[] = [];
                for (const file of files) {
                    const filePath = path.join(tracesFolder, file);
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const data = JSON.parse(content);
                        const sessionId = data.session_id || file;
                        const agentName = data.agent_name || "Unknown Agent";
                        const eventCount = data.events ? data.events.length : 0;
                        const dateStr = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "";

                        const item = new AetherTraceItem(
                            `${agentName} (${dateStr})`,
                            `Session: ${sessionId} | ${eventCount} Nodes`,
                            vscode.TreeItemCollapsibleState.None,
                            {
                                command: 'aether.replayTrace',
                                title: 'Open Cognition Replay',
                                arguments: [filePath]
                            }
                        );
                        item.iconPath = new vscode.ThemeIcon('circuit-board');
                        items.push(item);
                    } catch {
                        // Skip corrupted files
                    }
                }
                return Promise.resolve(items);
            } catch (err) {
                return Promise.resolve([
                    new AetherTraceItem(
                        "Error Reading Traces",
                        String(err),
                        vscode.TreeItemCollapsibleState.None,
                        undefined
                    )
                ]);
            }
        }
    }
}

class AetherTraceItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private readonly tooltipText: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.tooltipText;
        this.description = this.tooltipText;
    }
}

// ── MAIN EXTENSION ACTIVATION ─────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const treeDataProvider = new AetherTraceTreeProvider(workspaceRoot);
    
    // Register sidebar explorer tree
    vscode.window.registerTreeDataProvider('aether-traces', treeDataProvider);

    // Refresh command
    let refreshCommand = vscode.commands.registerCommand('aether.refreshExplorer', () => {
        treeDataProvider.refresh();
    });
    context.subscriptions.push(refreshCommand);

    // Replay command opening native Webview
    let replayCommand = vscode.commands.registerCommand('aether.replayTrace', (traceFilePath: string) => {
        try {
            const traceContent = fs.readFileSync(traceFilePath, 'utf-8');
            const traceData = JSON.parse(traceContent);
            AetherReplayPanel.createOrShow(context.extensionUri, traceData);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open Aether replay file: ${err}`);
        }
    });
    context.subscriptions.push(replayCommand);

    // Register active workspace file watcher to reload sidebar explorer automatically when a new trace JSON drops!
    if (workspaceRoot) {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(path.join(workspaceRoot, '.aether', 'traces'), '*.json')
        );
        watcher.onDidCreate(() => treeDataProvider.refresh());
        watcher.onDidChange(() => treeDataProvider.refresh());
        watcher.onDidDelete(() => treeDataProvider.refresh());
        context.subscriptions.push(watcher);
    }
}

export function deactivate() {}

// ── INTERACTIVE WEBVIEW PANEL IMPLEMENTATION ────────────────────────────────────────
class AetherReplayPanel {
    public static currentPanel: AetherReplayPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, traceData: any) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (AetherReplayPanel.currentPanel) {
            AetherReplayPanel.currentPanel._panel.reveal(column);
            AetherReplayPanel.currentPanel.loadTrace(traceData);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'aetherReplay',
            `Aether Replay: ${traceData.session_id || 'Session'}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        AetherReplayPanel.currentPanel = new AetherReplayPanel(panel, extensionUri, traceData);
    }

    private constructor(panel: vscode.WebviewPanel, _extensionUri: vscode.Uri, traceData: any) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this.loadTrace(traceData);
    }

    public loadTrace(traceData: any) {
        this._panel.title = `Aether Replay: ${traceData.agent_name || traceData.session_id}`;
        this._panel.webview.html = this._getHtmlForWebview(traceData);
    }

    public dispose() {
        AetherReplayPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(traceData: any): string {
        const eventsJson = JSON.stringify(traceData.events || []);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aether Cognition Replay</title>
    <style>
        body {
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #cccccc);
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
            margin: 0;
            padding: 16px;
            display: grid;
            grid-template-columns: 2fr 1fr;
            grid-template-rows: auto 1fr auto;
            height: 100vh;
            box-sizing: border-box;
            gap: 16px;
        }

        /* Header Style */
        header {
            grid-column: 1 / span 2;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        h1 {
            font-size: 16px;
            margin: 0;
            color: var(--vscode-textLink-foreground, #007acc);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .meta-tag {
            font-size: 10px;
            background: var(--vscode-badge-background, #2d2d2d);
            color: var(--vscode-badge-foreground, #efefef);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
        }

        /* Main Cognition Tree Panel */
        .canvas-container {
            border: 1px solid var(--vscode-panel-border, #333);
            background: var(--vscode-editorWidget-background, #252526);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        .canvas-header {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            color: var(--vscode-descriptionForeground, #888);
            display: flex;
            justify-content: space-between;
            background: var(--vscode-tab-activeBackground, #2d2d2d);
        }

        .nodes-list {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        /* Nodes Types */
        .node-card {
            border: 1px solid var(--vscode-panel-border, #333);
            background: var(--vscode-list-hoverBackground, #2a2d2e);
            border-radius: 6px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }

        .node-card:hover {
            border-color: var(--vscode-focusBorder, #007acc);
        }

        .node-card.active {
            border-color: var(--vscode-textLink-activeForeground, #007acc);
            box-shadow: 0 0 8px rgba(0, 122, 204, 0.2);
        }

        .node-card.type-thought { border-left: 4px solid #007acc; }
        .node-card.type-tool_call { border-left: 4px solid #d7ba7d; }
        .node-card.type-tool_result { border-left: 4px solid #4ec9b0; }
        .node-card.type-memory { border-left: 4px solid #c586c0; }
        .node-card.type-hallucination { border-left: 4px solid #f44747; background: rgba(244, 71, 71, 0.05); }

        .node-meta {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: var(--vscode-descriptionForeground, #888);
            margin-bottom: 4px;
        }

        .node-content {
            font-size: 11px;
            line-height: 1.4;
        }

        /* Sidebar Inspector & Typewriter */
        .inspector-panel {
            border: 1px solid var(--vscode-panel-border, #333);
            background: var(--vscode-editorWidget-background, #252526);
            border-radius: 8px;
            overflow: hidden;
            display: grid;
            grid-template-rows: 1fr 1fr;
            gap: 1px;
        }

        .inspector-section {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .section-header {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            color: var(--vscode-descriptionForeground, #888);
            background: var(--vscode-tab-activeBackground, #2d2d2d);
        }

        .section-content {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            font-size: 11px;
        }

        #inspector-content pre {
            margin: 0;
            white-space: pre-wrap;
            font-family: monospace;
            background: var(--vscode-textCodeBlock-background, #2d2d2d);
            padding: 8px;
            border-radius: 4px;
            font-size: 10px;
        }

        #token-typewriter {
            font-family: monospace;
            background: var(--vscode-textCodeBlock-background, #1e1e1e);
            padding: 12px;
            border-radius: 6px;
            height: calc(100% - 24px);
            box-sizing: border-box;
            overflow-y: auto;
            white-space: pre-wrap;
            line-height: 1.5;
            color: #dcdcaa;
        }

        /* Playback Timeline controls */
        footer {
            grid-column: 1 / span 2;
            border-top: 1px solid var(--vscode-panel-border, #333);
            padding-top: 12px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        button {
            background: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #ffffff);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }

        button:hover {
            background: var(--vscode-button-hoverBackground, #118ad4);
        }

        input[type="range"] {
            flex: 1;
            accent-color: var(--vscode-textLink-foreground, #007acc);
        }

        .timeline-label {
            font-size: 11px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <header>
        <h1>🌌 Aether Replay Panel <span class="meta-tag">Session: ${traceData.session_id}</span></h1>
        <span class="meta-tag" id="summary-tag">${traceData.events ? traceData.events.length : 0} nodes</span>
    </header>

    <div class="canvas-container">
        <div class="canvas-header">
            <span>Cognition Sequence</span>
            <span id="traversal-counter">0 / 0</span>
        </div>
        <div class="nodes-list" id="nodes-list"></div>
    </div>

    <div class="inspector-panel">
        <div class="inspector-section">
            <div class="section-header">Node Inspector</div>
            <div class="section-content" id="inspector-content">Select a node to inspect payload and properties.</div>
        </div>
        <div class="inspector-section">
            <div class="section-header">Typewriter Stream</div>
            <div class="section-content" style="padding:0;">
                <div id="token-typewriter">Stream summary loading...</div>
            </div>
        </div>
    </div>

    <footer>
        <button id="btn-play">Play</button>
        <button id="btn-reset">Reset</button>
        <input type="range" id="scrubber" min="0" max="0" value="0">
        <span class="timeline-label" id="timeline-label">0 / 0</span>
    </footer>

    <script>
        const events = ${eventsJson};
        let currentStep = 0;
        let playInterval = null;

        const nodesList = document.getElementById('nodes-list');
        const inspectorContent = document.getElementById('inspector-content');
        const tokenTypewriter = document.getElementById('token-typewriter');
        const btnPlay = document.getElementById('btn-play');
        const btnReset = document.getElementById('btn-reset');
        const scrubber = document.getElementById('scrubber');
        const timelineLabel = document.getElementById('timeline-label');
        const traversalCounter = document.getElementById('traversal-counter');

        // Filter and sort events (remove loose tokens to build main flow cards, keep trace nodes)
        const renderableEvents = events.filter(e => e.type !== 'token');
        const tokenEvents = events.filter(e => e.type === 'token');

        // Setup scrubber max limit
        const totalSteps = renderableEvents.length;
        scrubber.max = totalSteps > 0 ? totalSteps - 1 : 0;
        
        function formatNodeContent(node) {
            let detail = node.content;
            if (node.type === 'tool_call') {
                const args = node.metadata?.args ? JSON.stringify(node.metadata.args) : "";
                detail = '⚙️ [Tool Call: ' + (node.metadata?.toolName || 'Unknown') + '] ' + args;
            } else if (node.type === 'tool_result') {
                detail = '✔️ [Result] ' + detail;
            } else if (node.type === 'hallucination') {
                detail = '⚠️ [HALLUCINATION WARNING] ' + detail;
            } else if (node.type === 'memory') {
                detail = '💾 [Recall: ' + (node.metadata?.source || 'db') + '] ' + detail;
            }
            return detail;
        }

        function selectNode(index) {
            const nodeCards = document.querySelectorAll('.node-card');
            nodeCards.forEach(c => c.classList.remove('active'));
            
            if (index < 0 || index >= nodeCards.length) return;
            
            const card = nodeCards[index];
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            const event = renderableEvents[index];
            
            // Build detailed properties view
            let html = '<h3>' + event.type.toUpperCase() + '</h3>';
            html += '<p><strong>Node ID:</strong> ' + event.id + '</p>';
            html += '<p><strong>Timestamp:</strong> ' + new Date(event.timestamp).toLocaleString() + '</p>';
            html += '<p><strong>Payload content:</strong></p>';
            html += '<pre>' + JSON.stringify(event.content, null, 2) + '</pre>';
            if (event.metadata) {
                html += '<p><strong>Metadata:</strong></p>';
                html += '<pre>' + JSON.stringify(event.metadata, null, 2) + '</pre>';
            }
            inspectorContent.innerHTML = html;
        }

        function setStep(step, updateScrubber = true) {
            currentStep = step;
            if (updateScrubber) scrubber.value = step;
            
            // Update labels
            timelineLabel.innerText = (step + 1) + ' / ' + totalSteps;
            traversalCounter.innerText = (step + 1) + ' / ' + totalSteps;

            // Render active node card list
            nodesList.innerHTML = '';
            for (let i = 0; i <= step; i++) {
                const ev = renderableEvents[i];
                if (!ev) continue;

                const card = document.createElement('div');
                card.className = 'node-card type-' + ev.type;
                if (i === step) card.classList.add('active');
                
                card.onclick = () => selectNode(i);

                const meta = document.createElement('div');
                meta.className = 'node-meta';
                meta.innerHTML = '<span>' + ev.type.toUpperCase() + '</span><span>' + new Date(ev.timestamp).toLocaleTimeString() + '</span>';
                card.appendChild(meta);

                const content = document.createElement('div');
                content.className = 'node-content';
                content.innerText = formatNodeContent(ev);
                card.appendChild(content);

                nodesList.appendChild(card);
            }

            // Scroll to newest node
            const cards = document.querySelectorAll('.node-card');
            if (cards.length > 0) {
                cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Update node inspector to active step
            selectNode(step);

            // Accumulate stream tokens up to current step timestamp
            const activeEvent = renderableEvents[step];
            if (activeEvent) {
                const limitTime = new Date(activeEvent.timestamp).getTime();
                const visibleTokens = tokenEvents
                    .filter(t => new Date(t.timestamp).getTime() <= limitTime)
                    .map(t => t.content)
                    .join('');
                tokenTypewriter.innerText = visibleTokens || 'Waiting for stream events...';
            }
        }

        function play() {
            if (playInterval) return;
            btnPlay.innerText = 'Pause';
            
            playInterval = setInterval(() => {
                if (currentStep >= totalSteps - 1) {
                    pause();
                    return;
                }
                setStep(currentStep + 1);
            }, 1000);
        }

        function pause() {
            if (!playInterval) return;
            clearInterval(playInterval);
            playInterval = null;
            btnPlay.innerText = 'Play';
        }

        // Timeline scrubber listener
        scrubber.oninput = (e) => {
            pause();
            setStep(parseInt(e.target.value));
        };

        btnPlay.onclick = () => {
            if (playInterval) {
                pause();
            } else {
                if (currentStep >= totalSteps - 1) {
                    setStep(0);
                }
                play();
            }
        };

        btnReset.onclick = () => {
            pause();
            setStep(0);
        };

        // Initialize state
        if (totalSteps > 0) {
            setStep(0);
        } else {
            nodesList.innerHTML = '<div style="color:var(--vscode-descriptionForeground)">Empty session trace trace.</div>';
            tokenTypewriter.innerText = 'No stream logs.';
        }
    </script>
</body>
</html>`;
    }
}
