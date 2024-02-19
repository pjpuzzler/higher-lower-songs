const REDIRECT_URI = "https://pjpuzzler.github.io/higher-lower-songs/",
    CLIENT_ID = "9507198bd0894c0d854cef4bb6cbc48a",
    CLIENT_SECRET = "01cad5820f4846bf9f05bf6809480176",
    SCOPES = [
        "user-library-read",
        "user-library-modify",
        "playlist-read-private",
        "user-top-read",
        "user-read-private",
        "user-read-email",
        "user-follow-read",
        "user-follow-modify",
    ],
    CORRECT_SFX = new Audio("sounds/correct.wav"),
    GAME_OVER_SFX = new Audio("sounds/game-over.wav"),
    GAIN_LIFE_SFX = new Audio("sounds/gain-life.wav"),
    LOST_LIFE_SFX = new Audio("sounds/lost-life.wav"),
    CURR_YEAR = new Date().getFullYear(),
    ALBUM_ARTIST_PLAYLIST_URI_REGEX =
        /^spotify:(album|artist|playlist):[a-zA-Z0-9]{22}$/,
    ARTIST_URI_REGEX = /^spotify:artist:[a-zA-Z0-9]{22}$/,
    DEFAULT_VOLUME = 2 / 3,
    SAMPLE_DURATION = 30,
    SAMPLE_FADE_DURATION = 2,
    POPULARITY_ANIMATION_DURATION = 1,
    STREAK_ANIMATION_DURATION = 0.25,
    SHOW_POPULARITY_DURATION = 1,
    MARQUEE_PAUSE_DURATION = 1.75,
    SLIDE_HALVES_DURATION = 1,
    STREAK_LENGTH = 10,
    MIN_POPULARITY_RANGE = 20,
    DEFAULT_MODE = "songs",
    DEFAULT_PARAMS = {
        songs: {
            featuredPlaylistId: "",
            // maxSearchResults: 1000,
            popularityRange: "high",
            query: {
                genre: "",
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
            // maxSearchResults: 500,
            popularityRange: "all",
            query: {
                year: `${CURR_YEAR - 10}-${CURR_YEAR}`,
            },
            use: "search",
            uri: "",
            uriSearch: {
                q: "",
            },
        },
        artists: {
            // maxSearchResults: 250,
            popularityRange: "all",
            query: {
                genre: "",
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
    GENRE_MIN_POPULARITIES = {
        acoustic: { high: 61, medium: 35, low: 0 },
        afrobeat: { high: 37, medium: 16, low: 0 },
        "alt-rock": { high: 68, medium: 39, low: 0 },
        alternative: { high: 74, medium: 61, low: 0 },
        ambient: { high: 49, medium: 24, low: 0 },
        anime: { high: 13, medium: 3, low: 0 },
        "black-metal": { high: 31, medium: 0, low: 0 },
        bluegrass: { high: 39, medium: 22, low: 0 },
        blues: { high: 47, medium: 25, low: 0 },
        bossanova: { high: 18, medium: 0, low: 0 },
        brazil: { high: 66, medium: 48, low: 0 },
        breakbeat: { high: 41, medium: 10, low: 0 },
        british: { high: 70, medium: 47, low: 0 },
        cantopop: { high: 41, medium: 23, low: 1 },
        "chicago-house": { high: 39, medium: 5, low: 0 },
        children: { high: 74, medium: 50, low: 0 },
        chill: { high: 79, medium: 64, low: 0 },
        classical: { high: 37, medium: 20, low: 1 },
        club: { high: 70, medium: 52, low: 0 },
        comedy: { high: 19, medium: 0, low: 0 },
        country: { high: 70, medium: 61, low: 45 },
        dance: { high: 57, medium: 25, low: 0 },
        dancehall: { high: 40, medium: 0, low: 0 },
        "death-metal": { high: 44, medium: 30, low: 0 },
        "deep-house": { high: 48, medium: 17, low: 0 },
        "detroit-techno": { high: 15, medium: 0, low: 0 },
        disco: { high: 78, medium: 49, low: 0 },
        disney: { high: 54, medium: 40, low: 29 },
        "drum-and-bass": { high: 25, medium: 0, low: 0 },
        dub: { high: 48, medium: 9, low: 0 },
        dubstep: { high: 39, medium: 12, low: 0 },
        edm: { high: 53, medium: 27, low: 0 },
        electro: { high: 58, medium: 38, low: 0 },
        electronic: { high: 55, medium: 21, low: 0 },
        emo: { high: 66, medium: 54, low: 0 },
        folk: { high: 52, medium: 2, low: 0 },
        forro: { high: 19, medium: 0, low: 0 },
        french: { high: 59, medium: 32, low: 0 },
        funk: { high: 61, medium: 40, low: 0 },
        garage: { high: 63, medium: 9, low: 0 },
        german: { high: 57, medium: 25, low: 0 },
        gospel: { high: 45, medium: 31, low: 10 },
        goth: { high: 38, medium: 0, low: 0 },
        grindcore: { high: 28, medium: 20, low: 7 },
        groove: { high: 65, medium: 22, low: 0 },
        grunge: { high: 54, medium: 40, low: 0 },
        guitar: { high: 70, medium: 40, low: 0 },
        happy: { high: 82, medium: 61, low: 0 },
        "hard-rock": { high: 70, medium: 35, low: 0 },
        hardcore: { high: 35, medium: 12, low: 0 },
        hardstyle: { high: 23, medium: 15, low: 5 },
        "heavy-metal": { high: 49, medium: 0, low: 0 },
        "hip-hop": { high: 76, medium: 63, low: 53 },
        holidays: { high: 26, medium: 7, low: 0 },
        "honky-tonk": { high: 67, medium: 53, low: 13 },
        house: { high: 55, medium: 21, low: 0 },
        idm: { high: 4, medium: 0, low: 0 },
        indian: { high: 59, medium: 30, low: 0 },
        indie: { high: 69, medium: 52, low: 0 },
        "indie-pop": { high: 78, medium: 53, low: 0 },
        industrial: { high: 45, medium: 20, low: 0 },
        iranian: { high: 38, medium: 26, low: 7 },
        "j-dance": { high: 22, medium: 7, low: 0 },
        "j-idol": { high: 18, medium: 2, low: 0 },
        "j-pop": { high: 35, medium: 8, low: 0 },
        "j-rock": { high: 39, medium: 14, low: 0 },
        jazz: { high: 56, medium: 32, low: 6 },
        "k-pop": { high: 0, medium: 0, low: 0 },
        kids: { high: 40, medium: 8, low: 0 },
        latin: { high: 76, medium: 64, low: 46 },
        latino: { high: 74, medium: 58, low: 21 },
        malay: { high: 51, medium: 23, low: 0 },
        mandopop: { high: 49, medium: 21, low: 0 },
        metal: { high: 66, medium: 10, low: 0 },
        "metal-misc": { high: 66, medium: 10, low: 0 },
        metalcore: { high: 51, medium: 33, low: 0 },
        "minimal-techno": { high: 17, medium: 0, low: 0 },
        movies: { high: 60, medium: 46, low: 26 },
        mpb: { high: 30, medium: 16, low: 2 },
        "new-age": { high: 51, medium: 22, low: 0 },
        "new-release": { high: 28, medium: 8, low: 0 },
        opera: { high: 34, medium: 18, low: 0 },
        pagode: { high: 31, medium: 14, low: 0 },
        party: { high: 71, medium: 51, low: 0 },
        "philippines-opm": { high: 51, medium: 0, low: 0 },
        piano: { high: 54, medium: 28, low: 0 },
        pop: { high: 85, medium: 73, low: 61 },
        "pop-film": { high: 67, medium: 43, low: 0 },
        "post-dubstep": { high: 6, medium: 0, low: 0 },
        "power-pop": { high: 39, medium: 2, low: 0 },
        "progressive-house": { high: 40, medium: 0, low: 0 },
        "psych-rock": { high: 41, medium: 0, low: 0 },
        punk: { high: 53, medium: 32, low: 0 },
        "punk-rock": { high: 73, medium: 52, low: 0 },
        "r-n-b": { high: 74, medium: 62, low: 37 },
        "rainy-day": { high: 79, medium: 62, low: 0 },
        reggae: { high: 52, medium: 3, low: 0 },
        reggaeton: { high: 60, medium: 36, low: 0 },
        "road-trip": { high: 82, medium: 64, low: 0 },
        rock: { high: 82, medium: 75, low: 53 },
        "rock-n-roll": { high: 73, medium: 47, low: 0 },
        rockabilly: { high: 35, medium: 13, low: 0 },
        romance: { high: 80, medium: 64, low: 0 },
        sad: { high: 79, medium: 64, low: 0 },
        salsa: { high: 52, medium: 35, low: 0 },
        samba: { high: 34, medium: 4, low: 0 },
        sertanejo: { high: 36, medium: 12, low: 0 },
        "show-tunes": { high: 56, medium: 37, low: 0 },
        "singer-songwriter": { high: 68, medium: 50, low: 0 },
        ska: { high: 31, medium: 5, low: 0 },
        sleep: { high: 72, medium: 59, low: 0 },
        songwriter: { high: 62, medium: 29, low: 0 },
        soul: { high: 71, medium: 48, low: 0 },
        soundtracks: { high: 58, medium: 46, low: 30 },
        spanish: { high: 71, medium: 58, low: 2 },
        study: { high: 77, medium: 56, low: 0 },
        summer: { high: 82, medium: 62, low: 0 },
        swedish: { high: 48, medium: 36, low: 20 },
        "synth-pop": { high: 77, medium: 59, low: 22 },
        tango: { high: 33, medium: 14, low: 0 },
        techno: { high: 59, medium: 39, low: 0 },
        trance: { high: 36, medium: 13, low: 0 },
        "trip-hop": { high: 32, medium: 17, low: 0 },
        turkish: { high: 68, medium: 53, low: 0 },
        "work-out": { high: 79, medium: 60, low: 0 },
        "world-music": { high: 28, medium: 11, low: 0 },
    };
