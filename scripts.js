import { createAudioManager } from './audioManager.js';

const { createApp } = Vue;

createApp({
    data() {
        return {
            songData: {},
            current: {},
            finished: [],
            isAsking: false,
            isLoading: false,
            isPlaying: false,
            curVolume: 50,
            debugEnabled: false,
            delayResult: 0,
            durations: [0.5, 0.75, 1.0, 2.0],
        };
    },
    created() {
        this.audio = createAudioManager(0.5);
        this.currentSource = null;

        fetch("./songlist.json")
            .then(res => res.ok ? res.json() : Promise.reject(`HTTP error: ${res.status}`))
            .then(data => {
                this.songData = data;
                this.debugEnabled = data.debugMode ?? false;
                this.delayResult = data.delayResult ?? 0;
            })
            .catch(error => console.error("Unable to fetch data:", error));
    },
    watch: {
        curVolume(val) {
            this.audio.setVolume(val / 100);
        }
    },
    computed: {
        catList() {
            return this.songData.cats?.map(obj => ({
                name: obj.name,
                count: obj.songs.length
            })) ?? [];
        },
        curSongName() {
            const { current, isAsking } = this;

            return current?.name
                ? ( isAsking ? `[${current.catname}] ???` : current.name )
                : "Hang tight!";
        },
        noSongLoaded() {
            return this.isLoading || !this.current.catname;
        }
    },
    methods: {
        getSong(i, j) {
            if (!this.isAsking) {
                if (this.isPlaying) {
                    this.audio.stop();
                    this.audio.closeContext();
                    this.isPlaying = false;
                }
                this.loadSong(i, j);
            }
        },
        revealSong() {
            if (this.isAsking && !this.isPlaying) {
                this.playSong();
                setTimeout(() => {
                    this.isAsking = false;
                    this.finished.push(this.current);
                }, this.delayResult);
            }
        },
        playSong(time, beginning = false) {
            if (this.isPlaying || !this.current.audio) return;

            this.currentSource = this.audio.play(this.current.audio, {
                volume: this.curVolume / 100,
                timestamp: beginning ? 0 : this.current.timestamp,
                duration: time
            });

            if (this.currentSource) {
                this.currentSource.onended = () => {
                    this.isPlaying = false;
                };
                this.isPlaying = true;
            }
        },
        async loadSong(i, j) {
            const songs = this.songData.cats[i].songs;
            if (!songs.length || this.isAsking) return;

            this.isAsking = true;
            this.current = j === undefined ? songs.splice(Math.floor(Math.random() * songs.length), 1)[0] : songs[j];
            this.current.catname = this.songData.cats[i].name;

            this.isLoading = true;
            
            try {
                this.current.audio = await this.audio.decodeAudio(`${this.songData.path}/${this.current.src}`);
                this.isLoading = false;
            } catch (error) {
                console.error("Unable to load audio:", error);
                this.isLoading = false;
            }
        },
        toggleSong() {
            if (this.isPlaying) {
                this.audio.stop();
                this.isPlaying = false;
            } else {
                this.playSong(undefined, true);
            }
        }
    }
}).mount('#app');