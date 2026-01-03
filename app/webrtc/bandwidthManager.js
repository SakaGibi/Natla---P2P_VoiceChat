const state = require('../state/appState');

class BandwidthManager {
    constructor() {
        this.monitorInterval = null;
        this.currentBitrate = 64000; // Start high
        this.badSampleCount = 0;
        this.goodSampleCount = 0;
        this.lastChangeTime = 0; // Cooldown timer

        // Configuration
        this.limits = {
            PEER_CAPS: { LOW: 64000, MED: 48000, HIGH: 32000 },
            THRESHOLDS: {
                LOSS_CRITICAL: 0.06,
                LOSS_WARNING: 0.03,
                RTT_CRITICAL: 250,
                RTT_WARNING: 150
            }
        };
    }

    startMonitoring() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => this.checkNetworkHealth(), 3000); // 2s -> 3s
        this.checkNetworkHealth();
    }

    stopMonitoring() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
    }

    async checkNetworkHealth() {
        const peerKeys = state.peers ? Object.keys(state.peers) : [];

        if (peerKeys.length === 0) {
            if (window.updateNetworkStats) {
                window.updateNetworkStats({
                    bitrate: this.currentBitrate,
                    rtt: 0,
                    packetLoss: 0,
                    peers: 0
                });
            }
            return;
        }

        let maxRTT = 0;
        let count = 0;
        let packetsLost = 0;
        let packetsReceived = 0;

        // Iterate all peers to get stats
        for (const id in state.peers) {
            const peer = state.peers[id];
            if (!peer || !peer._pc) continue;

            try {
                const stats = await peer._pc.getStats();
                stats.forEach(report => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        maxRTT = Math.max(maxRTT, report.currentRoundTripTime * 1000);
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        packetsLost += report.packetsLost || 0;
                        packetsReceived += report.packetsReceived || 0;
                    }
                });
                count++;
            } catch (e) { console.error(`[BandwidthManager] Stats Error for ${id}:`, e); }
        }

        let lossRate = 0;
        if (packetsReceived + packetsLost > 0) {
            lossRate = packetsLost / (packetsReceived + packetsLost);
        }

        // --- 1. PEER COUNT CAP ---
        const peerCount = peerKeys.length;
        let peerCapBitrate = this.limits.PEER_CAPS.LOW;
        if (peerCount > 7) peerCapBitrate = this.limits.PEER_CAPS.HIGH;
        else if (peerCount > 4) peerCapBitrate = this.limits.PEER_CAPS.MED;

        // --- 2. NETWORK HEALTH CAP ---
        let networkCapBitrate = 64000;

        if (maxRTT > this.limits.THRESHOLDS.RTT_CRITICAL) {
            networkCapBitrate = 32000;
        } else if (maxRTT > this.limits.THRESHOLDS.RTT_WARNING) {
            networkCapBitrate = 48000;
        }

        // --- 3. DECISION & STABILITY ---
        const targetBitrate = Math.min(peerCapBitrate, networkCapBitrate);

        // Debug Log (Optional)
        // console.log(`[BW] Peers: ${peerCount}, RTT: ${maxRTT}, Target: ${targetBitrate}, Curr: ${this.currentBitrate}`);

        // Hysteresis Logic to prevent flapping
        if (targetBitrate < this.currentBitrate) {
            this.badSampleCount++;
            this.goodSampleCount = 0;
            // Düşürürken 2 yerine 3 örnek bekleyelim (daha toleranslı)
            if (this.badSampleCount >= 3) {
                this.applyBitrate(targetBitrate);
            }
        } else if (targetBitrate > this.currentBitrate) {
            this.goodSampleCount++;
            this.badSampleCount = 0;
            // Yükseltirken 5 yerine 6 örnek bekleyelim
            if (this.goodSampleCount >= 6) {
                this.applyBitrate(targetBitrate);
            }
        } else {
            this.badSampleCount = 0;
            this.goodSampleCount = 0;
            // Hedef ve mevcut aynı olsa bile, 
            // yeni gelen peerlar için applyBitrate'i yine de çağırıyoruz
            // (fakat içinde cooldown kontrolü yapacağız)
            this.applyBitrate(this.currentBitrate);
        }

        // Call UI update if exists
        if (window.updateNetworkStats) {
            window.updateNetworkStats({
                bitrate: this.currentBitrate,
                rtt: maxRTT,
                packetLoss: (lossRate * 100),
                peers: peerCount
            });
        }
    }

    applyBitrate(bitrate) {
        const now = Date.now();
        // Eğer bitrate değişecekse ve son değişimden bu yana 5 saniye geçmediyse bekle
        if (this.currentBitrate !== bitrate && (now - this.lastChangeTime < 5000)) {
            return;
        }

        // Asıl değişim
        const oldBitrate = this.currentBitrate;
        this.currentBitrate = bitrate;

        if (this.currentBitrate !== oldBitrate) {
            this.lastChangeTime = now;
            console.log(`[BandwidthManager] Bitrate Changed: ${oldBitrate} -> ${this.currentBitrate}`);
        }

        let anyChange = false;

        for (const id in state.peers) {
            const peer = state.peers[id];

            // Safety checks
            if (!peer || !peer._pc) continue;
            if (peer._pc.connectionState === 'closed' || peer._pc.connectionState === 'failed') continue;

            const senders = peer._pc.getSenders();
            const audioSender = senders.find(s => s.track && s.track.kind === 'audio');

            if (audioSender && audioSender.track && audioSender.track.readyState === 'live') {
                try {
                    const params = audioSender.getParameters();
                    if (!params.encodings) params.encodings = [{}];

                    // Skip if already set to target
                    const currentMax = params.encodings[0].maxBitrate;
                    if (currentMax === bitrate) continue;

                    params.encodings[0].maxBitrate = bitrate;

                    audioSender.setParameters(params)
                        .catch(err => console.warn(`[BandwidthManager] Failed to set bitrate for ${id}:`, err));

                    anyChange = true;

                } catch (e) {
                    console.warn(`[BandwidthManager] Error applying bitrate for ${id}:`, e);
                }
            }
        }

        // --- AUDIO ENGINE KICKSTART ---
        // Bitrate değişimi sonrası sesin kesilmesini önlemek için gain nodunu dürtüyoruz.
        // [OPTIMIZED]: continuous loop yerine event bazlı tetikleme.
        if (anyChange) {
            // Lazy require to avoid circular dependency issues at top level if any
            // though index.js manages imports well.
            try {
                const audioEngine = require('../audio/audioEngine');
                // 2 saniye sonra dürt, codec/network otursun
                setTimeout(() => {
                    audioEngine.nudgeAllPeers();
                }, 2000);
            } catch (e) {
                console.error("[BandwidthManager] Audio Engine trigger failed:", e);
            }
        }
    }
}

module.exports = new BandwidthManager();
