const { createApp, ref } = Vue;
let ctx;
let gainNode;
let playSound;

const songfile = "./songlist.json";
const noSongText = "Hang tight!";

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
            durations: [0.5, 0.75, 1.0, 2.0]
        };
    },
    created() {
        // Get config
        fetch(songfile)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error: ${res.status}`)
                }
                return res.json();
            })
            .then((data) => {
                this.songData = data;
                this.debugEnabled = typeof data.debugMode !== 'undefined' ? data.debugMode : false;
                this.durations = typeof data.durations !== 'undefined' ? data.durations : [1.0, 2.0, 3.0];
                this.delayResult = typeof data.delayResult !== 'undefined' ? data.delayResult : 0;
            })
            .catch((error) =>
                console.error("Unable to fetch data:", error));
    },
    watch: {
        curVolume(val) {
            if (typeof gainNode !== 'undefined') {
                gainNode.gain.value = val / 100;
            }
        }
    },
    computed: {
        catList() {
            return (typeof this.songData.cats !== 'undefined') ? this.songData.cats.map((obj) => {
                return {
                    name: obj.name,
                    count: obj.songs.length
                }
            }) : [];
        },
        curSongName() {
            if (typeof this.current.name === 'undefined') {
                return noSongText;
            }

            return (this.isAsking) ? '[' + this.current.catname + '] ???' : this.current.name;
        },
        noSongLoaded() {
            return this.isLoading || typeof this.current.catname === 'undefined';
        },
        revealedSongs() {
            return this.isAsking ? this.finished.filter((song) => song.revealed) : this.finished
        }
    },
    methods: {
        getSong(i, j) {
            if (!this.isAsking) {
                if (this.isPlaying) {
                    ctx.close().then(() => this.loadSong(i, j));
                    this.isPlaying = false;
                }
                else {
                    this.loadSong(i, j);
                }
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
        playSong(time, beginning) {
            if (!this.isPlaying) {
                beginning = typeof beginning === 'undefined' ? false : beginning;
                gainNode = ctx.createGain();
                gainNode.connect(ctx.destination);
                gainNode.gain.value = this.curVolume / 100;

                playSound = ctx.createBufferSource();
                playSound.buffer = this.current.audio;
                playSound.connect(gainNode);
                playSound.onended = () => {
                    this.isPlaying = false;
                };
                playSound.start(ctx.currentTime, (beginning) ? 0 : this.current.timestamp, time);
                this.isPlaying = true;
            }
        },
        loadSong(i, j) {
            let songs = this.songData.cats[i].songs;

            if (songs.length > 0 && !this.isAsking) {
                this.isAsking = true;

                if (typeof j === 'undefined') {
                    this.current = songs.splice(Math.floor(Math.random() * songs.length), 1)[0];
                }
                else {
                    this.current = songs[j];
                }
                this.current.catname = this.songData.cats[i].name;

                if (!ctx || ctx.state === 'closed') {
                    ctx = new AudioContext();
                }
                this.isLoading = true;
                fetch(this.songData.path + "/" + this.current.src)
                    .then(data => data.arrayBuffer())
                    .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
                    .then(decodedAudio => {
                        this.current.audio = decodedAudio;
                        this.isLoading = false;
                    })
                    .catch((error) =>
                        console.error("Unable to fetch data:", error));
            }
        },
        toggleSong() {
            if (typeof playSound !== 'undefined') {
                if (this.isPlaying) {
                    playSound.stop();
                }
                else {
                    this.playSong(undefined, true);
                }
            }
        }
    }
}).mount('#app');
