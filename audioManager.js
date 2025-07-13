export function createAudioManager(initialVolume = 0.5) {
    let ctx = null;
    let gainNode = null;
    let source = null;

    function initContext() {
        if (!ctx || ctx.state === 'closed') {
            ctx = new AudioContext();
        }
    }

    async function decodeAudio(path) {
        initContext();
        const response = await fetch(path);
        const buffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(buffer);
    }

    function play(buffer, { volume = initialVolume, timestamp = 0, duration = undefined } = {}) {
        if (!ctx || !buffer) return;

        gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.connect(ctx.destination);

        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        source.start(ctx.currentTime, timestamp, duration);

        return source;
    }

    function stop() {
        if (source) {
            source.stop();
            source.disconnect();
            source = null;
        }
    }

    function setVolume(volume) {
        if (gainNode) {
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        }
    }

    function closeContext() {
        if (ctx) {
            ctx.close();
        }
    }

    return {
        decodeAudio,
        play,
        stop,
        setVolume,
        closeContext
    };
}
