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
    DEFAULT_MODE = "songs",
    DEFAULT_PARAMS = {
        songs: {
            featuredPlaylistId: "",
            // maxSearchResults: 1000,
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
    };
