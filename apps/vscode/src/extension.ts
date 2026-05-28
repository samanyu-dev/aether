import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// ── AUTHENTICATION URI CALLBACK HANDLER ───────────────────────────────────────────
class AetherUriHandler implements vscode.UriHandler {
    private _onDidReceiveAuth = new vscode.EventEmitter<{accessToken: string, refreshToken: string, email: string, userId: string}>();
    readonly onDidReceiveAuth = this._onDidReceiveAuth.event;

    handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
        if (uri.path === '/auth-callback') {
            const queryParams = new URLSearchParams(uri.query);
            const accessToken = queryParams.get('accessToken');
            const refreshToken = queryParams.get('refreshToken');
            const email = queryParams.get('email');
            const userId = queryParams.get('userId');

            if (accessToken && email) {
                this._onDidReceiveAuth.fire({
                    accessToken,
                    refreshToken: refreshToken || '',
                    email,
                    userId: userId || ''
                });
            }
        }
    }
}

// ── PROFILE METADATA REFRESHER UTILITY ────────────────────────────────────────────
async function refreshProfileDetails(context: vscode.ExtensionContext): Promise<any> {
    const accessToken = await context.secrets.get('aether.accessToken');
    const userId = await context.secrets.get('aether.userId');

    if (!accessToken || !userId) {
        return null;
    }

    let profile = {
        plan: 'free',
        role: 'free_user',
        quota_traces_limit: 25,
        quota_traces_used: 0
    };

    try {
        // Try calling Next.js local server first
        const response = await globalThis.fetch('http://localhost:3000/api/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            const data: any = await response.json();
            if (data && data.profile) {
                profile = {
                    plan: data.profile.plan,
                    role: data.profile.role,
                    quota_traces_limit: data.profile.quota_traces_limit,
                    quota_traces_used: data.profile.quota_traces_used
                };
            }
        } else {
            throw new Error('Next.js API local server unavailable');
        }
    } catch (e) {
        // Fallback directly to Supabase REST API for maximum resilience offline/local-dev
        try {
            const response = await globalThis.fetch(`https://mmxpmeccczijvrsgvsdz.supabase.co/rest/v1/profiles?id=eq.${userId}`, {
                headers: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teHBtZWNjY3ppanZyc2d2c2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDk4NTEsImV4cCI6MjA5NDY4NTg1MX0.el4wlL5SARdM1DIh1z5nYcmMNLhbQt-3OpDzOyn7Yuo',
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (response.ok) {
                const data: any = await response.json();
                if (data && data.length > 0) {
                    const dbProfile = data[0];
                    profile = {
                        plan: dbProfile.plan || 'free',
                        role: dbProfile.role || 'free_user',
                        quota_traces_limit: dbProfile.quota_traces_limit || 25,
                        quota_traces_used: dbProfile.quota_traces_used || 0
                    };
                }
            }
        } catch (err) {
            // Unreachable or offline - use defaults
        }
    }

    // Persist profile variables in secure storage
    await context.secrets.store('aether.plan', profile.plan);
    await context.secrets.store('aether.role', profile.role);
    await context.secrets.store('aether.quotaLimit', String(profile.quota_traces_limit));
    await context.secrets.store('aether.quotaUsed', String(profile.quota_traces_used));

    return profile;
}

// ── CUSTOM SIDEBAR WEBVIEW PANEL (CINEMATIC CARBON DASHBOARD) ──────────────────────────
class AetherSidebarWebviewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _email: string = '';
    private _plan: string = 'free';
    private _quotaLimit: number = 25;
    private _quotaUsed: number = 0;
    private _bpThought: boolean = false;
    private _bpTool: boolean = false;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.loadCachedSecrets();
    }

    public async loadCachedSecrets() {
        this._email = await this.context.secrets.get('aether.email') || '';
        this._plan = await this.context.secrets.get('aether.plan') || 'free';
        this._quotaLimit = parseInt(await this.context.secrets.get('aether.quotaLimit') || '25');
        this._quotaUsed = parseInt(await this.context.secrets.get('aether.quotaUsed') || '0');
        this._bpThought = this.context.globalState.get<boolean>('aether.breakpoint.thought', false);
        this._bpTool = this.context.globalState.get<boolean>('aether.breakpoint.tool_call', false);
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        this.loadCachedSecrets().then(() => {
            if (this._view) {
                this._view.webview.html = this._getHtmlForWebview();
            }
        });

        // Listen for actions from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000/dashboard'));
                    break;

                case 'logout':
                    await this.context.secrets.delete('aether.accessToken');
                    await this.context.secrets.delete('aether.refreshToken');
                    await this.context.secrets.delete('aether.email');
                    await this.context.secrets.delete('aether.userId');
                    await this.context.secrets.delete('aether.plan');
                    await this.context.secrets.delete('aether.role');
                    await this.context.secrets.delete('aether.quotaLimit');
                    await this.context.secrets.delete('aether.quotaUsed');
                    await this.loadCachedSecrets();
                    vscode.window.showInformationMessage('Successfully logged out of Aether.');
                    this.refresh();
                    break;

                case 'openReplay':
                    if (message.filePath) {
                        try {
                            const traceContent = fs.readFileSync(message.filePath, 'utf-8');
                            const traceData = JSON.parse(traceContent);
                            const plan = await this.context.secrets.get('aether.plan') || 'free';
                            AetherReplayPanel.createOrShow(this.context.extensionUri, traceData, plan);
                        } catch (err) {
                            vscode.window.showErrorMessage(`Failed to open replay: ${err}`);
                        }
                    }
                    break;

                case 'syncTrace':
                    if (message.filePath) {
                        await this.handleTraceSync(message.filePath);
                    }
                    break;

                case 'copyCommand':
                    if (message.text) {
                        vscode.env.clipboard.writeText(message.text);
                        vscode.window.showInformationMessage('Copied command to clipboard!');
                    }
                    break;

                case 'toggleBreakpoint':
                    if (message.criteria) {
                        const stateKey = `aether.breakpoint.${message.criteria}`;
                        await this.context.globalState.update(stateKey, message.enabled);
                        if (message.criteria === 'thought') {
                            this._bpThought = message.enabled;
                        } else {
                            this._bpTool = message.enabled;
                        }
                        
                        try {
                            await globalThis.fetch('http://localhost:8000/breakpoints/global-configure', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ criteria: message.criteria, enabled: message.enabled })
                            });
                        } catch (e) {
                            // Backend might be offline, ignore
                        }
                    }
                    break;
            }
        });
    }

    private async handleTraceSync(filePath: string) {
        const accessToken = await this.context.secrets.get('aether.accessToken');
        const plan = await this.context.secrets.get('aether.plan') || 'free';
        const userId = await this.context.secrets.get('aether.userId');

        if (!accessToken || !userId) {
            vscode.window.showErrorMessage('Session expired or unauthorized. Please sync your session again.');
            return;
        }

        if (plan === 'free') {
            vscode.window.showErrorMessage(
                '🔒 Cloud Trace Synchronization requires Pro, Premium, or Enterprise Tier. Free accounts support local trace visualization only.',
                'Upgrade Plan'
            ).then(selection => {
                if (selection === 'Upgrade Plan') {
                    vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000/pricing'));
                }
            });
            return;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const traceData = JSON.parse(content);

            const title = traceData.agent_name || traceData.session_id || 'Observatory Trace';
            const description = `Synced from VSCode Extension Workspace - ${new Date().toLocaleDateString()}`;
            const events = traceData.events || [];

            // Convert SDK raw events into standard React Flow nodes & edges for cloud compatibility
            const renderableEvents = events.filter((e: any) => e.type !== 'token');
            const nodes = renderableEvents.map((ev: any, idx: number) => ({
                id: ev.id || String(idx + 1),
                type: ev.type === 'output' ? 'safeOutput' : ev.type,
                position: { x: 50 + idx * 220, y: 100 + (idx % 2) * 50 },
                data: {
                    label: ev.type.toUpperCase(),
                    description: ev.content || 'Cognition node',
                    confidence: typeof ev.confidence === 'number' ? ev.confidence : 1.0,
                    active: idx === 0,
                    completed: false
                }
            }));

            // Map edges sequentially or via parent_id DAG parameters
            const edges = [];
            for (let i = 0; i < renderableEvents.length; i++) {
                const node = renderableEvents[i];
                if (node.parent_id) {
                    edges.push({
                        id: `e${node.parent_id}-${node.id}`,
                        source: node.parent_id,
                        target: node.id,
                        animated: false,
                        style: { stroke: 'oklch(0.72 0.19 195 / 0.2)', strokeWidth: 1.5 }
                    });
                } else if (i > 0) {
                    const prevNode = renderableEvents[i - 1];
                    edges.push({
                        id: `e${prevNode.id}-${node.id}`,
                        source: prevNode.id,
                        target: node.id,
                        animated: false,
                        style: { stroke: 'oklch(0.72 0.19 195 / 0.2)', strokeWidth: 1.5 }
                    });
                }
            }

            const confidenceScores = nodes
                .map((n: any) => n.data.confidence)
                .filter((c: any) => typeof c === 'number');
            const maxConfidence = confidenceScores.length > 0 ? Math.min(...confidenceScores) : 1.0;

            const payload = {
                user_id: userId,
                title,
                description,
                nodes,
                edges,
                event_count: nodes.length,
                max_confidence: maxConfidence,
                is_public: false,
                duration_ms: traceData.duration_ms || 1200
            };

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Uploading trace to Aether Cloud...",
                cancellable: false
            }, async () => {
                const response = await globalThis.fetch('https://mmxpmeccczijvrsgvsdz.supabase.co/rest/v1/traces', {
                    method: 'POST',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teHBtZWNjY3ppanZyc2d2c2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDk4NTEsImV4cCI6MjA5NDY4NTg1MX0.el4wlL5SARdM1DIh1z5nYcmMNLhbQt-3OpDzOyn7Yuo',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Upload failed with code ${response.status}`);
                }

                // Persist synced status in workspaceState
                const syncedMap = this.context.globalState.get<Record<string, boolean>>('aether.syncedTraces', {});
                syncedMap[filePath] = true;
                await this.context.globalState.update('aether.syncedTraces', syncedMap);

                // Fetch new profile usage statistics
                await refreshProfileDetails(this.context);
                await this.loadCachedSecrets();

                vscode.window.showInformationMessage(`🌌 Trace "${title}" successfully synced to your cloud dashboard!`);
                this.refresh();
            });
        } catch (err: any) {
            vscode.window.showErrorMessage(`Sync Error: ${err.message || err}`);
        }
    }

    private _getHtmlForWebview(): string {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const syncedMap = this.context.globalState.get<Record<string, boolean>>('aether.syncedTraces', {});

        let tracesHtml = '';
        let localTraceCount = 0;
        if (workspaceRoot) {
            const tracesFolder = path.join(workspaceRoot, '.aether', 'traces');
            if (fs.existsSync(tracesFolder)) {
                try {
                    const files = fs.readdirSync(tracesFolder).filter((file: string) => file.endsWith('.json'));
                    localTraceCount = files.length;
                    if (files.length > 0) {
                        for (const file of files) {
                            const filePath = path.join(tracesFolder, file);
                            try {
                                const content = fs.readFileSync(filePath, 'utf-8');
                                const data = JSON.parse(content);
                                const agentName = data.agent_name || "Agent Session";
                                const eventCount = data.events ? data.events.length : 0;
                                const isSynced = syncedMap[filePath] || false;
                                const dateStr = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "";

                                tracesHtml += `
                                <div class="trace-row">
                                    <div class="trace-info" onclick="openReplay('${filePath.replace(/\\/g, '\\\\')}')">
                                        <div class="trace-name">${agentName}</div>
                                        <div class="trace-sub">${eventCount} steps | ${dateStr}</div>
                                    </div>
                                    <div class="trace-actions">
                                        ${isSynced 
                                            ? '<span class="badge badge-synced" title="Synced to Cloud">Synced</span>'
                                            : `<button class="btn-sync" onclick="syncTrace('${filePath.replace(/\\/g, '\\\\')}')">↑ Sync</button>`
                                        }
                                        <button class="btn-play" onclick="openReplay('${filePath.replace(/\\/g, '\\\\')}')">👁️</button>
                                    </div>
                                </div>`;
                            } catch (e) {
                                // Skip corrupted
                            }
                        }
                    } else {
                        tracesHtml = `<div class="empty-state">No local traces found. Let's create your first trace below!</div>`;
                    }
                } catch (e) {
                    tracesHtml = `<div class="empty-state error">Failed to scan traces: ${e}</div>`;
                }
            } else {
                tracesHtml = `<div class="empty-state">No traces folder detected at <code>.aether/traces</code>. Use the Quickstart SDK command below to initialize your agent telemetry!</div>`;
            }
        } else {
            tracesHtml = `<div class="empty-state">Please open a workspace folder in VS Code to analyze trace caches.</div>`;
        }

        // Resolving variables with strict synchronous placeholders from private fields
        const cachedEmail = this._email;
        const cachedPlan = this._plan;
        const cachedUsed = this._quotaUsed;
        const cachedLimit = this._quotaLimit;
        const cachedBpThought = this._bpThought;
        const cachedBpTool = this._bpTool;
        const localCount = localTraceCount;

        // Build promise resolution in javascript inside the webview.
        // This is extremely robust and ensures the view renders instantly and hydrates state perfectly!
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Aether Observatory Dashboard</title>
            <style>
                :root {
                    --bg-dark: #09090b;
                    --panel-dark: #121214;
                    --border-subtle: rgba(255, 255, 255, 0.05);
                    --text-primary: #f4f4f5;
                    --text-secondary: #a1a1aa;
                    --accent-cyan: oklch(0.72 0.19 195);
                    --accent-emerald: #10b981;
                    --accent-purple: #8b5cf6;
                    --accent-gold: #d4af37;
                }

                body {
                    background-color: var(--bg-dark);
                    color: var(--text-primary);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    padding: 12px;
                    margin: 0;
                    font-size: 12px;
                    box-sizing: border-box;
                }

                /* Container styles */
                .carbon-panel {
                    background-color: var(--panel-dark);
                    border: 1px solid var(--border-subtle);
                    border-radius: 12px;
                    padding: 14px;
                    margin-bottom: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                }

                h2 {
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 0;
                    margin-bottom: 10px;
                    color: var(--text-secondary);
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                /* Auth States styling */
                .auth-container {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    text-align: center;
                }

                .welcome-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 2px;
                    color: white;
                }

                .welcome-sub {
                    font-size: 11px;
                    color: var(--text-secondary);
                    line-height: 1.4;
                    margin-bottom: 10px;
                }

                .btn-primary {
                    background: linear-gradient(135deg, var(--accent-cyan), #0891b2);
                    color: black;
                    font-weight: bold;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 16px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
                }

                .btn-primary:hover {
                    opacity: 0.95;
                    box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
                    transform: translateY(-1px);
                }

                .profile-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--border-subtle);
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }

                .profile-details {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .profile-avatar {
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 11px;
                    color: white;
                }

                .profile-info {
                    text-align: left;
                }

                .profile-email {
                    font-weight: bold;
                    font-size: 11px;
                    max-w-[120px] truncate;
                }

                .badge {
                    font-size: 8px;
                    padding: 1px 5px;
                    border-radius: 4px;
                    font-weight: bold;
                    text-transform: uppercase;
                }

                .badge-free {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-secondary);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                .badge-pro {
                    background: rgba(139, 92, 246, 0.15);
                    color: var(--accent-purple);
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    box-shadow: 0 0 8px rgba(139, 92, 246, 0.2);
                }

                .badge-enterprise {
                    background: rgba(212, 175, 55, 0.15);
                    color: var(--accent-gold);
                    border: 1px solid rgba(212, 175, 55, 0.4);
                    box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
                    animation: pulse-gold 2s infinite;
                }

                @keyframes pulse-gold {
                    0% { box-shadow: 0 0 8px rgba(212, 175, 55, 0.2); }
                    50% { box-shadow: 0 0 14px rgba(212, 175, 55, 0.5); }
                    100% { box-shadow: 0 0 8px rgba(212, 175, 55, 0.2); }
                }

                .badge-synced {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--accent-emerald);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .btn-logout {
                    background: transparent;
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 9px;
                    cursor: pointer;
                }

                .btn-logout:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                /* Quota meter */
                .quota-container {
                    margin-top: 10px;
                    text-align: left;
                }

                .quota-label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }

                .quota-bar-outer {
                    height: 5px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .quota-bar-inner {
                    height: 100%;
                    background: linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald));
                    width: 0%;
                    transition: width 0.5s;
                }

                /* Trace explorer rows */
                .trace-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px;
                    padding: 8px 10px;
                    margin-bottom: 6px;
                    transition: all 0.2s;
                }

                .trace-row:hover {
                    border-color: rgba(255, 255, 255, 0.12);
                    background: rgba(255, 255, 255, 0.04);
                }

                .trace-info {
                    flex: 1;
                    cursor: pointer;
                    text-align: left;
                    overflow: hidden;
                }

                .trace-name {
                    font-weight: bold;
                    color: var(--text-primary);
                    font-size: 11px;
                    truncate: max-w-[150px];
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .trace-sub {
                    font-size: 9px;
                    color: var(--text-secondary);
                    margin-top: 2px;
                }

                .trace-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .btn-sync {
                    background: rgba(6, 182, 212, 0.1);
                    color: var(--accent-cyan);
                    border: 1px solid rgba(6, 182, 212, 0.3);
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 9px;
                    cursor: pointer;
                }

                .btn-sync:hover {
                    background: rgba(6, 182, 212, 0.2);
                }

                .btn-play {
                    background: rgba(255, 255, 255, 0.05);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 9px;
                }

                .btn-play:hover {
                    background: rgba(255, 255, 255, 0.15);
                }

                .empty-state {
                    color: var(--text-secondary);
                    font-size: 11px;
                    line-height: 1.5;
                    padding: 16px;
                    border: 1px dashed rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    text-align: center;
                }

                /* Quickstart Guide */
                .quickstart-card {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px;
                    padding: 10px;
                    text-align: left;
                }

                .step-card {
                    margin-top: 8px;
                }

                .step-title {
                    font-weight: bold;
                    font-size: 10px;
                    color: white;
                    text-transform: uppercase;
                }

                .code-block {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 10px;
                    color: var(--accent-cyan);
                    margin: 4px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .btn-copy {
                    background: transparent;
                    color: var(--text-secondary);
                    border: none;
                    cursor: pointer;
                    font-size: 8px;
                }

                .btn-copy:hover {
                    color: white;
                }

                .onboarding-list {
                    text-align: left;
                    list-style: none;
                    padding: 0;
                    margin: 8px 0;
                    font-size: 11px;
                    color: var(--text-secondary);
                }

                .onboarding-list li {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 6px;
                }

                .check-done {
                    color: var(--accent-emerald);
                    font-weight: bold;
                }

                .check-pending {
                    color: var(--text-secondary);
                    font-weight: bold;
                }

                /* Breakpoint Toggles */
                .breakpoint-toggles {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    text-align: left;
                }

                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 11px;
                    color: var(--text-primary);
                }

                .toggle-container input[type="checkbox"] {
                    accent-color: var(--accent-cyan);
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div id="unauth-view" style="display:none;" class="carbon-panel auth-container">
                <div class="welcome-title">🌌 Aether Cloud Connected</div>
                <div class="welcome-sub">Connect your local workspace to stream agent thought nodes, timeline replays, and advanced loop traces directly to the SaaS dashboard.</div>
                
                <ul class="onboarding-list">
                    <li><span class="check-done">✓</span> Install Aether Reasoning Engine</li>
                    <li><span class="check-pending">○</span> Sync Developer Session</li>
                    <li><span class="check-pending">○</span> Ingest First Replay Trace</li>
                    <li><span class="check-pending">○</span> Unlock Advanced Cloud Analytics</li>
                </ul>

                <div class="quota-container" style="margin-top: 18px; margin-bottom: 18px;">
                    <div class="quota-label">
                        <span>Local Cache Quota</span>
                        <span id="local-quota-numerical-text">0 / 10 Traces</span>
                    </div>
                    <div class="quota-bar-outer" style="height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; overflow: hidden; margin-top: 6px;">
                        <div class="quota-bar-inner" id="local-quota-bar-progress" style="width: 0%; height: 100%; background: linear-gradient(90deg, #a78bfa, #8b5cf6); border-radius: 3px; transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <button class="btn-primary" onclick="login()">Connect Aether Account</button>
            </div>

            <div id="auth-view" style="display:none;">
                <div class="carbon-panel">
                    <div class="profile-header">
                        <div class="profile-details">
                            <div class="profile-avatar" id="profile-avatar-char">D</div>
                            <div class="profile-info">
                                <div class="profile-email" id="profile-email-text">developer@aether</div>
                                <span class="badge" id="plan-badge-value">Free Core</span>
                            </div>
                        </div>
                        <button class="btn-logout" onclick="logout()">Sign Out</button>
                    </div>

                    <div class="quota-container">
                        <div class="quota-label">
                            <span>Ingested Traces Limit</span>
                            <span id="quota-numerical-text">0 / 25</span>
                        </div>
                        <div class="quota-bar-outer">
                            <div class="quota-bar-inner" id="quota-bar-progress"></div>
                        </div>
                    </div>
                </div>

                <div class="carbon-panel">
                    <h2>🌌 Local Trace Explorer</h2>
                    <div id="traces-list-container">
                        ${tracesHtml}
                    </div>
                </div>
            </div>

            <div class="carbon-panel">
                <h2>🌌 Reasoning Breakpoints</h2>
                <div class="breakpoint-toggles">
                    <label class="toggle-container">
                        <input type="checkbox" id="bp-thought" onclick="toggleBreakpoint('thought')">
                        <span class="toggle-label">Pause on Thoughts</span>
                    </label>
                    <label class="toggle-container" style="margin-top: 8px;">
                        <input type="checkbox" id="bp-tool" onclick="toggleBreakpoint('tool_call')">
                        <span class="toggle-label">Pause on Tool Calls</span>
                    </label>
                </div>
            </div>

            <div class="carbon-panel">
                <h2>🛠️ Quickstart SDK</h2>
                <div class="quickstart-card">
                    <div class="step-card">
                        <div class="step-title">1. Install Ingest SDK</div>
                        <div class="code-block">
                            <span>pip install aether-observe</span>
                            <button class="btn-copy" onclick="copyCommand('pip install aether-observe')">Copy</button>
                        </div>
                    </div>
                    <div class="step-card" style="margin-top: 10px;">
                        <div class="step-title">2. Run Replay Demo</div>
                        <div class="code-block">
                            <span>python demo.py</span>
                            <button class="btn-copy" onclick="copyCommand('python demo.py')">Copy</button>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function login() {
                    vscode.postMessage({ command: 'login' });
                }

                function logout() {
                    vscode.postMessage({ command: 'logout' });
                }

                function openReplay(filePath) {
                    vscode.postMessage({ command: 'openReplay', filePath: filePath });
                }

                function syncTrace(filePath) {
                    vscode.postMessage({ command: 'syncTrace', filePath: filePath });
                }

                function copyCommand(text) {
                    vscode.postMessage({ command: 'copyCommand', text: text });
                }

                function toggleBreakpoint(criteria) {
                    const enabled = document.getElementById('bp-' + (criteria === 'thought' ? 'thought' : 'tool')).checked;
                    vscode.postMessage({ command: 'toggleBreakpoint', criteria: criteria, enabled: enabled });
                }

                // Dynamic hydration values from VSCode SecretStorage promises
                async function hydrateState() {
                    // Placeholders evaluated asynchronously from extension
                    const email = "${cachedEmail || ''}";
                    const plan = "${cachedPlan || ''}";
                    const used = parseInt("${cachedUsed || '0'}");
                    const limit = parseInt("${cachedLimit || '25'}");
                    const localCount = parseInt("${localCount || '0'}");
                    
                    const bpThought = ${cachedBpThought};
                    const bpTool = ${cachedBpTool};
                    document.getElementById('bp-thought').checked = bpThought;
                    document.getElementById('bp-tool').checked = bpTool;

                    // Hydrate local quota bar
                    document.getElementById('local-quota-numerical-text').innerText = localCount + ' / 10 Traces';
                    const localPercentage = Math.min(100, (localCount / 10) * 100);
                    const localBar = document.getElementById('local-quota-bar-progress');
                    localBar.style.width = localPercentage + '%';
                    if (localCount >= 10) {
                        localBar.style.background = 'linear-gradient(90deg, #f87171, #ef4444)';
                    }

                    if (email) {
                        document.getElementById('unauth-view').style.display = 'none';
                        document.getElementById('auth-view').style.display = 'block';

                        document.getElementById('profile-email-text').innerText = email;
                        document.getElementById('profile-avatar-char').innerText = email.charAt(0).toUpperCase();

                        const badge = document.getElementById('plan-badge-value');
                        badge.innerText = plan.toUpperCase();
                        badge.className = 'badge badge-' + plan;

                        document.getElementById('quota-numerical-text').innerText = used + ' / ' + limit;
                        const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                        document.getElementById('quota-bar-progress').style.width = percentage + '%';
                    } else {
                        document.getElementById('unauth-view').style.display = 'block';
                        document.getElementById('auth-view').style.display = 'none';
                    }
                }

                hydrateState();
            </script>
        </body>
        </html>`;
    }
}

// ── NATIVE INTERACTIVE WEBVIEW PANEL (REPLAY WINDOW) ──────────────────────────────
class AetherReplayPanel {
    public static currentPanel: AetherReplayPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, traceData: any, plan: string, baselineData?: any) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (AetherReplayPanel.currentPanel) {
            AetherReplayPanel.currentPanel._panel.reveal(column);
            AetherReplayPanel.currentPanel.loadTrace(traceData, plan, baselineData);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'aetherReplay',
            baselineData ? `Aether Compare: ${traceData.session_id || 'Session'} vs Baseline` : `Aether Replay: ${traceData.session_id || 'Session'}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        AetherReplayPanel.currentPanel = new AetherReplayPanel(panel, extensionUri, traceData, plan, baselineData);
    }

    private constructor(panel: vscode.WebviewPanel, _extensionUri: vscode.Uri, traceData: any, plan: string, baselineData?: any) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        // Listen for actions from replay webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'upgradePlan':
                    vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000/pricing'));
                    break;
                case 'closeWebview':
                    this.dispose();
                    break;
            }
        }, null, this._disposables);

        this.loadTrace(traceData, plan, baselineData);
    }

    public loadTrace(traceData: any, plan: string, baselineData?: any) {
        this._panel.title = baselineData
            ? `Aether Compare: ${traceData.agent_name || traceData.session_id} vs Baseline`
            : `Aether Replay: ${traceData.agent_name || traceData.session_id}`;
        this._panel.webview.html = this._getHtmlForWebview(traceData, plan, baselineData);
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

    private _getHtmlForWebview(traceData: any, plan: string, baselineData?: any): string {
        const eventsJson = JSON.stringify(traceData.events || []);
        const baselineEventsJson = baselineData ? JSON.stringify(baselineData.events || []) : 'null';
        
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
            grid-template-columns: ${baselineData ? '3.5fr 1.2fr' : '2fr 1fr'};
            grid-template-rows: auto 1fr auto;
            height: 100vh;
            box-sizing: border-box;
            gap: 16px;
            position: relative;
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
            border: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(30, 30, 35, 0.45);
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            backdrop-filter: blur(10px);
            margin-bottom: 4px;
        }

        .node-card:hover {
            border-color: rgba(255, 255, 255, 0.15);
            background: rgba(45, 45, 52, 0.6);
            transform: translateY(-1px);
        }

        .node-card.active {
            border-color: var(--vscode-focusBorder, #00f0ff);
            background: rgba(0, 240, 255, 0.04);
            box-shadow: 0 0 20px rgba(0, 240, 255, 0.12);
        }

        .node-card.type-thought { border-left: 4px solid #00f0ff; }
        .node-card.type-tool_call { border-left: 4px solid #f59e0b; }
        .node-card.type-tool_result { border-left: 4px solid #10b981; }
        .node-card.type-memory { border-left: 4px solid #8b5cf6; }
        .node-card.type-hallucination { 
            border-left: 4px solid #ef4444; 
            background: rgba(239, 68, 68, 0.05); 
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.08);
        }

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

        /* Premium aesthetics watermark class */
        .watermark-overlay {
            position: absolute;
            bottom: 20px;
            right: 20px;
            pointer-events: none;
            font-family: monospace;
            font-size: 9px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            padding: 6px 12px;
            border-radius: 6px;
            z-index: 9999;
            backdrop-filter: blur(5px);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }

        /* Gated premium features overlay */
        .gated-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(10, 10, 10, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #ffffff;
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
            text-align: center;
            padding: 24px;
            box-sizing: border-box;
        }
        .gated-card {
            background: linear-gradient(135deg, rgba(20, 20, 25, 0.95) 0%, rgba(30, 30, 38, 0.98) 100%);
            border: 1px solid rgba(139, 92, 246, 0.4);
            border-radius: 12px;
            padding: 32px 40px;
            max-width: 480px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .gated-badge {
            background: linear-gradient(90deg, #a78bfa, #8b5cf6);
            color: #fff;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding: 4px 10px;
            border-radius: 100px;
            margin-bottom: 16px;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .gated-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 12px 0;
            letter-spacing: -0.5px;
            color: #ffffff;
            background: linear-gradient(135deg, #ffffff 60%, #c084fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .gated-desc {
            font-size: 13px;
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: 24px;
        }
        .gated-btn {
            background: linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%);
            color: #ffffff;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
        }
        .gated-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
            background: linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%);
        }
        .gated-secondary-link {
            margin-top: 14px;
            font-size: 12px;
            color: #9ca3af;
            text-decoration: underline;
            cursor: pointer;
            transition: color 0.2s;
        }
        .gated-secondary-link:hover {
            color: #a78bfa;
        }

        /* Diff States for Comparison Mode */
        .node-card.status-added {
            border-color: rgba(16, 185, 129, 0.25) !important;
            background: rgba(16, 185, 129, 0.04) !important;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.05) !important;
        }
        .node-card.status-added:hover {
            border-color: rgba(16, 185, 129, 0.45) !important;
            background: rgba(16, 185, 129, 0.08) !important;
        }
        
        .node-card.status-modified {
            border-color: rgba(245, 158, 11, 0.3) !important;
            background: rgba(245, 158, 11, 0.04) !important;
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.05) !important;
        }
        .node-card.status-modified:hover {
            border-color: rgba(245, 158, 11, 0.5) !important;
            background: rgba(245, 158, 11, 0.08) !important;
        }
        
        .node-card.status-deleted {
            border-color: rgba(239, 68, 68, 0.25) !important;
            background: rgba(239, 68, 68, 0.02) !important;
            opacity: 0.45;
            border-style: dashed !important;
        }
        .node-card.status-deleted:hover {
            opacity: 0.75;
            border-color: rgba(239, 68, 68, 0.4) !important;
        }
        
        /* Spacer node for alignment matching */
        .node-card.spacer {
            border: 1px dashed rgba(255, 255, 255, 0.03) !important;
            background: transparent !important;
            opacity: 0.25;
            cursor: default;
            pointer-events: none;
            box-shadow: none !important;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-style: italic;
            height: 52px;
            padding: 0 12px;
            box-sizing: border-box;
            margin-bottom: 4px;
        }
        
        .diff-badge {
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 1px 4px;
            border-radius: 3px;
            display: inline-block;
            margin-right: 6px;
        }
        
        .diff-badge.added {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .diff-badge.modified {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }
        
        .diff-badge.deleted {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .delta-tag {
            font-family: monospace;
            font-size: 9px;
            padding: 1px 4px;
            border-radius: 3px;
            margin-left: 6px;
            font-weight: bold;
            display: inline-block;
        }
        
        .delta-tag.positive-bad {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }
        .delta-tag.negative-good {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }
        .delta-tag.neutral {
            background: rgba(255, 255, 255, 0.05);
            color: #a1a1aa;
        }
    </style>
</head>
<body>
    ${plan === 'free' ? '<div class="watermark-overlay">Aether Free Core Visualizer</div>' : ''}
    
    ${(plan === 'free' && baselineData) ? `
    <div class="gated-overlay">
        <div class="gated-card">
            <span class="gated-badge">Premium Feature</span>
            <h2 class="gated-title">🌌 Git-Style Cognitive Diffs</h2>
            <p class="gated-desc">Compare execution trajectories, pinpoint hallucination heatmaps, and analyze latency or confidence shifts side-by-side. Upgrade to Aether Pro to unlock visual trace comparisons.</p>
            <button class="gated-btn" onclick="vscode.postMessage({ command: 'upgradePlan' })">Upgrade to Aether Pro</button>
            <span class="gated-secondary-link" onclick="vscode.postMessage({ command: 'closeWebview' })">Back to Local Explorer</span>
        </div>
    </div>
    ` : ''}

    <header>
        ${baselineData 
            ? `<h1>🌌 Aether Cognition Diff <span class="meta-tag">Experiment: ${traceData.agent_name || traceData.session_id}</span> <span class="meta-tag" style="background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4);">vs Baseline</span></h1>`
            : `<h1>🌌 Aether Replay Panel <span class="meta-tag">Session: ${traceData.session_id}</span></h1>`
        }
        <span class="meta-tag" id="summary-tag">${traceData.events ? traceData.events.length : 0} nodes</span>
    </header>

    ${baselineData 
        ? `<div class="canvas-columns" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; overflow: hidden; height: 100%; grid-column: 1;">
            <div class="canvas-container">
                <div class="canvas-header">
                    <span>Baseline Sequence</span>
                    <span id="baseline-counter" style="font-family: monospace;">0 / 0</span>
                </div>
                <div class="nodes-list" id="baseline-nodes-list"></div>
            </div>
            <div class="canvas-container">
                <div class="canvas-header">
                    <span>Experiment Sequence</span>
                    <span id="experiment-counter" style="font-family: monospace;">0 / 0</span>
                </div>
                <div class="nodes-list" id="experiment-nodes-list"></div>
            </div>
           </div>`
        : `<div class="canvas-container">
            <div class="canvas-header">
                <span>Cognition Sequence</span>
                <span id="traversal-counter">0 / 0</span>
            </div>
            <div class="nodes-list" id="nodes-list"></div>
           </div>`
    }

    <div class="inspector-panel">
        <div class="inspector-section">
            <div class="section-header">Node Inspector</div>
            <div class="section-content" id="inspector-content">Select a node to inspect payload and properties.</div>
        </div>
        <div class="inspector-section">
            <div class="section-header">Typewriter Stream</div>
            <div class="section-content" style="padding:0;">
                <div id="token-typewriter"></div>
            </div>
        </div>
    </div>

    <footer>
        <button id="btn-play">Play</button>
        <button id="btn-reset">Reset</button>
        <input type="range" id="scrubber" min="0" value="0" step="1">
        <span class="timeline-label" id="timeline-label">Step 0 / 0</span>
    </footer>

    <script>
        const vscode = acquireVsCodeApi();
        const events = ${eventsJson};
        const baselineEvents = ${baselineEventsJson};
        let currentStep = 0;
        let playInterval = null;

        const inspectorContent = document.getElementById('inspector-content');
        const tokenTypewriter = document.getElementById('token-typewriter');
        const btnPlay = document.getElementById('btn-play');
        const btnReset = document.getElementById('btn-reset');
        const scrubber = document.getElementById('scrubber');
        const timelineLabel = document.getElementById('timeline-label');

        // Filter and sort events
        const expEvents = events.filter(e => e.type !== 'token');
        const baseEvents = baselineEvents ? baselineEvents.filter(e => e.type !== 'token') : [];
        const tokenEvents = events.filter(e => e.type === 'token');

        let slots = [];
        let totalSteps = 0;

        if (baselineEvents) {
            // MATCHING ALGORITHM FOR COMPARISON MODE
            const unmatchedBase = [...baseEvents];
            const unmatchedExp = [...expEvents];
            const matchedPairs = [];

            // 1. Match by explicit ID
            for (let i = unmatchedExp.length - 1; i >= 0; i--) {
                const exp = unmatchedExp[i];
                const baseMatchIdx = unmatchedBase.findIndex(b => b.id === exp.id);
                if (baseMatchIdx !== -1) {
                    matchedPairs.push({ base: unmatchedBase[baseMatchIdx], exp });
                    unmatchedBase.splice(baseMatchIdx, 1);
                    unmatchedExp.splice(i, 1);
                }
            }

            // 2. Sequential type-based fallback matching
            for (let i = unmatchedExp.length - 1; i >= 0; i--) {
                const exp = unmatchedExp[i];
                const baseMatchIdx = unmatchedBase.findIndex(b => b.type === exp.type);
                if (baseMatchIdx !== -1) {
                    matchedPairs.push({ base: unmatchedBase[baseMatchIdx], exp });
                    unmatchedBase.splice(baseMatchIdx, 1);
                    unmatchedExp.splice(i, 1);
                }
            }

            // Build aligned slots based on experiment order
            expEvents.forEach(exp => {
                const pair = matchedPairs.find(p => p.exp.id === exp.id);
                if (pair) {
                    const base = pair.base;
                    const isModified = base.content !== exp.content || base.type !== exp.type;
                    
                    let latencyDelta = undefined;
                    const baseLat = base.metadata?.latency;
                    const expLat = exp.metadata?.latency;
                    if (baseLat !== undefined && expLat !== undefined) {
                        latencyDelta = Number(expLat) - Number(baseLat);
                    }

                    let confidenceDelta = undefined;
                    const baseConf = base.metadata?.confidence;
                    const expConf = exp.metadata?.confidence;
                    if (baseConf !== undefined && expConf !== undefined) {
                        confidenceDelta = Number(expConf) - Number(baseConf);
                    }

                    slots.push({
                        type: 'matched',
                        status: isModified ? 'modified' : 'unchanged',
                        base,
                        exp,
                        latencyDelta,
                        confidenceDelta
                    });
                } else {
                    slots.push({
                        type: 'added',
                        status: 'added',
                        base: null,
                        exp: exp
                    });
                }
            });

            // Insert deleted baseline events topologically
            unmatchedBase.forEach(base => {
                const origIdx = baseEvents.findIndex(b => b.id === base.id);
                let insertIdx = -1;
                for (let i = origIdx - 1; i >= 0; i--) {
                    const prevBaseId = baseEvents[i].id;
                    const slotIdx = slots.findIndex(s => s.base && s.base.id === prevBaseId);
                    if (slotIdx !== -1) {
                        insertIdx = slotIdx + 1;
                        break;
                    }
                }
                const newSlot = {
                    type: 'deleted',
                    status: 'deleted',
                    base: base,
                    exp: null
                };
                if (insertIdx !== -1) {
                    slots.splice(insertIdx, 0, newSlot);
                } else {
                    slots.push(newSlot);
                }
            });

            totalSteps = slots.length;
        } else {
            // SINGLE MODE SLOTS mapping directly
            expEvents.forEach(exp => {
                slots.push({
                    type: 'single',
                    status: 'unchanged',
                    base: null,
                    exp: exp
                });
            });
            totalSteps = slots.length;
        }

        // Setup scrubber max limit
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
            const bCards = document.querySelectorAll('#baseline-nodes-list .node-card');
            const eCards = document.querySelectorAll('#experiment-nodes-list .node-card');
            const singleCards = document.querySelectorAll('#nodes-list .node-card');
            
            bCards.forEach(c => c.classList.remove('active'));
            eCards.forEach(c => c.classList.remove('active'));
            singleCards.forEach(c => c.classList.remove('active'));
            
            if (index < 0 || index >= totalSteps) return;

            if (baselineEvents) {
                if (bCards[index]) {
                    bCards[index].classList.add('active');
                    bCards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                if (eCards[index]) {
                    eCards[index].classList.add('active');
                    eCards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                const slot = slots[index];
                let html = '<h3>Slot Alignment ' + (index + 1) + '</h3>';
                html += '<p><strong>Diff Status:</strong> <span class="diff-badge ' + slot.status + '">' + slot.status.toUpperCase() + '</span></p>';
                
                if (slot.base) {
                    html += '<div style="margin-top: 10px; border: 1px solid rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; background: rgba(0,0,0,0.15);">';
                    html += '<strong style="color: #ef4444;">[Baseline Node]</strong>';
                    html += '<p><strong>Type:</strong> ' + slot.base.type + ' | <strong>ID:</strong> ' + slot.base.id + '</p>';
                    html += '<pre style="max-height: 120px; overflow-y: auto; font-size: 10px;">' + JSON.stringify(slot.base.content, null, 2) + '</pre>';
                    html += '</div>';
                }
                if (slot.exp) {
                    html += '<div style="margin-top: 10px; border: 1px solid rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; background: rgba(0,0,0,0.15);">';
                    html += '<strong style="color: #10b981;">[Experiment Node]</strong>';
                    html += '<p><strong>Type:</strong> ' + slot.exp.type + ' | <strong>ID:</strong> ' + slot.exp.id + '</p>';
                    if (slot.latencyDelta !== undefined) {
                        const styleClass = slot.latencyDelta > 0 ? 'positive-bad' : 'negative-good';
                        const sign = slot.latencyDelta > 0 ? '+' : '';
                        html += '<p><strong>Latency Shift:</strong> <span class="delta-tag ' + styleClass + '">' + sign + slot.latencyDelta + 'ms</span></p>';
                    }
                    if (slot.confidenceDelta !== undefined) {
                        const styleClass = slot.confidenceDelta >= 0 ? 'negative-good' : 'positive-bad';
                        const sign = slot.confidenceDelta >= 0 ? '+' : '';
                        html += '<p><strong>Confidence Shift:</strong> <span class="delta-tag ' + styleClass + '">' + sign + Math.round(slot.confidenceDelta * 100) + '%</span></p>';
                    }
                    html += '<pre style="max-height: 120px; overflow-y: auto; font-size: 10px;">' + JSON.stringify(slot.exp.content, null, 2) + '</pre>';
                    html += '</div>';
                }
                inspectorContent.innerHTML = html;
            } else {
                if (singleCards[index]) {
                    singleCards[index].classList.add('active');
                    singleCards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                const slot = slots[index];
                if (!slot || !slot.exp) return;
                const event = slot.exp;
                
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

                fetch('http://localhost:8000/breakpoints/' + event.id + '/status')
                    .then(res => res.json())
                    .then(bpData => {
                        if (bpData && bpData.active) {
                            renderActiveBreakpointPanel(event, bpData);
                        }
                    })
                    .catch(err => {});
            }
        }

        function renderActiveBreakpointPanel(event, bpData) {
            const inspectorContent = document.getElementById('inspector-content');
            
            let bpCardHtml = '<div class="breakpoint-control-card" style="margin-top: 14px; padding: 12px; border: 1px solid #f59e0b; background: rgba(245, 158, 11, 0.05); border-radius: 8px; box-shadow: 0 0 15px rgba(245, 158, 11, 0.15); margin-bottom: 14px;">';
            bpCardHtml += '<h4 style="margin: 0 0 8px 0; color: #f59e0b; font-size: 11px; display: flex; align-items: center; gap: 6px;">⏸️ REASONING BREAKPOINT ACTIVE</h4>';
            bpCardHtml += '<p style="margin: 0 0 10px 0; font-size: 10px; color: var(--vscode-descriptionForeground);">The agent is halted here. You can edit parameters in real-time before resuming, or reject it entirely.</p>';
            
            if (event.type === 'tool_call') {
                const argsStr = JSON.stringify(event.metadata?.args || {}, null, 2);
                bpCardHtml += '<div style="margin-bottom: 8px;"><strong style="font-size: 10px; display: block; margin-bottom: 4px;">Edit Tool Arguments (JSON):</strong>';
                bpCardHtml += '<textarea id="bp-args-editor" style="width: 100%; height: 100px; background: #121214; color: #00f0ff; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; font-family: monospace; font-size: 10px; padding: 6px; box-sizing: border-box; resize: vertical;">' + argsStr + '</textarea></div>';
            } else if (event.type === 'thought') {
                bpCardHtml += '<div style="margin-bottom: 8px;"><strong style="font-size: 10px; display: block; margin-bottom: 4px;">Edit Agent Thought:</strong>';
                bpCardHtml += '<textarea id="bp-content-editor" style="width: 100%; height: 80px; background: #121214; color: #a1a1aa; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; font-family: sans-serif; font-size: 10px; padding: 6px; box-sizing: border-box; resize: vertical;">' + event.content + '</textarea></div>';
            }
            
            bpCardHtml += '<div style="display: flex; gap: 8px; margin-top: 10px;">';
            bpCardHtml += '<button onclick="executeResume(\'' + event.sessionId + '\', \'' + event.id + '\', \'' + event.type + '\')" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; flex: 1;">▶ Resume</button>';
            bpCardHtml += '<button onclick="executeReject(\'' + event.sessionId + '\', \'' + event.id + '\')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; flex: 1;">❌ Reject</button>';
            bpCardHtml += '</div>';
            bpCardHtml += '<div id="bp-action-status" style="margin-top: 6px; font-size: 9px; text-align: center; color: var(--vscode-descriptionForeground);"></div>';
            bpCardHtml += '</div>';
            
            inspectorContent.innerHTML = bpCardHtml + inspectorContent.innerHTML;
        }

        function executeResume(sessionId, nodeId, eventType) {
            const statusDiv = document.getElementById('bp-action-status');
            statusDiv.innerText = 'Sending resume command...';
            
            let mutatedPayload = {};
            if (eventType === 'tool_call') {
                const editor = document.getElementById('bp-args-editor');
                try {
                    const parsedArgs = JSON.parse(editor.value);
                    mutatedPayload = {
                        content: 'Calling ' + (expEvents.find(e => e.id === nodeId)?.metadata?.toolName || 'tool'),
                        metadata: {
                            toolName: expEvents.find(e => e.id === nodeId)?.metadata?.toolName || 'tool',
                            args: parsedArgs
                        }
                    };
                } catch (err) {
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Invalid JSON: ' + err.message + '</span>';
                    return;
                }
            } else if (eventType === 'thought') {
                const editor = document.getElementById('bp-content-editor');
                mutatedPayload = {
                    content: editor.value,
                    metadata: {}
                };
            }
            
            fetch('http://localhost:8000/sessions/' + sessionId + '/breakpoints/' + nodeId + '/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mutatedPayload)
            })
            .then(res => {
                if (res.ok) {
                    statusDiv.innerHTML = '<span style="color: #10b981;">▶ Agent resumed successfully!</span>';
                    setTimeout(() => {
                        const activeIdx = expEvents.findIndex(e => e.id === nodeId);
                        if (activeIdx !== -1) {
                            selectNode(activeIdx);
                        }
                    }, 1000);
                } else {
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Failed to resume</span>';
                }
            })
            .catch(err => {
                statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Error: ' + err.message + '</span>';
            });
        }

        function executeReject(sessionId, nodeId) {
            const statusDiv = document.getElementById('bp-action-status');
            statusDiv.innerText = 'Sending reject command...';
            
            fetch('http://localhost:8000/sessions/' + sessionId + '/breakpoints/' + nodeId + '/reject', {
                method: 'POST'
            })
            .then(res => {
                if (res.ok) {
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Execution rejected!</span>';
                    setTimeout(() => {
                        const activeIdx = expEvents.findIndex(e => e.id === nodeId);
                        if (activeIdx !== -1) {
                            selectNode(activeIdx);
                        }
                    }, 1000);
                } else {
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Failed to reject</span>';
                }
            })
            .catch(err => {
                statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Error: ' + err.message + '</span>';
            });
        }

        function setStep(step, updateScrubber = true) {
            currentStep = step;
            if (updateScrubber) scrubber.value = step;
            
            timelineLabel.innerText = (step + 1) + ' / ' + totalSteps;

            if (baselineEvents) {
                document.getElementById('baseline-counter').innerText = (step + 1) + ' / ' + totalSteps;
                document.getElementById('experiment-counter').innerText = (step + 1) + ' / ' + totalSteps;

                const bList = document.getElementById('baseline-nodes-list');
                const eList = document.getElementById('experiment-nodes-list');

                bList.innerHTML = '';
                eList.innerHTML = '';

                for (let i = 0; i <= step; i++) {
                    const slot = slots[i];
                    if (!slot) continue;

                    // 1. BASELINE CARD
                    if (slot.base) {
                        const bCard = document.createElement('div');
                        bCard.className = 'node-card type-' + slot.base.type + ' status-' + slot.status;
                        if (i === step) bCard.classList.add('active');
                        bCard.onclick = () => selectNode(i);

                        const meta = document.createElement('div');
                        meta.className = 'node-meta';
                        meta.innerHTML = '<span>' + (slot.status === 'deleted' ? '<span class="diff-badge deleted">Removed</span>' : '') + slot.base.type.toUpperCase() + '</span><span>' + new Date(slot.base.timestamp).toLocaleTimeString() + '</span>';
                        bCard.appendChild(meta);

                        const content = document.createElement('div');
                        content.className = 'node-content';
                        content.innerText = formatNodeContent(slot.base);
                        bCard.appendChild(content);

                        bList.appendChild(bCard);
                    } else {
                        const spacer = document.createElement('div');
                        spacer.className = 'node-card spacer';
                        spacer.innerHTML = '➕ [Added in Experiment Run]';
                        bList.appendChild(spacer);
                    }

                    // 2. EXPERIMENT CARD
                    if (slot.exp) {
                        const eCard = document.createElement('div');
                        eCard.className = 'node-card type-' + slot.exp.type + ' status-' + slot.status;
                        if (i === step) eCard.classList.add('active');
                        eCard.onclick = () => selectNode(i);

                        let statusText = '';
                        if (slot.status === 'added') {
                            statusText = '<span class="diff-badge added">Added</span>';
                        } else if (slot.status === 'modified') {
                            statusText = '<span class="diff-badge modified">Modified</span>';
                        }

                        let shiftText = '';
                        if (slot.latencyDelta !== undefined && slot.latencyDelta !== 0) {
                            const cls = slot.latencyDelta > 0 ? 'positive-bad' : 'negative-good';
                            const sign = slot.latencyDelta > 0 ? '+' : '';
                            shiftText += '<span class="delta-tag ' + cls + '">' + sign + slot.latencyDelta + 'ms</span>';
                        }
                        if (slot.confidenceDelta !== undefined && slot.confidenceDelta !== 0) {
                            const cls = slot.confidenceDelta >= 0 ? 'negative-good' : 'positive-bad';
                            const sign = slot.confidenceDelta >= 0 ? '+' : '';
                            shiftText += '<span class="delta-tag ' + cls + '">' + sign + Math.round(slot.confidenceDelta * 100) + '%</span>';
                        }

                        const meta = document.createElement('div');
                        meta.className = 'node-meta';
                        meta.innerHTML = '<span>' + statusText + slot.exp.type.toUpperCase() + '</span><span>' + new Date(slot.exp.timestamp).toLocaleTimeString() + shiftText + '</span>';
                        eCard.appendChild(meta);

                        const content = document.createElement('div');
                        content.className = 'node-content';
                        content.innerText = formatNodeContent(slot.exp);
                        eCard.appendChild(content);

                        eList.appendChild(eCard);
                    } else {
                        const spacer = document.createElement('div');
                        spacer.className = 'node-card spacer';
                        spacer.innerHTML = '❌ [Removed in Experiment Run]';
                        eList.appendChild(spacer);
                    }
                }
            } else {
                document.getElementById('traversal-counter').innerText = (step + 1) + ' / ' + totalSteps;

                const nodesList = document.getElementById('nodes-list');
                nodesList.innerHTML = '';

                for (let i = 0; i <= step; i++) {
                    const slot = slots[i];
                    if (!slot || !slot.exp) continue;
                    const ev = slot.exp;

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
            }

            const activeCards = document.querySelectorAll('.node-card.active');
            activeCards.forEach(c => {
                c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });

            selectNode(step);

            const activeSlot = slots[step];
            if (activeSlot && activeSlot.exp) {
                const limitTime = new Date(activeSlot.exp.timestamp).getTime();
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

        if (totalSteps > 0) {
            setStep(0);
        } else {
            const nodesList = document.getElementById('nodes-list');
            if (nodesList) nodesList.innerHTML = '<div style="color:var(--vscode-descriptionForeground)">Empty session trace.</div>';
            tokenTypewriter.innerText = 'No stream logs.';
        }
    </script>
</body>
</html>`;
    }
}

// ── MAIN EXTENSION ACTIVATION ─────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    // Register secure URI custom callback deep-linker
    const uriHandler = new AetherUriHandler();
    context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

    // Register active Sidebar Webview provider
    const provider = new AetherSidebarWebviewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'aether-traces',
            provider
        )
    );

    // Deep link callback listener
    context.subscriptions.push(
        uriHandler.onDidReceiveAuth(async (authData) => {
            await context.secrets.store('aether.accessToken', authData.accessToken);
            await context.secrets.store('aether.refreshToken', authData.refreshToken);
            await context.secrets.store('aether.email', authData.email);
            await context.secrets.store('aether.userId', authData.userId);

            vscode.window.showInformationMessage(`Successfully connected to Aether Cloud: ${authData.email}`);
            
            // Sync user details and plan tier statistics
            await refreshProfileDetails(context);
            await provider.loadCachedSecrets();
            
            // Reload sidebar dashboard UI
            provider.refresh();
        })
    );

    // Manual profile synchronization command
    let refreshCommand = vscode.commands.registerCommand('aether.refreshExplorer', async () => {
        const accessToken = await context.secrets.get('aether.accessToken');
        if (accessToken) {
            await refreshProfileDetails(context);
        }
        await provider.loadCachedSecrets();
        provider.refresh();
    });
    context.subscriptions.push(refreshCommand);

    // Interactive trace viewer command
    let replayCommand = vscode.commands.registerCommand('aether.replayTrace', async (traceFilePath: string) => {
        try {
            const traceContent = fs.readFileSync(traceFilePath, 'utf-8');
            const traceData = JSON.parse(traceContent);
            const plan = await context.secrets.get('aether.plan') || 'free';
            AetherReplayPanel.createOrShow(context.extensionUri, traceData, plan);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open Aether replay file: ${err}`);
        }
    });
    context.subscriptions.push(replayCommand);

    // Interactive trace comparison command
    let compareCommand = vscode.commands.registerCommand('aether.compareTraces', async () => {
        try {
            const defaultUri = workspaceRoot ? vscode.Uri.file(path.join(workspaceRoot, '.aether', 'traces')) : undefined;

            const baselineUri = await vscode.window.showOpenDialog({
                title: 'Select Baseline Trace File',
                openLabel: 'Select Baseline',
                defaultUri: defaultUri,
                filters: { 'JSON Traces': ['json'] },
                canSelectMany: false
            });

            if (!baselineUri || baselineUri.length === 0) {
                return;
            }

            const experimentUri = await vscode.window.showOpenDialog({
                title: 'Select Experiment Trace File',
                openLabel: 'Select Experiment',
                defaultUri: defaultUri,
                filters: { 'JSON Traces': ['json'] },
                canSelectMany: false
            });

            if (!experimentUri || experimentUri.length === 0) {
                return;
            }

            const baselineContent = fs.readFileSync(baselineUri[0].fsPath, 'utf-8');
            const experimentContent = fs.readFileSync(experimentUri[0].fsPath, 'utf-8');

            const baselineData = JSON.parse(baselineContent);
            const experimentData = JSON.parse(experimentContent);

            const plan = await context.secrets.get('aether.plan') || 'free';
            AetherReplayPanel.createOrShow(context.extensionUri, experimentData, plan, baselineData);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to compare Aether traces: ${err}`);
        }
    });
    context.subscriptions.push(compareCommand);

    // Automatically refresh trace list explorer when a new trace JSON drops in workspace
    if (workspaceRoot) {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(path.join(workspaceRoot, '.aether', 'traces'), '*.json')
        );
        watcher.onDidCreate(() => provider.refresh());
        watcher.onDidChange(() => provider.refresh());
        watcher.onDidDelete(() => provider.refresh());
        context.subscriptions.push(watcher);
    }
}

export function deactivate() {}
