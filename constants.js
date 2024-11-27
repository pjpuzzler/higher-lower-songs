const REDIRECT_URI = "https://pjpuzzler.github.io/higher-lower-songs/",
    CLIENT_ID = "6c9b289ebbd5473386d8d57b570dea4e",
    SCOPES = [
        "user-library-read",
        "user-library-modify",
        "playlist-read-private",
        "user-top-read",
        // "user-read-private",
        // "user-read-email",
        "user-follow-read",
        "user-follow-modify",
    ],
    CORRECT_SFX = new Audio("sounds/correct.wav"),
    GAME_OVER_SFX = new Audio("sounds/game-over.wav"),
    STREAK_BONUS_SFX = new Audio("sounds/streak-bonus.wav"),
    LOST_LIFE_SFX = new Audio("sounds/lost-life.wav"),
    GOLD_APPEAR_SFX = new Audio("sounds/gold-appear.wav"),
    GAIN_LIFE_SFX = new Audio("sounds/gain-life.wav"),
    CURR_YEAR = new Date().getFullYear(),
    ALBUM_ARTIST_PLAYLIST_URI_REGEX =
        /^spotify:(album|artist|playlist):[a-zA-Z0-9]{22}$/,
    ARTIST_URI_REGEX = /^spotify:artist:[a-zA-Z0-9]{22}$/,
    DEFAULT_VOLUME = 2 / 3,
    NUM_LIVES = 3,
    GOLDEN_CHANCE = 0.025,
    SAMPLE_DURATION = 30,
    SAMPLE_FADE_DURATION = 2,
    POPULARITY_ANIMATION_DURATION = 0.75,
    STREAK_ANIMATION_DURATION = 0.25,
    SHOW_POPULARITY_DURATION = 0.75,
    MARQUEE_PAUSE_DURATION = 1.75,
    SLIDE_HALVES_DURATION = 1,
    STREAK_LENGTH = 7,
    MIN_POPULARITY_RANGE = 20,
    POPULAR_GENRE_MIN_POPULARITY = 34,
    DEFAULT_MODE = "songs",
    DEFAULT_PARAMS = {
        songs: {
            difficulty: "medium",
            query: {
                genre: "",
                year: "",
            },
            use: "search",
            userPlaylistId: "",
            uri: "",
            uriSearch: {
                q: "",
                type: "artist",
            },
        },
        albums: {
            query: {
                year: "",
            },
            use: "search",
            uri: "",
            uriSearch: {
                q: "",
            },
        },
        artists: {
            query: {
                genre: "",
                year: "",
            },
            use: "search",
        },

        hardcore: false,
        hidePopularity: false,
        soundOnly: false,
        zen: false,

        muteExplicit: false,
        playSFX: true,
    },
    GENRE_DIFFICULTY_POPULARITIES = {
        acoustic: { high: 0, medium: 35, low: 61 },
        afrobeat: { high: 0, medium: 16, low: 37 },
        "alt-rock": { high: 0, medium: 39, low: 68 },
        alternative: { high: 0, medium: 61, low: 74 },
        ambient: { high: 0, medium: 24, low: 49 },
        anime: { high: 0, medium: 3, low: 13 },
        "black-metal": { high: 0, medium: 0, low: 31 },
        bluegrass: { high: 0, medium: 22, low: 39 },
        blues: { high: 0, medium: 25, low: 47 },
        bossanova: { high: 0, medium: 0, low: 18 },
        brazil: { high: 0, medium: 48, low: 66 },
        breakbeat: { high: 0, medium: 10, low: 41 },
        british: { high: 0, medium: 47, low: 70 },
        cantopop: { high: 1, medium: 23, low: 41 },
        "chicago-house": { high: 0, medium: 5, low: 39 },
        children: { high: 0, medium: 50, low: 74 },
        chill: { high: 0, medium: 64, low: 79 },
        classical: { high: 1, medium: 20, low: 37 },
        club: { high: 0, medium: 52, low: 70 },
        comedy: { high: 0, medium: 0, low: 19 },
        country: { high: 45, medium: 61, low: 70 },
        dance: { high: 0, medium: 25, low: 57 },
        dancehall: { high: 0, medium: 0, low: 40 },
        "death-metal": { high: 0, medium: 30, low: 44 },
        "deep-house": { high: 0, medium: 17, low: 48 },
        "detroit-techno": { high: 0, medium: 0, low: 15 },
        disco: { high: 0, medium: 49, low: 78 },
        disney: { high: 29, medium: 40, low: 54 },
        "drum-and-bass": { high: 0, medium: 0, low: 25 },
        dub: { high: 0, medium: 9, low: 48 },
        dubstep: { high: 0, medium: 12, low: 39 },
        edm: { high: 0, medium: 27, low: 53 },
        electro: { high: 0, medium: 38, low: 58 },
        electronic: { high: 0, medium: 21, low: 55 },
        emo: { high: 0, medium: 54, low: 66 },
        folk: { high: 0, medium: 2, low: 52 },
        forro: { high: 0, medium: 0, low: 19 },
        french: { high: 0, medium: 32, low: 59 },
        funk: { high: 0, medium: 40, low: 61 },
        garage: { high: 0, medium: 9, low: 63 },
        german: { high: 0, medium: 25, low: 57 },
        gospel: { high: 10, medium: 31, low: 45 },
        goth: { high: 0, medium: 0, low: 38 },
        grindcore: { high: 7, medium: 20, low: 28 },
        groove: { high: 0, medium: 22, low: 65 },
        grunge: { high: 0, medium: 40, low: 54 },
        guitar: { high: 0, medium: 40, low: 70 },
        happy: { high: 0, medium: 61, low: 82 },
        "hard-rock": { high: 0, medium: 35, low: 70 },
        hardcore: { high: 0, medium: 12, low: 35 },
        hardstyle: { high: 5, medium: 15, low: 23 },
        "heavy-metal": { high: 0, medium: 0, low: 49 },
        "hip-hop": { high: 53, medium: 63, low: 76 },
        holidays: { high: 0, medium: 7, low: 26 },
        "honky-tonk": { high: 13, medium: 53, low: 67 },
        house: { high: 0, medium: 21, low: 55 },
        idm: { high: 0, medium: 0, low: 4 },
        indian: { high: 0, medium: 30, low: 59 },
        indie: { high: 0, medium: 52, low: 69 },
        "indie-pop": { high: 0, medium: 53, low: 78 },
        industrial: { high: 0, medium: 20, low: 45 },
        iranian: { high: 7, medium: 26, low: 38 },
        "j-dance": { high: 0, medium: 7, low: 22 },
        "j-idol": { high: 0, medium: 2, low: 18 },
        "j-pop": { high: 0, medium: 8, low: 35 },
        "j-rock": { high: 0, medium: 14, low: 39 },
        jazz: { high: 6, medium: 32, low: 56 },
        "k-pop": { high: 0, medium: 0, low: 0 },
        kids: { high: 0, medium: 8, low: 40 },
        latin: { high: 46, medium: 64, low: 76 },
        latino: { high: 21, medium: 58, low: 74 },
        malay: { high: 0, medium: 23, low: 51 },
        mandopop: { high: 0, medium: 21, low: 49 },
        metal: { high: 0, medium: 10, low: 66 },
        "metal-misc": { high: 0, medium: 10, low: 66 },
        metalcore: { high: 0, medium: 33, low: 51 },
        "minimal-techno": { high: 0, medium: 0, low: 17 },
        movies: { high: 26, medium: 46, low: 60 },
        mpb: { high: 2, medium: 16, low: 30 },
        "new-age": { high: 0, medium: 22, low: 51 },
        "new-release": { high: 0, medium: 8, low: 28 },
        opera: { high: 0, medium: 18, low: 34 },
        pagode: { high: 0, medium: 14, low: 31 },
        party: { high: 0, medium: 51, low: 71 },
        "philippines-opm": { high: 0, medium: 0, low: 51 },
        piano: { high: 0, medium: 28, low: 54 },
        pop: { high: 61, medium: 73, low: 85 },
        "pop-film": { high: 0, medium: 43, low: 67 },
        "post-dubstep": { high: 0, medium: 0, low: 6 },
        "power-pop": { high: 0, medium: 2, low: 39 },
        "progressive-house": { high: 0, medium: 0, low: 40 },
        "psych-rock": { high: 0, medium: 0, low: 41 },
        punk: { high: 0, medium: 32, low: 53 },
        "punk-rock": { high: 0, medium: 52, low: 73 },
        "r-n-b": { high: 37, medium: 62, low: 74 },
        "rainy-day": { high: 0, medium: 62, low: 79 },
        reggae: { high: 0, medium: 3, low: 52 },
        reggaeton: { high: 0, medium: 36, low: 60 },
        "road-trip": { high: 0, medium: 64, low: 82 },
        rock: { high: 53, medium: 75, low: 82 },
        "rock-n-roll": { high: 0, medium: 47, low: 73 },
        rockabilly: { high: 0, medium: 13, low: 35 },
        romance: { high: 0, medium: 64, low: 80 },
        sad: { high: 0, medium: 64, low: 79 },
        salsa: { high: 0, medium: 35, low: 52 },
        samba: { high: 0, medium: 4, low: 34 },
        sertanejo: { high: 0, medium: 12, low: 36 },
        "show-tunes": { high: 0, medium: 37, low: 56 },
        "singer-songwriter": { high: 0, medium: 50, low: 68 },
        ska: { high: 0, medium: 5, low: 31 },
        sleep: { high: 0, medium: 59, low: 72 },
        songwriter: { high: 0, medium: 29, low: 62 },
        soul: { high: 0, medium: 48, low: 71 },
        soundtracks: { high: 30, medium: 46, low: 58 },
        spanish: { high: 2, medium: 58, low: 71 },
        study: { high: 0, medium: 56, low: 77 },
        summer: { high: 0, medium: 62, low: 82 },
        swedish: { high: 20, medium: 36, low: 48 },
        "synth-pop": { high: 22, medium: 59, low: 77 },
        tango: { high: 0, medium: 14, low: 33 },
        techno: { high: 0, medium: 39, low: 59 },
        trance: { high: 0, medium: 13, low: 36 },
        "trip-hop": { high: 0, medium: 17, low: 32 },
        turkish: { high: 0, medium: 53, low: 68 },
        "work-out": { high: 0, medium: 60, low: 79 },
        "world-music": { high: 0, medium: 11, low: 28 },
    };
