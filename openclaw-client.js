// OpenClaw 连接模块
const path = require('path');
const fs = require('fs');

// Jarvis默认配置 - 只修改默认值
const OPENCLAW_HOST = process.env.OPENCLAW_GATEWAY_URL || 'http://100.96.37.38:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '02e02c56a5d76ed147a3f9eb02d3e2a5be7a35881e14ec80';

class OpenClawClient {
    constructor() {
        this.connected = false;
        this.sessionKey = null;
        this.lastCheckTime = 0;
        this.checkInterval = 10000;
        this.onError = null;
    }

    setErrorHandler(handler) {
        this.onError = handler;
    }

    async checkConnection() {
        const now = Date.now();
        if (now - this.lastCheckTime < this.checkInterval && this.connected) {
            return this.connected;
        }
        this.lastCheckTime = now;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const testResponse = await fetch(`${OPENCLAW_HOST}/`, {
                method: 'GET',
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);
            this.connected = testResponse !== null;
            return this.connected;
        } catch (err) {
            this.connected = false;
            return false;
        }
    }

    async sendMessage(message) {
        try {
            const response = await fetch(`${OPENCLAW_HOST}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
                    'Content-Type': 'application/json',
                    'x-openclaw-agent-id': 'main'
                },
                body: JSON.stringify({
                    model: 'openclaw:main',
                    messages: [{ role: 'user', content: message }],
                    stream: false
                })
            });

            if (!response.ok) {
                if (this.onError) this.onError(`连接失败 (${response.status})`);
                this.connected = false;
                return `连接失败 (${response.status})`;
            }

            this.connected = true;
            const data = await response.json();
            return data.choices?.[0]?.message?.content || '无响应';
        } catch (err) {
            if (this.onError) this.onError(err.message);
            this.connected = false;
            return `错误: ${err.message}`;
        }
    }

    async getStatus() {
        return this.connected ? '已连接' : '未连接';
    }
}

module.exports = OpenClawClient;
