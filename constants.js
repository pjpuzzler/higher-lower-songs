const REDIRECT_URI = "https://pjpuzzler.github.io/higher-lower-songs/",
    CLIENT_ID = "32b5db6ab5bc4a64bf2b230b131120dc",
    CLIENT_SECRET = "bc51adb8708c461eb49c5a93bc0dcb5b",
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
    ALBUM_PLAYLIST_URI_REGEX = /^spotify:(album|playlist):[a-zA-Z0-9]{22}$/,
    ARTIST_URI_REGEX = /^spotify:artist:[a-zA-Z0-9]{22}$/,
    DEFAULT_VOLUME = 2 / 3,
    SAMPLE_DURATION = 30,
    SAMPLE_FADE_DURATION = 2,
    POPULARITY_ANIMATION_DURATION = 1,
    SHOW_POPULARITY_DURATION = 1,
    MARQUEE_PAUSE_DURATION = 1.75,
    SLIDE_HALVES_DURATION = 1,
    DEFAULT_MODE = "songs",
    DEFAULT_PARAMS = {
        songs: {
            featuredPlaylistId: "",
            hidePopularity: false,
            maxSearchResults: 1000,
            query: {
                genre: "",
                year: `${CURR_YEAR - 10}-${CURR_YEAR}`,
            },
            soundOnly: false,
            use: "search",
            userPlaylistId: "",
            uri: "",
        },
        albums: {
            hidePopularity: false,
            maxSearchResults: 500,
            query: {
                year: `${CURR_YEAR - 10}-${CURR_YEAR}`,
            },
            soundOnly: false,
            use: "search",
            uri: "",
        },
        artists: {
            hidePopularity: false,
            maxSearchResults: 100,
            query: {
                genre: "",
            },
            soundOnly: false,
            use: "search",
        },

        muteExplicit: false,
        playSFX: true,
    };
