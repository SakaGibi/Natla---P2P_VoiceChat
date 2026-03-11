const state = require('../state/appState');

class BandwidthManager {
    constructor() {
        this.monitorInterval = null;
        this.currentBitrate = 48000;
        this.lastAppliedTime = 0;
        this.lastBytesReceived = 0;
        this.lastStatsTime = Date.now();
    }

    startMonitoring() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.lastStatsTime = Date.now();
        this.lastBytesReceived = 0;
        this.monitorInterval = setInterval(() => this.checkNetworkHealth(), 3000);
        this.checkNetworkHealth();
    }

    stopMonitoring() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
    }

    async checkNetworkHealth() {
        const peerKeys = state.peers ? Object.keys(state.peers) : [];
        const peerCount = peerKeys.length;

        if (peerCount === 0) {
            if (window.updateNetworkStats) {
                window.updateNetworkStats({ bitrate: this.currentBitrate, rtt: 0, packetLoss: 0, peers: 0 });
            }
            return;
        }

        let totalRTT = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let activePeers = 0;
        let totalBytesReceived = 0; // Cumulative for current run

        for (const id in state.peers) {
            const peer = state.peers[id];
            if (!peer || !peer._pc) continue;

            try {
                const stats = await peer._pc.getStats();
                stats.forEach(report => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        totalRTT += (report.currentRoundTripTime * 1000);
                        activePeers++;
                        totalBytesReceived += (report.bytesReceived || 0);
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        packetsLost += (report.packetsLost || 0);
                        packetsReceived += (report.packetsReceived || 0);
                    }
                });
            } catch (e) { }
        }

        const avgRTT = activePeers > 0 ? (totalRTT / activePeers) : 0;
        let lossRate = 0;
        if (packetsReceived + packetsLost > 0) {
            lossRate = (packetsLost / (packetsReceived + packetsLost)) * 100;
        }

        // Calculate download speed
        const now = Date.now();
        const timeDiffSec = (now - this.lastStatsTime) / 1000;

        let downloadRateKBps = 0;
        if (timeDiffSec > 0 && totalBytesReceived > this.lastBytesReceived) {
            const bytesReceivedDelta = totalBytesReceived - this.lastBytesReceived;
            downloadRateKBps = (bytesReceivedDelta / 1024) / timeDiffSec;
        }

        // Update trackers
        this.lastStatsTime = now;
        this.lastBytesReceived = activePeers > 0 ? totalBytesReceived : 0;

        // Apply bitrate to all peers periodically or if changed (simple approach)
        this.applyBitrate(this.currentBitrate);

        if (window.updateNetworkStats) {
            window.updateNetworkStats({
                bitrate: this.currentBitrate,
                rtt: avgRTT,
                packetLoss: lossRate,
                peers: peerCount,
                downloadRate: downloadRateKBps
            });
        }
    }

    applyBitrate(bitrate) {
        const now = Date.now();
        // Cooldown: Apply every 10 seconds to ensure peers stay synced without spamming
        if (now - this.lastAppliedTime < 10000) return;
        this.lastAppliedTime = now;

        for (const id in state.peers) {
            const peer = state.peers[id];
            if (!peer || !peer._pc) continue;

            try {
                const senders = peer._pc.getSenders();
                const audioSender = senders.find(s => s.track && s.track.kind === 'audio');

                if (audioSender && audioSender.track && audioSender.track.readyState === 'live') {
                    const params = audioSender.getParameters();
                    if (!params.encodings) params.encodings = [{}];

                    if (params.encodings[0].maxBitrate !== bitrate) {
                        params.encodings[0].maxBitrate = bitrate;
                        audioSender.setParameters(params).catch(() => { });
                    }
                }
            } catch (e) { }
        }
    }
}

module.exports = new BandwidthManager();
