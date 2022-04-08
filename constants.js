const REDIRECT_URIS = [
        "http://192.168.68.123:5500",
        "http://129.21.125.207:5500",
    ],
    REDIRECT_URI = REDIRECT_URIS[1],
    CLIENT_ID = "32b5db6ab5bc4a64bf2b230b131120dc",
    SCOPES = [
        "user-library-read",
        "user-library-modify",
        "playlist-read-private",
    ],
    CURR_YEAR = new Date().getFullYear(),
    SAMPLE_DURATION = 30,
    SAMPLE_FADE_DURATION = 2,
    POPULARITY_ANIMATION_DURATION = 1.25,
    SHOW_POPULARITY_DURATION = 1,
    POPULARITY_ANIMATION_STEP_DURATION = 0.001,
    SCROLL_PAUSE_DURATION = 1.25,
    SLIDE_HALVES_DURATION = 1,
    DEFAULT_PARAMS = {
        maxSearchResults: 1000,
        muteExplicit: false,
        playlistId: "",
        query: {
            album: "",
            artist: "",
            genre: "",
            track: "",
            year: `${CURR_YEAR - 10}-${CURR_YEAR}`,
        },
        use: "search",
        userPlaylistId: "",
    };
