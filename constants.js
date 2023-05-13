const REDIRECT_URI =
        // "https://pjpuzzler.github.io/higher-lower-songs/",
        "http://192.168.68.103:5500/",
    CLIENT_ID = "32b5db6ab5bc4a64bf2b230b131120dc",
    SCOPES = [
        "user-library-read",
        "user-library-modify",
        "playlist-read-private",
        "user-top-read",
        "user-read-private",
        "user-read-email",
    ],
    CORRECT_SFX = new Audio("sounds/correct.mp3"),
    GAME_OVER_SFX = new Audio("sounds/game-over.mp3"),
    CURR_YEAR = new Date().getFullYear(),
    MAX_VOLUME = 1,
    DEFAULT_VOLUME = (2 / 3) * MAX_VOLUME,
    SAMPLE_DURATION = 30,
    SAMPLE_FADE_DURATION = 2,
    POPULARITY_ANIMATION_DURATION = 0.75,
    SHOW_POPULARITY_DURATION = 1,
    MARQUEE_PAUSE_DURATION = 1.75,
    SLIDE_HALVES_DURATION = 1,
    DEFAULT_PARAMS = {
        albumPlaylistURI: "",
        featuredPlaylistId: "",
        hidePopularity: false,
        maxSearchResults: 1000,
        muteExplicit: false,
        query: {
            genre: "",
            year: `${CURR_YEAR - 10}-${CURR_YEAR}`,
        },
        soundOnly: false,
        use: "search",
        userPlaylistId: "",
    };
