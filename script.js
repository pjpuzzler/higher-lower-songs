const hash = window.location.hash
    .substring(1)
    .split("&")
    .reduce((initial, item) => {
        if (item) {
            const parts = item.split("=");

            initial[parts[0]] = decodeURIComponent(parts[1]);
        }
        return initial;
    }, {});

window.location.hash = "";

let _token = hash.access_token,
    signedIn = true;

if (!_token && localStorage.getItem("signed_in") === "true") {
    localStorage.setItem("signed_in", false);
    signIn();
}

window.onresize = () => {
    if (document.getElementsByTagName("body")[0].className !== "adaptive")
        return;

    updateMarquees(1);
    updateMarquees(2);
};

const load = async () => {
    updatePlayValidity(true);

    mode = localStorage.getItem("mode") ?? DEFAULT_MODE;
    params = JSON.parse(localStorage.getItem("params")) ?? DEFAULT_PARAMS;

    updateParamValidity();

    const elUserImageContainer = document.getElementById(
            "user_image_container"
        ),
        elUserAction = document.getElementById("user_action");

    if (signedIn) {
        try {
            userData = await getUserData();
        } catch (e) {
            if (e.status === 403)
                alert(
                    "Account must be registered with the owner of this website. Sign in failed."
                );
            else alert("Error getting user data");

            signOut();
            return;
        }

        elUserImageContainer.style.display = "flex";
        elUserImageContainer.innerHTML = userData.images.length
            ? `<img id="user_image" src="${userData.images[0].url}" />`
            : '<svg id="default_user_image" viewBox="0 0 18 20"><path d="M15.216 13.717L12 11.869C11.823 11.768 11.772 11.607 11.757 11.521C11.742 11.435 11.737 11.267 11.869 11.111L13.18 9.57401C14.031 8.58001 14.5 7.31101 14.5 6.00001V5.50001C14.5 3.98501 13.866 2.52301 12.761 1.48601C11.64 0.435011 10.173 -0.0879888 8.636 0.0110112C5.756 0.198011 3.501 2.68401 3.501 5.67101V6.00001C3.501 7.31101 3.97 8.58001 4.82 9.57401L6.131 11.111C6.264 11.266 6.258 11.434 6.243 11.521C6.228 11.607 6.177 11.768 5.999 11.869L2.786 13.716C1.067 14.692 0 16.526 0 18.501V20H1V18.501C1 16.885 1.874 15.385 3.283 14.584L6.498 12.736C6.886 12.513 7.152 12.132 7.228 11.691C7.304 11.251 7.182 10.802 6.891 10.462L5.579 8.92501C4.883 8.11101 4.499 7.07201 4.499 6.00001V5.67101C4.499 3.21001 6.344 1.16201 8.699 1.00901C9.961 0.928011 11.159 1.35601 12.076 2.21501C12.994 3.07601 13.5 4.24301 13.5 5.50001V6.00001C13.5 7.07201 13.117 8.11101 12.42 8.92501L11.109 10.462C10.819 10.803 10.696 11.251 10.772 11.691C10.849 12.132 11.115 12.513 11.503 12.736L14.721 14.585C16.127 15.384 17.001 16.884 17.001 18.501V20H18.001V18.501C18 16.526 16.932 14.692 15.216 13.717Z"></path></svg>';
        document.getElementById("user_display_name").innerText =
            userData.display_name;

        window
            .getHighScores(userData.id)
            .then((data) => {
                setHighScores(data);

                window.firestoreListen(userData.id, setHighScores);
            })
            .catch(() => {
                alert("Error getting high scores");
            });

        window.userExists(userData.id).then((exists) => {
            if (!exists) {
                window.createNewUser(userData.id).catch(() => {
                    alert("Error creating new user");
                });
            }
        });

        elUserAction.innerText = "Sign out";
        elUserAction.onclick = signOut;
        document.getElementById("sign_in_tutorial").style.display = "none";
    } else {
        setHighScores(JSON.parse(localStorage.getItem("high_scores")) ?? {});

        elUserAction.innerText = "Sign in with Spotify";
        elUserAction.style.top = "4dvh";
        elUserAction.onclick = () => {
            if (
                confirm(
                    "For full functionality we require to view your Spotify username, public library, favorite songs, and modify your likes.\n\nYour likes will only ever be changed by using the heart-shaped buttons ingame.\n\nMake sure you are OK with this and read the upcoming permissions list carefully before accepting."
                )
            )
                signIn(true);
        };
        document.getElementById("sign_in_tutorial").style.display = null;
    }

    let loadPromises = [getGenres(), getFeaturedPlaylists()];
    if (signedIn) loadPromises.push(getUserPlaylists());

    Promise.all(loadPromises)
        .then((values) => {
            const popularGenres = [];
            const otherGenres = [];
            for (const genre of values[0].genres) {
                if (!(genre in GENRE_DIFFICULTY_POPULARITIES)) {
                    console.log(`New Genre: ${genre}`);
                    continue;
                }
                const popularity = GENRE_DIFFICULTY_POPULARITIES[genre].high;
                if (popularity >= POPULAR_GENRE_MIN_POPULARITY)
                    popularGenres.push({ genre, popularity });
                else otherGenres.push(genre);
            }

            popularGenres.sort((a, b) => b.popularity - a.popularity);

            const elGenres = document.getElementById("genres");
            // elGenres.innerHTML = "<option selected>Select Genres</option>";
            popularGenres.forEach(({ genre }) =>
                elGenres.add(new Option(formatGenre(genre), genre))
            );
            const separator = document.createElement("optgroup");
            separator.label = "---------";
            separator.disabled = true; // Make it unclickable
            elGenres.appendChild(separator);
            otherGenres.forEach((genre) =>
                elGenres.add(new Option(formatGenre(genre), genre))
            );

            if (mode !== "albums")
                params[mode].query.genres = params[mode].query.genres.filter(
                    (genre) => values[0].genres.includes(genre)
                );

            document.getElementById("use_featured_playlist_label").innerText =
                values[1].message;

            const elFeaturedPlaylist =
                document.getElementById("featured_playlist");

            elFeaturedPlaylist.innerHTML = "<option selected></option>";

            if (!values[1].playlists.items.length)
                document.getElementById(
                    "featured_playlist_random"
                ).disabled = true;
            else {
                for (const featuredPlaylist of values[1].playlists.items) {
                    if (featuredPlaylist)
                        elFeaturedPlaylist.add(
                            new Option(
                                featuredPlaylist.name,
                                featuredPlaylist.id
                            )
                        );
                }

                if (
                    !values[1].playlists.items.some(
                        (featuredPlaylist) =>
                            featuredPlaylist?.id ===
                            params[mode].featuredPlaylistId
                    )
                )
                    params[mode].featuredPlaylistId =
                        DEFAULT_PARAMS[mode].featuredPlaylistId;
            }

            const elUserPlaylist = document.getElementById("user_playlist");

            elUserPlaylist.innerHTML = "<option selected></option>";

            if (values.length == 2 || !values[2].items.length) {
                document.getElementById("use_user_playlist_label").style.color =
                    "gray";
                document.getElementById("use_user_playlist").disabled = true;
                document.getElementById("user_playlist").disabled = true;
                document.getElementById("user_playlist_random").disabled = true;
            } else {
                document.getElementById("use_user_playlist_label").style.color =
                    null;
                document.getElementById("use_user_playlist").disabled = false;
                document.getElementById("user_playlist").disabled = false;
                document.getElementById(
                    "user_playlist_random"
                ).disabled = false;

                for (const userPlaylist of values[2].items)
                    elUserPlaylist.add(
                        new Option(userPlaylist.name, userPlaylist.id)
                    );

                if (
                    !values[2].items.some(
                        (userPlaylist) =>
                            userPlaylist.id === params.userPlaylistId
                    )
                )
                    params.userPlaylistId = DEFAULT_PARAMS.userPlaylistId;
            }

            updateParams();
            updatePlayValidity();
        })
        .catch((e) => {
            alert(JSON.stringify(e));
            alert("Error getting spotify data");
        });

    setVolume(Number(localStorage.getItem("volume") ?? DEFAULT_VOLUME));

    document.getElementById("mute_explicit").checked = params.muteExplicit;
    document.getElementById("golden_lives").checked = params.golds;
    document.getElementById("hardcore").checked = params.hardcore;
    document.getElementById("sound_only").checked = params.soundOnly;
    document.getElementById("zen").checked = params.zen;
    document.getElementById("play_sfx").checked = params.playSFX;
    document.getElementById("hide_popularity").checked = params.hidePopularity;

    const advancedParamsVisibility =
        document.getElementById("advanced_params").style.visibility;

    if (
        localStorage.getItem("advanced_params_visibility") === "visible" &&
        (!advancedParamsVisibility || advancedParamsVisibility === "hidden")
    )
        toggleAdvancedParams();

    if (
        mode === "songs" &&
        localStorage.getItem("show_genre_tutorial") !== "false"
    )
        document.getElementById("genre_tutorial").style.display = null;
    else document.getElementById("genre_tutorial").style.display = "none";

    if (
        mode === "songs" &&
        localStorage.getItem("show_artist_tutorial") !== "false"
    )
        document.getElementById("artist_tutorial").style.display = null;
    else document.getElementById("artist_tutorial").style.display = "none";
};

function waitForLoad() {
    if (document.readyState == "loading")
        document.addEventListener("DOMContentLoaded", load);
    else load();
}

if (!_token) {
    signedIn = false;

    $.ajax({
        type: "POST",
        url: "https://accounts.spotify.com/api/token",
        headers: {
            Authorization:
                "Basic " +
                window.btoa(CLIENT_ID + ":87aef7fc43eb45318aae46026dd3012f"),
        },
        data: "grant_type=client_credentials",
        success: (data) => {
            _token = data.access_token;
            waitForLoad();
        },
        dataType: "json",
    });
} else {
    localStorage.setItem("signed_in", true);
    waitForLoad();
}

let params,
    userData,
    trackData1,
    trackData2,
    albumData1,
    albumData2,
    artistData1,
    artistData2,
    albumCover,
    trackDataTmp,
    albumDataTmp,
    artistDataTmp,
    urlsLeft,
    volume,
    linearVolume,
    paramKey,
    highScores,
    lives,
    golden = false,
    streak = 0,
    fading = false,
    score = 0,
    mode,
    marqueeTimesoutIds = [null, null, null, null, null, null],
    prevVolume = DEFAULT_VOLUME;

function setHighScores(data) {
    highScores = data;
    updateHighScore();
}

function updateParams() {
    if (params[mode].difficulty != null) {
        const elDifficulty = document.getElementById("difficulty");
        elDifficulty.value = ["low", "medium", "high"].indexOf(
            params[mode].difficulty
        );
        elDifficulty.nextElementSibling.innerText = `Include Unpopular Songs (${
            params[mode].difficulty[0].toUpperCase() +
            params[mode].difficulty.slice(1)
        })`;
    }
    if (mode !== "albums")
        Array.from(document.getElementById("genres").options).forEach(
            (option) =>
                (option.selected = params[mode].query.genres.includes(
                    option.value
                ))
        );
    document.getElementById("user_playlist").value =
        params[mode].userPlaylistId ?? "";
    document.getElementById("featured_playlist").value =
        params[mode].featuredPlaylistId ?? "";

    const elFromYear = document.getElementById("from_year"),
        elToYear = document.getElementById("to_year");

    elToYear.max = CURR_YEAR;

    document.getElementById("uri").value = params[mode].uri ?? "";

    document.getElementById("uri_search").value =
        params[mode].uriSearch?.q ?? "";
    document.getElementById("uri_search_type").value =
        params[mode].uriSearch?.type ?? "";

    const years = params[mode].query.years?.split("-") ?? ["", ""];

    elFromYear.value = years[0];
    elToYear.value = years[1] ?? "";
    elFromYear.max = elToYear.value;
    elToYear.min = elFromYear.value;

    switch (params[mode].use) {
        case "search":
            document.getElementById("use_search").checked = true;
            break;
        case "uri":
            document.getElementById("use_uri").checked = true;
            break;
        case "user_playlist":
            document.getElementById("use_user_playlist").checked = true;
            break;
        case "featured_playlist":
            document.getElementById("use_featured_playlist").checked = true;
            break;
        case "liked":
            document.getElementById("use_liked").checked = true;
            break;
        case "top":
            document.getElementById("use_top").checked = true;
            break;
    }

    switch (mode) {
        case "songs":
            document.getElementById("song_mode").checked = true;
            break;
        case "albums":
            document.getElementById("album_mode").checked = true;
            break;
        case "artists":
            document.getElementById("artist_mode").checked = true;
            break;
    }

    document.getElementById("play_sfx").checked = params.playSFX;
    document.getElementById("mute_explicit").checked = params.muteExplicit;
    document.getElementById("golden_lives").checked = params.golds;
    document.getElementById("hardcore").checked = params.hardcore;
    document.getElementById("hide_popularity").checked = params.hidePopularity;
    document.getElementById("sound_only").checked = params.soundOnly;
    document.getElementById("zen").checked = params.zen;
}

function getLinearGradient(hsl) {
    return (
        "linear-gradient(" +
        "hsl(" +
        hsl[0] * 360 +
        ", " +
        hsl[1] * 100 +
        "%, " +
        hsl[2] * 100 +
        "%), " +
        "25%, " +
        "hsl(" +
        hsl[0] * 360 +
        ", " +
        hsl[1] * 100 +
        "%, " +
        hsl[2] * 20 +
        "%))"
    );
}

function getTitleMarqueeLinearGradient(hsl, to) {
    return (
        `linear-gradient(to ${to}, ` +
        "hsl(" +
        hsl[0] * 360 +
        ", " +
        hsl[1] * 100 +
        "%, " +
        (hsl[2] * 100) / 2.82 +
        "%), " +
        "rgba(0, 0, 0, 0) 80%)"
    );
}

function getArtistMarqueeLinearGradient(hsl, to) {
    return (
        `linear-gradient(to ${to}, ` +
        "hsl(" +
        hsl[0] * 360 +
        ", " +
        hsl[1] * 100 +
        "%, " +
        (hsl[2] * 100) / 2.965 +
        "%), " +
        "rgba(0, 0, 0, 0) 80%)"
    );
}

function getQueryString(query) {
    if (mode === "songs") return query.genres.join(" ");
    if (mode === "albums") return `year:${query.years}`;
    if (mode === "artists") return `genre:${query.genres[0]}`;
}

function trackPlayerTimeUpdated(currentTime) {
    if (volume === 0) return;

    if (
        !fading &&
        SAMPLE_DURATION - SAMPLE_FADE_DURATION <= currentTime &&
        currentTime < SAMPLE_DURATION
    )
        fadeOut();
}

function fadeOut() {
    fading = true;

    const $elTrackPlayer = $("#track_player");

    $elTrackPlayer.animate(
        { volume: 0 },
        (SAMPLE_DURATION - $elTrackPlayer[0].currentTime) * 1000,
        () => {
            fading = false;
            $elTrackPlayer[0].volume = volume;
        }
    );
}

function getUserData() {
    return Promise.resolve(
        $.ajax({
            url: "https://api.spotify.com/v1/me",
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
        })
    );
}

function getUserPlaylists() {
    return Promise.resolve(
        $.ajax({
            url: "https://api.spotify.com/v1/me/playlists?limit=50",
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
        })
    );
}

function getFeaturedPlaylists() {
    return Promise.resolve(
        $.ajax({
            url: "https://api.spotify.com/v1/browse/featured-playlists?locale=en_US&limit=50",
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
        })
    );
}

function getGenres() {
    return Promise.resolve(
        $.ajax({
            url: "https://api.spotify.com/v1/recommendations/available-genre-seeds",
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
        })
    );
}

async function play() {
    document.getElementById("play_btn").style.display =
        document.getElementById("params").style.display =
        document.getElementById("modes").style.display =
        document.getElementById("user_action").style.display =
        document.getElementById("sign_in_tutorial").style.display =
            "none";

    urlsLeft = [];
    if (await loadUrls()) return restart();

    try {
        if (mode === "songs")
            [trackData1, trackData2] = await Promise.all([
                getRandomTrackData(),
                getRandomTrackData(),
            ]);
        else if (mode === "albums")
            [albumData1, albumData2] = await Promise.all([
                getRandomAlbumData(),
                getRandomAlbumData(),
            ]);
        else if (mode === "artists")
            [artistData1, artistData2] = await Promise.all([
                getRandomArtistData(),
                getRandomArtistData(),
            ]);
    } catch {
        return notEnoughResults();
    }

    document.getElementsByTagName("body")[0].className = "adaptive";

    const elHalves = document.getElementsByClassName("half"),
        elScore = document.getElementById("score");

    elHalves[0].style.display = elHalves[1].style.display = "flex";
    elScore.style.display = "initial";
    document.getElementById("vs_container").style.display =
        document.getElementById("lives").style.display = "flex";
    document.getElementById("top_info_container").style.display = params.zen
        ? "none"
        : "flex";

    lives = params.hardcore ? 1 : NUM_LIVES;
    streak = 0;
    const lifeClassStr = params.hardcore ? "life hardcore" : "life";
    document.getElementById("lives").innerHTML =
        `<svg class="${lifeClassStr}" viewBox="0 0 16 16"><path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"></path></svg>`.repeat(
            lives
        );

    if (!params.hardcore) {
        document.getElementById("streak_progress").style.display = "flex";
        updateStreak(4);
    }

    document.getElementById("source").style.display = "flex";

    const elAlbumArt1Btn = document.getElementById("album_art_1_btn"),
        elAlbumArt2Btn = document.getElementById("album_art_2_btn"),
        elSourceImg = document.getElementById("source_img");

    elAlbumArt1Btn.classList.remove("album_art_album");
    elAlbumArt2Btn.classList.remove("album_art_album");
    elSourceImg.classList.remove("album_art_album");
    elAlbumArt1Btn.classList.remove("album_art_artist");
    elAlbumArt2Btn.classList.remove("album_art_artist");
    elSourceImg.classList.remove("album_art_artist");

    if (mode === "albums") {
        elAlbumArt1Btn.classList.add("album_art_album");
        elAlbumArt2Btn.classList.add("album_art_album");
        elSourceImg.classList.add("album_art_album");
    } else if (mode === "artists") {
        elAlbumArt1Btn.classList.add("album_art_artist");
        elAlbumArt2Btn.classList.add("album_art_artist");
        elSourceImg.classList.add("album_art_artist");
    }

    golden = false;
    updateSide(1);
    revealPopularity(1, true);
    golden = params.golds && !params.hardcore && Math.random() < GOLDEN_CHANCE;
    if (golden && params.playSFX) {
        GOLD_APPEAR_SFX.volume = linearVolume / 2;
        GOLD_APPEAR_SFX.load();
        GOLD_APPEAR_SFX.play();
    }
    updateSide(2, false);
}

async function loadUrls() {
    if (mode === "songs") {
        switch (params[mode].use) {
            case "user_playlist": {
                const userPlayListData = await getData(
                        `https://api.spotify.com/v1/playlists/${params[mode].userPlaylistId}?market=US`,
                        false
                    ),
                    maxOffset = userPlayListData.tracks.total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    userPlayListData.external_urls.spotify;
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src = userPlayListData.images?.[0]?.url ?? "";
                document.getElementById("source_text").innerText = `${
                    userPlayListData.name.length >= 20
                        ? userPlayListData.name.substring(0, 19) + "..."
                        : userPlayListData.name
                } (${maxOffset})`;

                for (let offset = 0; offset < maxOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/playlists/${params[mode].userPlaylistId}/tracks?market=US&limit=1&offset=${offset}`
                    );
                break;
            }
            case "featured_playlist": {
                const featuredPlayListData = await getData(
                        `https://api.spotify.com/v1/playlists/${params[mode].featuredPlaylistId}?market=US`,
                        false
                    ),
                    maxOffset = featuredPlayListData.tracks.total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    featuredPlayListData.external_urls.spotify;
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src = featuredPlayListData.images[0].url;
                document.getElementById("source_text").innerText = `${
                    featuredPlayListData.name.length >= 20
                        ? featuredPlayListData.name.substring(0, 19) + "..."
                        : featuredPlayListData.name
                } (${maxOffset})`;

                for (let offset = 0; offset < maxOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/playlists/${params[mode].featuredPlaylistId}/tracks?market=US&limit=1&offset=${offset}`
                    );
                break;
            }
            case "liked": {
                const maxOffset = (
                    await getData(
                        `https://api.spotify.com/v1/me/tracks?market=US&limit=1`,
                        false
                    )
                ).total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    "https://open.spotify.com/collection/tracks";
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src =
                    "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png";
                document.getElementById(
                    "source_text"
                ).innerText = `Liked (${maxOffset})`;

                for (let offset = 0; offset < maxOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/me/tracks?market=US&limit=1&offset=${offset}`
                    );
                break;
            }
            case "top": {
                const maxOffset = (
                    await getData(
                        `https://api.spotify.com/v1/me/top/tracks?limit=1`,
                        false
                    )
                ).total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    "https://open.spotify.com/collection/tracks";
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src =
                    "https://play-lh.googleusercontent.com/OO06tTnQyEckM3dUDbHqmWXpI-7IbYlodDxVR7L4buzOX6KQvAeTJEV_Q45cznM63mJ-";
                document.getElementById(
                    "source_text"
                ).innerText = `Top (${maxOffset})`;

                for (let offset = 0; offset < maxOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/me/top/tracks?limit=1&offset=${offset}`
                    );
                break;
            }
            case "uri": {
                const albumArtistPlaylistURIParts = params[mode].uri.split(":"),
                    albumArtistPlaylistString = albumArtistPlaylistURIParts[1],
                    albumArtistPlaylistId = albumArtistPlaylistURIParts[2];

                let albumArtistPlaylistData;

                if (albumArtistPlaylistString === "album") {
                    try {
                        albumArtistPlaylistData = await getData(
                            `https://api.spotify.com/v1/albums/${albumArtistPlaylistId}?market=US`,
                            false
                        );
                    } catch {
                        alert("Invalid album ID");
                        return true;
                    }
                    albumCover = albumArtistPlaylistData.images[0].url;
                } else if (albumArtistPlaylistString === "artist") {
                    try {
                        albumArtistPlaylistData = await getData(
                            `https://api.spotify.com/v1/artists/${albumArtistPlaylistId}`,
                            false
                        );
                        const artistAlbumData = await getData(
                            `https://api.spotify.com/v1/artists/${albumArtistPlaylistData.id}/albums?include_groups=album&market=US`,
                            false,
                            "albums"
                        );
                        var albumIds = [],
                            albumTotals = [],
                            totalOffset = 0;
                        for (let albumData of artistAlbumData.items) {
                            albumIds.push(albumData.id);
                            albumTotals.push(albumData.total_tracks);
                            totalOffset += albumData.total_tracks;
                        }
                    } catch {
                        alert("Invalid artist ID");
                        return true;
                    }
                } else if (albumArtistPlaylistString === "playlist") {
                    try {
                        albumArtistPlaylistData = await getData(
                            `https://api.spotify.com/v1/playlists/${albumArtistPlaylistId}?market=US`,
                            false
                        );
                    } catch {
                        alert("Invalid playlist ID");
                        return true;
                    }
                }

                const maxOffset =
                    albumArtistPlaylistString === "artist"
                        ? totalOffset
                        : albumArtistPlaylistData.tracks.total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    albumArtistPlaylistData.external_urls.spotify;
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src = albumArtistPlaylistData.images[0]?.url ?? "";
                document.getElementById("source_text").innerText = `${
                    albumArtistPlaylistData.name.length >= 20
                        ? albumArtistPlaylistData.name.substring(0, 19) + "..."
                        : albumArtistPlaylistData.name
                } (${maxOffset})`;

                if (albumArtistPlaylistString === "artist") {
                    for (let i = 0; i < albumIds.length; i++) {
                        for (let offset = 0; offset < albumTotals[i]; offset++)
                            urlsLeft.push(
                                `https://api.spotify.com/v1/albums/${albumIds[i]}/tracks?market=US&limit=1&offset=${offset}`
                            );
                    }
                } else {
                    for (let offset = 0; offset < maxOffset; offset++)
                        urlsLeft.push(
                            albumArtistPlaylistString === "album"
                                ? `https://api.spotify.com/v1/albums/${albumArtistPlaylistId}/tracks?market=US&limit=1&offset=${offset}`
                                : `https://api.spotify.com/v1/playlists/${albumArtistPlaylistId}/tracks?market=US&limit=1&offset=${offset}`
                        );
                }
                break;
            }
            case "search": {
                const averageGenrePopularity =
                        params[mode].query.genres.reduce((sum, genre) => {
                            const genrePopularity =
                                GENRE_DIFFICULTY_POPULARITIES[genre][
                                    params[mode].difficulty
                                ];
                            return sum + genrePopularity;
                        }, 0) / params[mode].query.genres.length,
                    minPopularity = Math.min(
                        100 - MIN_POPULARITY_RANGE,
                        Math.ceil(averageGenrePopularity)
                    ),
                    // maxPopularity =
                    //     params[mode].difficulty === "high"
                    //         ? 100
                    //         : params[mode].difficulty === "medium"
                    //         ? Math.max(
                    //               GENRE_DIFFICULTY_POPULARITIES[
                    //                   params[mode].query.genre
                    //               ]["medium"] + MIN_POPULARITY_RANGE,
                    //               GENRE_DIFFICULTY_POPULARITIES[
                    //                   params[mode].query.genre
                    //               ]["high"]
                    //           )
                    //         : Math.max(
                    //               GENRE_DIFFICULTY_POPULARITIES[
                    //                   params[mode].query.genre
                    //               ]["low"] + MIN_POPULARITY_RANGE,
                    //               GENRE_DIFFICULTY_POPULARITIES[
                    //                   params[mode].query.genre
                    //               ]["medium"]
                    //           ),
                    queryString = encodeURIComponent(
                        getQueryString(params[mode].query)
                    );

                const initialRecommendations = await Promise.all(
                    params[mode].query.genres.map((genre) =>
                        getData(
                            `https://api.spotify.com/v1/recommendations?limit=100&market=US&seed_genres=${genre}&min_popularity=${Math.min(
                                100 - MIN_POPULARITY_RANGE,
                                GENRE_DIFFICULTY_POPULARITIES[genre][
                                    params[mode].difficulty
                                ]
                            )}`,
                            false
                        )
                    )
                );

                const seedTracks = [];
                initialRecommendations.forEach((recommendation) => {
                    const tracks = recommendation.tracks;
                    const genreTracks = [];
                    const usedIndices = new Set();

                    while (
                        genreTracks.length <
                            (params[mode].query.genres.length > 1 ? 1 : 3) &&
                        usedIndices.size < tracks.length
                    ) {
                        const randomIndex = Math.floor(
                            Math.random() * tracks.length
                        );
                        if (!usedIndices.has(randomIndex)) {
                            genreTracks.push(tracks[randomIndex]);
                            usedIndices.add(randomIndex);
                        }
                    }
                    seedTracks.push(...genreTracks);
                });

                const trackRecommendationData = await getData(
                        `https://api.spotify.com/v1/recommendations?limit=100&market=US&seed_genres=${params[
                            mode
                        ].query.genres.join("%2C")}&seed_tracks=${seedTracks
                            .map((track) => track.id)
                            .join("%2C")}&min_popularity=${minPopularity}`,
                        false
                    ),
                    lastOffset = trackRecommendationData.tracks.length;

                let genreData = null;
                let foundGenreIdx = -1;
                for (let i = 0; i < params[mode].query.genres.length; i++) {
                    try {
                        genreData = await getData(
                            `https://api.spotify.com/v1/browse/categories/${params[
                                mode
                            ].query.genres[i].replace(/-/g, "")}?locale=en_US`
                        );
                        foundGenreIdx = i;
                        break;
                    } catch {
                        continue;
                    }
                }

                const elSourceImg = document.getElementById("source_img");
                let sourceGenres;
                if (genreData != null) {
                    const foundGenre = params[mode].query.genres[foundGenreIdx];
                    sourceGenres = [
                        foundGenre,
                        ...params[mode].query.genres.filter(
                            (genre) => genre !== foundGenre
                        ),
                    ]
                        .map((genre) => formatGenre(genre))
                        .join(", ");

                    document.getElementById("source_img_search").style.display =
                        "none";
                    elSourceImg.style.display = "initial";
                    elSourceImg.src = genreData.icons[0].url;
                    document.getElementById("source").href =
                        "https://open.spotify.com/genre/" + genreData.id;
                } else {
                    sourceGenres = params[mode].query.genres
                        .map((genre) => formatGenre(genre))
                        .join(", ");
                    document.getElementById("source_img").style.display =
                        "none";
                    document.getElementById("source_img_search").style.display =
                        "initial";
                    document.getElementById("source").href =
                        "https://open.spotify.com/search/" +
                        queryString +
                        "/genres";
                }

                document.getElementById(
                    "source_text"
                ).innerText = `${sourceGenres} (${lastOffset})`;

                for (let i = 0; i < trackRecommendationData.tracks.length; i++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/tracks/${trackRecommendationData.tracks[i].id}?market=US`
                    );
                break;
            }
        }
    } else if (mode === "albums") {
        switch (params[mode].use) {
            case "liked": {
                const maxOffset = (
                    await getData(
                        `https://api.spotify.com/v1/me/albums?market=US&limit=1`,
                        false
                    )
                ).total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    "https://open.spotify.com/collection/albums";
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src =
                    "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png";
                document.getElementById(
                    "source_text"
                ).innerText = `Liked (${maxOffset})`;

                for (let offset = 0; offset < maxOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/me/albums?market=US&limit=1&offset=${offset}`
                    );
                break;
            }
            case "uri": {
                const artistId = params[mode].uri.split(":")[2];

                let artistData, artistAlbumData;

                try {
                    [artistData, artistAlbumData] = await Promise.all([
                        getData(
                            `https://api.spotify.com/v1/artists/${artistId}`,
                            false
                        ),
                        getData(
                            `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album&market=US`,
                            false
                        ),
                    ]);
                } catch {
                    alert("Invalid artist ID");
                    return true;
                }

                const maxOffset = artistAlbumData.total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    artistData.external_urls.spotify;
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src = artistData.images[0].url;
                document.getElementById("source_text").innerText = `${
                    artistData.name.length >= 20
                        ? artistData.name.substring(0, 19) + "..."
                        : artistData.name
                } (${maxOffset})`;

                for (let offset = 0; offset < maxOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album&market=US&limit=1&offset=${offset}`
                    );
                break;
            }
            case "search": {
                const queryString = encodeURIComponent(
                        getQueryString(params[mode].query)
                    ),
                    maxOffset = (
                        await getData(
                            `https://api.spotify.com/v1/search?q=${queryString}&type=album&market=US&limit=1`,
                            false
                        )
                    ).albums.total,
                    lastOffset = maxOffset;

                document.getElementById("source_img").style.display = "none";
                document.getElementById("source_img_search").style.display =
                    "initial";

                document.getElementById("source").href =
                    "https://open.spotify.com/search/" +
                    queryString +
                    "/albums";
                document.getElementById(
                    "source_text"
                ).innerText = `${params[mode].query.years} (${lastOffset})`;

                for (let offset = 0; offset < lastOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/search?q=${queryString}&type=album&market=US&limit=1&offset=${offset}`
                    );
                break;
            }
        }
    } else if (mode === "artists") {
        switch (params[mode].use) {
            case "liked": {
                const followedArtistData = await getData(
                    `https://api.spotify.com/v1/me/following?type=artist&limit=50`,
                    false
                );

                for (const artist of followedArtistData.artists.items)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/artists/${artist.id}`
                    );

                const maxOffset = urlsLeft.length;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    "https://open.spotify.com/collection/artists";
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src =
                    "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png";
                document.getElementById(
                    "source_text"
                ).innerText = `Liked (${maxOffset})`;
                break;
            }
            case "top": {
                const maxOffset = (
                    await getData(
                        `https://api.spotify.com/v1/me/top/artists?limit=1`,
                        false
                    )
                ).total;

                const elSourceImg = document.getElementById("source_img");

                document.getElementById("source").href =
                    "https://open.spotify.com/collection/artists";
                document.getElementById("source_img_search").style.display =
                    "none";
                elSourceImg.style.display = "initial";
                elSourceImg.src =
                    "https://play-lh.googleusercontent.com/OO06tTnQyEckM3dUDbHqmWXpI-7IbYlodDxVR7L4buzOX6KQvAeTJEV_Q45cznM63mJ-";
                document.getElementById(
                    "source_text"
                ).innerText = `Top (${maxOffset})`;

                for (let offset = 0; offset < maxOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/me/top/artists?limit=1&offset=${offset}`
                    );
                break;
            }
            case "search": {
                const queryString = encodeURIComponent(
                        getQueryString(params[mode].query)
                    ),
                    maxOffset = (
                        await getData(
                            `https://api.spotify.com/v1/search?q=${queryString}&type=artist&market=US&limit=1`,
                            false
                        )
                    ).artists.total,
                    lastOffset = Math.min(100, maxOffset);

                const elSourceImg = document.getElementById("source_img");
                try {
                    const genreData = await getData(
                        `https://api.spotify.com/v1/browse/categories/${params[
                            mode
                        ].query.genres[0].replace(/-/g, "")}?locale=en_US`
                    );

                    document.getElementById("source_img_search").style.display =
                        "none";
                    elSourceImg.style.display = "initial";
                    elSourceImg.src = genreData.icons[0].url;
                } catch {
                    elSourceImg.style.display = "none";
                    document.getElementById("source_img_search").style.display =
                        "initial";
                }

                document.getElementById("source").href =
                    "https://open.spotify.com/search/" +
                    queryString +
                    "/artists";
                document.getElementById(
                    "source_text"
                ).innerText = `${formatGenre(
                    params[mode].query.genres[0]
                )} (${lastOffset})`;

                for (let offset = 0; offset < lastOffset; offset++)
                    urlsLeft.push(
                        `https://api.spotify.com/v1/search?q=${queryString}&type=artist&market=US&limit=1&offset=${offset}`
                    );
            }
        }
    }
}

function getData(url, returnFirstItem = true, type = null) {
    if (type === null) type = mode;
    return new Promise((resolve, reject) => {
        $.ajax({
            url,
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
            success: (data) => {
                if (!returnFirstItem) return resolve(data);

                if (type === "songs") {
                    if (params[mode].use === "search") return resolve(data);

                    const trackData =
                        data.tracks?.items[0] ??
                        data.items?.[0].track ??
                        data.items?.[0];

                    if (!trackData || trackData.is_local) return reject();

                    if (trackData.preview_url && trackData.popularity)
                        resolve(trackData);
                    else {
                        $.ajax({
                            url: `https://api.spotify.com/v1/tracks/${trackData.id}?market=US`,
                            type: "GET",
                            beforeSend: (xhr) => {
                                xhr.setRequestHeader(
                                    "Authorization",
                                    "Bearer " + _token
                                );
                            },
                            success: (data) => {
                                resolve(data);
                            },
                            error: reject,
                        });
                    }
                } else if (type === "albums") {
                    const albumData =
                        data.albums?.items[0] ??
                        data.items?.[0].album ??
                        data.items?.[0];

                    if (!albumData) return reject();

                    $.ajax({
                        url: `https://api.spotify.com/v1/albums/${albumData.id}?market=US`,
                        type: "GET",
                        beforeSend: (xhr) => {
                            xhr.setRequestHeader(
                                "Authorization",
                                "Bearer " + _token
                            );
                        },
                        success: (data) => {
                            resolve(data);
                        },
                        error: reject,
                    });
                } else if (type === "artists") {
                    const artistData =
                        data.artists?.items[0] ??
                        data.items?.[0] ??
                        data.tracks ??
                        data;

                    if (!artistData) return reject();

                    resolve(artistData);

                    // $.ajax({
                    //     url:
                    //         "https://api.spotify.com/v1/artists/" +
                    //         artistData.id,
                    //     type: "GET",
                    //     beforeSend: (xhr) => {
                    //         xhr.setRequestHeader(
                    //             "Authorization",
                    //             "Bearer " + _token
                    //         );
                    //     },
                    //     success: (data) => {
                    //         resolve(data);
                    //     },
                    //     error: reject,
                    // });
                }
            },
            error: reject,
        });
    });
}

function getRandomUrl() {
    return urlsLeft.splice(Math.floor(Math.random() * urlsLeft.length), 1)[0];
}

function getRandomAlbumTrackUrl(albumData) {
    return albumData.tracks.items[
        Math.floor(Math.random() * albumData.tracks.total)
    ].href;
}

function formatGenre(genre) {
    return genre
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("-");
}

function getBarColor(p) {
    return p === 0 ? "" : `hsl(${p * 3.3}, 100%, 50%)`;
}

function updateMarquees(sideNum) {
    clearTimeout(marqueeTimesoutIds[sideNum - 1]);
    clearTimeout(marqueeTimesoutIds[sideNum + 1]);
    clearTimeout(marqueeTimesoutIds[sideNum + 3]);

    const elTrackTitle = document.getElementById(`track_title_${sideNum}`),
        elArtist = document.getElementById(`artist_${sideNum}`),
        albumData = sideNum === 1 ? albumData1 : albumData2,
        artistData = sideNum === 1 ? artistData1 : artistData2,
        trackData =
            mode === "songs"
                ? sideNum === 1
                    ? trackData1
                    : trackData2
                : mode === "albums"
                ? albumData.preview_track
                : artistData.preview_track,
        explicit = trackData && trackData.explicit;

    elTrackTitle.style.animation = "none";
    elTrackTitle.offsetHeight;

    elArtist.style.animation = "none";
    elArtist.offsetHeight;

    elArtist.style.marginLeft = window.matchMedia("(orientation:portrait)")
        .matches
        ? explicit
            ? "0.5dvh"
            : "0.75dvh"
        : explicit
        ? "1dvh"
        : "1.5dvh";

    marqueeTimesoutIds[sideNum + 3] = setTimeout(() => {
        const elTrackInfo = document.getElementById(
                `${sideNum === 1 ? "left" : "right"}_track_info`
            ),
            elArtistContainer = document.getElementById(
                `artist_container_${sideNum}`
            ),
            elTrackRightGradient = document.getElementById(
                `track_${sideNum}_right_gradient`
            ),
            trackTitleWidth = elTrackTitle.scrollWidth,
            elArtistWidth = elArtist.scrollWidth,
            artistContainerWidthVisible = elArtistContainer.clientWidth,
            trackInfoWidth = elTrackInfo.offsetWidth,
            gradientWidth = elTrackRightGradient.offsetWidth,
            marginLeftOffset =
                (window.matchMedia("(orientation:portrait)").matches
                    ? 0.008
                    : 0.015) * document.documentElement.scrollHeight,
            explicitOffset =
                (window.matchMedia("(orientation:portrait)").matches
                    ? 0.0025
                    : 0.005) * document.documentElement.scrollHeight;

        if (
            trackTitleWidth >
            trackInfoWidth - marginLeftOffset - gradientWidth
        ) {
            const titleMarqueeProperty = `--marquee_title_${sideNum}_distance`,
                titleMarqueeDistance =
                    trackTitleWidth -
                    (trackInfoWidth - marginLeftOffset - gradientWidth);

            document.documentElement.style.setProperty(
                titleMarqueeProperty,
                `${-titleMarqueeDistance}px`
            );

            const titleMarqueeDuration = titleMarqueeDistance / 15,
                titleAnimation = `${titleMarqueeDuration}s linear infinite alternate marquee_title_${sideNum}`;

            elTrackTitle.style.animation = titleAnimation;
            elTrackTitle.onanimationiteration = () => {
                elTrackTitle.style.animationPlayState = "paused";
                marqueeTimesoutIds[sideNum - 1] = setTimeout(() => {
                    elTrackTitle.style.animationPlayState = "running";
                }, MARQUEE_PAUSE_DURATION * 1000);
            };
        }

        if (
            elArtistWidth >
            artistContainerWidthVisible -
                marginLeftOffset +
                explicitOffset -
                gradientWidth
        ) {
            const artistMarqueeProperty = `--marquee_artist_${sideNum}_distance`,
                artistMarqueeDistance =
                    elArtistWidth -
                    (artistContainerWidthVisible -
                        marginLeftOffset +
                        explicitOffset -
                        gradientWidth);

            document.documentElement.style.setProperty(
                artistMarqueeProperty,
                `${-artistMarqueeDistance}px`
            );

            const artistMarqueeDuration = artistMarqueeDistance / 15,
                artistAnimation = `${artistMarqueeDuration}s linear infinite alternate marquee_artist_${sideNum}`;

            elArtist.style.animation = artistAnimation;
            elArtist.onanimationiteration = () => {
                elArtist.style.animationPlayState = "paused";
                marqueeTimesoutIds[1 + sideNum] = setTimeout(() => {
                    elArtist.style.animationPlayState = "running";
                }, MARQUEE_PAUSE_DURATION * 1000);
            };
        }
    }, MARQUEE_PAUSE_DURATION * 1000);
}

function updateSide(sideNum, reveal = false) {
    const albumData = sideNum === 1 ? albumData1 : albumData2,
        artistData = sideNum === 1 ? artistData1 : artistData2,
        trackData =
            mode === "songs"
                ? sideNum === 1
                    ? trackData1
                    : trackData2
                : mode === "albums"
                ? albumData.preview_track
                : artistData.preview_track,
        noAudio =
            !trackData?.preview_url ||
            (params.muteExplicit && trackData.explicit),
        explicit = trackData && trackData.explicit,
        elAlbumArtBtn = document.getElementById(`album_art_${sideNum}_btn`),
        elTrackPlayer = document.getElementById("track_player");

    if (noAudio) {
        elAlbumArtBtn.style.opacity = 0.5;
        elAlbumArtBtn.style.cursor = "initial";
        elAlbumArtBtn.disabled = true;
        elAlbumArtBtn.classList.remove("album_art_hover");
        elAlbumArtBtn.style.animation = "initial";
    } else {
        elAlbumArtBtn.style.opacity = 1;
        elAlbumArtBtn.style.cursor = "pointer";
        elAlbumArtBtn.disabled = false;
        elAlbumArtBtn.classList.add("album_art_hover");
    }

    if (!reveal) {
        if (sideNum === 2 && !noAudio) playTrack(2);
        else elTrackPlayer.src = "";
    }

    const elHalf = document.getElementById(
            `${sideNum === 1 ? "left" : "right"}_half`
        ),
        elAlbumArt = document.getElementById(`album_art_${sideNum}`),
        albumArtUrl =
            mode === "songs"
                ? trackData.album?.images[0].url ?? albumCover
                : mode === "albums"
                ? albumData.images[0].url
                : artistData.images[0].url;

    elHalf.style.background = "initial";

    const elTrackLeftGradient = document.getElementById(
            `track_${sideNum}_left_gradient`
        ),
        elTrackRightGradient = document.getElementById(
            `track_${sideNum}_right_gradient`
        ),
        elArtistLeftGradient = document.getElementById(
            `artist_${sideNum}_left_gradient`
        ),
        elArtistRightGradient = document.getElementById(
            `artist_${sideNum}_right_gradient`
        );

    elTrackLeftGradient.style.background =
        elTrackRightGradient.style.background =
        elArtistLeftGradient.style.background =
        elArtistRightGradient.style.background =
            "initial";

    if (reveal || !params.soundOnly) {
        if (!reveal && sideNum === 1 && score > 0) {
            elHalf.style.background =
                document.getElementById("right_half").style.background;
            elTrackLeftGradient.style.background = document.getElementById(
                "track_2_left_gradient"
            ).style.background;
            elTrackRightGradient.style.background = document.getElementById(
                "track_2_right_gradient"
            ).style.background;
            elArtistLeftGradient.style.background = document.getElementById(
                "artist_2_left_gradient"
            ).style.background;
            elArtistRightGradient.style.background = document.getElementById(
                "artist_2_right_gradient"
            ).style.background;
        } else
            Vibrant.from(albumArtUrl)
                .getPalette()
                .then((palette) => {
                    const hsl = palette.Muted.getHsl();

                    elHalf.style.background = getLinearGradient(hsl);

                    const leftTitleMarqueeGradient =
                            getTitleMarqueeLinearGradient(hsl, "right"),
                        rightTitleMarqueeGradient =
                            getTitleMarqueeLinearGradient(hsl, "left"),
                        leftArtistMarqueeGradient =
                            getArtistMarqueeLinearGradient(hsl, "right"),
                        rightArtistMarqueeGradient =
                            getArtistMarqueeLinearGradient(hsl, "left");

                    elTrackLeftGradient.style.background =
                        leftTitleMarqueeGradient;
                    elTrackRightGradient.style.background =
                        rightTitleMarqueeGradient;
                    elArtistLeftGradient.style.background =
                        leftArtistMarqueeGradient;
                    elArtistRightGradient.style.background =
                        rightArtistMarqueeGradient;
                });
    }

    elAlbumArt.src = "";
    if (reveal || !params.soundOnly) {
        elAlbumArt.style.visibility = "visible";
        elAlbumArtBtn.style.border = golden ? "0.25dvh solid #fdd017" : "none";
        elAlbumArt.src = albumArtUrl;
    } else {
        elAlbumArt.style.visibility = "hidden";
        elAlbumArtBtn.style.border = `0.25dvh solid ${
            golden ? "#fdd017" : "#fff"
        }`;
    }

    const elTrackTitle = document.getElementById(`track_title_${sideNum}`);

    elTrackTitle.innerText =
        reveal || !params.soundOnly
            ? mode === "songs"
                ? trackData.name
                : mode === "albums"
                ? albumData.name
                : artistData.name
            : "";
    elTrackTitle.href =
        reveal || !params.soundOnly
            ? mode === "songs"
                ? trackData.external_urls.spotify
                : mode === "albums"
                ? albumData.external_urls.spotify
                : artistData.external_urls.spotify
            : "";

    const elExplicit = document.getElementById(`explicit_${sideNum}`);

    elExplicit.style.display =
        explicit && (!params.soundOnly || reveal) ? null : "none";

    const elArtist = document.getElementById(`artist_${sideNum}`);

    elArtist.innerHTML = "";

    if (reveal || !params.soundOnly) {
        if (mode === "artists") {
            if (!noAudio) {
                const elA = document.createElement("a"),
                    elI = document.createElement("i");
                elA.innerText = trackData.name;
                elA.href = trackData.external_urls.spotify;
                elA.target = "_blank";
                elA.className = "artist_link";
                if (golden) elA.classList.add("golden_secondary");
                elA.draggable = false;

                elI.appendChild(elA);
                elArtist.appendChild(elI);
            }
        } else {
            for (
                let i = 0;
                i < (mode === "songs" ? trackData : albumData).artists.length;
                i++
            ) {
                const artist = (mode === "songs" ? trackData : albumData)
                        .artists[i],
                    elA = document.createElement("a");

                elA.innerText = artist.name;
                elA.href = artist.external_urls.spotify;
                elA.target = "_blank";
                elA.className = "artist_link";
                if (golden) elA.classList.add("golden_secondary");
                elA.draggable = false;

                elArtist.appendChild(elA);

                if (
                    i !=
                    (mode === "songs" ? trackData : albumData).artists.length -
                        1
                ) {
                    // const elTextNode = document.createTextNode(", ");
                    const spanElement = document.createElement("span");
                    spanElement.innerHTML = ",&nbsp;";

                    // spanElement.appendChild(elTextNode);

                    if (golden) spanElement.style.color = "#bf9b30";

                    elArtist.appendChild(spanElement);
                }
            }

            if (mode === "albums" && !noAudio) {
                // const elTextNode = document.createTextNode(" - ");
                const spanElement = document.createElement("span");
                spanElement.innerHTML = "&nbsp;-&nbsp;";

                // spanElement.appendChild(elTextNode);
                if (golden) spanElement.style.color = "#bf9b30";

                elArtist.appendChild(spanElement);

                const elA = document.createElement("a"),
                    elI = document.createElement("i");
                elA.innerText = trackData.name;
                elA.href = trackData.external_urls.spotify;
                elA.target = "_blank";
                elA.className = "artist_link";
                if (golden) elA.classList.add("golden_secondary");
                elA.draggable = false;

                elI.appendChild(elA);
                elArtist.appendChild(elI);
            }
        }
    }

    updateMarquees(sideNum);

    const elLikeBtn = document.getElementById(`like_btn_${sideNum}`);

    if (signedIn && (reveal || !params.soundOnly)) {
        if (mode === "songs")
            hasTrackSaved(trackData.id).then((saved) => {
                updateLikeBtn(sideNum, saved[0], golden && sideNum === 2);
            });
        else if (mode === "albums")
            hasAlbumSaved(albumData.id).then((saved) => {
                updateLikeBtn(sideNum, saved[0], golden && sideNum === 2);
            });
        else if (mode === "artists")
            hasArtistSaved(artistData.id).then((saved) => {
                updateLikeBtn(sideNum, saved[0], golden && sideNum === 2);
            });
    } else elLikeBtn.innerHTML = "";

    if (golden) {
        elTrackTitle.classList.add("golden_primary");
        document.querySelectorAll(".guess_btn").forEach((button) => {
            button.classList.add("golden_secondary");
        });
        elExplicit.classList.add("golden_secondary_background");
    } else {
        elTrackTitle.classList.remove("golden_primary");
        document.querySelectorAll(".guess_btn").forEach((button) => {
            button.classList.remove("golden_secondary");
        });
        elExplicit.classList.remove("golden_secondary_background");
    }
}

function updateLikeBtn(sideNum, saved, goldenBtn) {
    const elLikeBtn = document.getElementById(`like_btn_${sideNum}`);

    if (saved)
        elLikeBtn.innerHTML = `<svg class="liked_svg${
            goldenBtn ? " golden_secondary" : ""
        }" viewBox="0 0 16 16"><path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"></path></svg>`;
    else
        elLikeBtn.innerHTML = `<svg class="${
            goldenBtn ? "golden_secondary" : ""
        }" viewBox="0 0 16 16"><path d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"></path></svg>`;
}

function clickTrack(elAlbumArtBtn, sideNum) {
    const elTrackPlayer = document.getElementById("track_player"),
        previewUrl =
            mode === "songs"
                ? sideNum === 1
                    ? trackData1.preview_url
                    : trackData2.preview_url
                : mode === "albums"
                ? sideNum === 1
                    ? albumData1.preview_track?.preview_url
                    : albumData2.preview_track?.preview_url
                : sideNum === 1
                ? artistData1.preview_track?.preview_url
                : artistData2.preview_track?.preview_url;

    if (elTrackPlayer.src === previewUrl) {
        elTrackPlayer.src = "";
        elAlbumArtBtn.style.animation = "initial";
    } else {
        if (volume === 0) toggleMute();

        playTrack(sideNum);
    }
}

function playTrack(sideNum) {
    const $elTrackPlayer = $("#track_player");

    // $elTrackPlayer.stop();
    $elTrackPlayer[0].volume = volume;

    $elTrackPlayer[0].src =
        mode === "songs"
            ? sideNum === 1
                ? trackData1.preview_url
                : trackData2.preview_url
            : mode === "albums"
            ? sideNum === 1
                ? albumData1.preview_track?.preview_url
                : albumData2.preview_track?.preview_url
            : sideNum === 1
            ? artistData1.preview_track?.preview_url
            : artistData2.preview_track?.preview_url;
    $elTrackPlayer[0].load();
    $elTrackPlayer[0].play();

    const elAlbumArtBtn = document.getElementById(`album_art_${sideNum}_btn`),
        elAlbumArtBtnOther = document.getElementById(
            `album_art_${sideNum === 1 ? 2 : 1}_btn`
        );

    elAlbumArtBtn.style.animation =
        "pulse var(--pulse_duration) infinite ease-in-out";

    elAlbumArtBtnOther.style.animation = "initial";
}

function hasTrackSaved(id) {
    return Promise.resolve(
        $.ajax({
            url: "https://api.spotify.com/v1/me/tracks/contains?ids=" + id,
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
        })
    );
}

function hasAlbumSaved(id) {
    return Promise.resolve(
        $.ajax({
            url: "https://api.spotify.com/v1/me/albums/contains?ids=" + id,
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
        })
    );
}

function hasArtistSaved(id) {
    return Promise.resolve(
        $.ajax({
            url:
                "https://api.spotify.com/v1/me/following/contains?type=artist&ids=" +
                id,
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
        })
    );
}

function like(elLikeBtn, sideNum) {
    const id = (
        mode === "songs"
            ? sideNum === 1
                ? trackData1
                : trackData2
            : mode === "albums"
            ? sideNum === 1
                ? albumData1
                : albumData2
            : sideNum === 1
            ? artistData1
            : artistData2
    ).id;

    let goldenSvg =
        elLikeBtn.firstChild.className &&
        elLikeBtn.firstChild.className.baseVal.includes("golden_secondary");

    if (
        elLikeBtn.firstChild.className &&
        elLikeBtn.firstChild.className.baseVal.includes("liked_svg")
    )
        $.ajax({
            url:
                mode === "artists"
                    ? `https://api.spotify.com/v1/me/following?type=artist&ids=${id}`
                    : `https://api.spotify.com/v1/me/${
                          mode === "songs" ? "tracks" : "albums"
                      }?ids=${id}`,
            type: "DELETE",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
            success: () => {
                elLikeBtn.style.animation = "unlike 0.2s ease-in";
                setTimeout(() => {
                    elLikeBtn.innerHTML = `<svg class="${
                        goldenSvg ? "golden_secondary" : ""
                    }" viewBox="0 0 16 16"><path d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"></path></svg>`;
                }, 0.2 * 1000);
            },
        });
    else
        $.ajax({
            url:
                mode === "artists"
                    ? `https://api.spotify.com/v1/me/following?type=artist&ids=${id}`
                    : `https://api.spotify.com/v1/me/${
                          mode === "songs" ? "tracks" : "albums"
                      }?ids=${id}`,
            type: "PUT",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
            success: () => {
                elLikeBtn.style.animation = "like 0.1s ease-in";
                setTimeout(() => {
                    elLikeBtn.innerHTML = `<svg class="liked_svg${
                        goldenSvg ? " golden_secondary" : ""
                    }" viewBox="0 0 16 16"><path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"></path></svg>`;
                }, 0.1 * 1000);
            },
        });
}

function updateStreak(type) {
    const $elStreakBar = $("#streak_bar"),
        $elStreakNumber = $("#streak_number");

    if (type === 4) {
        $elStreakNumber.text(0);
        const barColor = getBarColor(0);

        $elStreakBar.css({
            transform: "rotate(" + (45 + 0 * 1.8) + "deg)",
            borderBottomColor: barColor,
            borderRightColor: barColor,
        });

        $elStreakNumber.css("color", barColor);

        return;
    }

    let curSkipProgress, newSkipProgress, newStreak;

    if (type === 0) {
        curSkipProgress = streak % STREAK_LENGTH;
        newSkipProgress = 0;
        newStreak = 0;
    } else if (type === 1) {
        curSkipProgress = streak % STREAK_LENGTH;
        newSkipProgress = curSkipProgress + 1;
        newStreak = streak + 1;
    } else if (type === 2) {
        curSkipProgress = STREAK_LENGTH;
        newSkipProgress = 0;
    }

    if (type !== 2)
        setTimeout(() => {
            $elStreakNumber.text(newStreak);
        }, STREAK_ANIMATION_DURATION * 500);

    $({ progress: (curSkipProgress * 100) / STREAK_LENGTH }).animate(
        { progress: (newSkipProgress * 100) / STREAK_LENGTH },
        {
            duration: STREAK_ANIMATION_DURATION * 1000,
            easing: "swing",
            step: (s) => {
                const barColor = getBarColor(s);

                $elStreakBar.css({
                    transform: "rotate(" + (45 + s * 1.8) + "deg)",
                    borderBottomColor: barColor,
                    borderRightColor: barColor,
                });

                if (type !== 2) {
                    $elStreakNumber.css("color", barColor);
                }
            },
            complete: () => {
                if (type !== 2) {
                    streak = newStreak;

                    if (streak % STREAK_LENGTH === 0 && streak > 0) {
                        STREAK_BONUS_SFX.volume = linearVolume / 2;
                        STREAK_BONUS_SFX.load();
                        STREAK_BONUS_SFX.play();

                        updateStreak(2);
                    }
                }
            },
        }
    );
}

function checkGuess(higher) {
    const popularity1 = (
            mode === "songs"
                ? trackData1
                : mode === "albums"
                ? albumData1
                : artistData1
        ).popularity,
        popularity2 = (
            mode === "songs"
                ? trackData2
                : mode === "albums"
                ? albumData2
                : artistData2
        ).popularity;

    const correct = higher
        ? popularity2 >= popularity1
        : popularity2 <= popularity1;

    revealPopularity(2, true, correct);

    let checkPromises = [
        new Promise((resolve) =>
            setTimeout(
                resolve,
                ((params.hidePopularity ? 0 : POPULARITY_ANIMATION_DURATION) +
                    SHOW_POPULARITY_DURATION) *
                    1000
            )
        ),
    ];

    if (params.zen || correct || lives > 1)
        checkPromises.push(
            new Promise(async (resolve, reject) => {
                try {
                    if (mode === "songs")
                        trackDataTmp = await getRandomTrackData();
                    else if (mode === "albums")
                        albumDataTmp = await getRandomAlbumData();
                    else if (mode === "artists") {
                        artistDataTmp = await getRandomArtistData();
                    }
                    resolve();
                } catch {
                    reject();
                }
            })
        );

    Promise.allSettled(checkPromises).then((results) => {
        if (correct) {
            const elCurrentScore = document.getElementById("current_score"),
                elCurrentHighScore =
                    document.getElementById("current_high_score");

            score++;
            if (golden) gainLife();
            if (!params.hardcore && !params.zen) updateStreak(1);

            elCurrentScore.style.animation = "bump 0.25s linear";
            elCurrentScore.onanimationend = () => {
                elCurrentScore.style.animation = "initial";
            };
            setTimeout(() => {
                elCurrentScore.innerText = score;
            }, 0.125 * 1000);

            if (!params.zen && score > (highScores[paramKey] ?? 0)) {
                highScores[paramKey] = score;
                if (signedIn)
                    window.storeHighScore(userData.id, paramKey, score);
                else
                    localStorage.setItem(
                        "high_scores",
                        JSON.stringify(highScores)
                    );
                elCurrentHighScore.style.animation = "bump 0.25s linear";
                elCurrentHighScore.onanimationend = () => {
                    elCurrentHighScore.style.animation = "initial";
                };
                setTimeout(() => {
                    elCurrentHighScore.innerText =
                        "High: " + highScores[paramKey];
                }, 0.125 * 1000);
            }
        } else {
            loseLife();
            if (!params.zen) updateStreak(0);
        }

        if (!lives) gameOver();
        else if (results[1].status === "rejected")
            setTimeout(noMoreItems, 0.25 * 1000);
        else nextRound();
    });
}

function gainLife() {
    if (params.playSFX) {
        GAIN_LIFE_SFX.volume = linearVolume / 2;
        GAIN_LIFE_SFX.load();
        GAIN_LIFE_SFX.play();
    }

    const elLives = document.getElementById("lives");

    lives++;

    elLives.innerHTML +=
        '<svg class="life golden_primary" viewBox="0 0 16 16"><path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"></path></svg>';
    elLives.lastChild.style.animation = "gain_life 0.3s ease-in";
    elLives.lastChild.onanimationend = () => {
        elLives.lastChild.style.animation = "initial";
    };
}

function loseLife() {
    if (!params.zen) --lives;

    if (params.playSFX) {
        if (lives > 0) {
            LOST_LIFE_SFX.volume = linearVolume / 2;
            LOST_LIFE_SFX.load();
            LOST_LIFE_SFX.play();
        } else {
            GAME_OVER_SFX.volume = linearVolume / 2;
            GAME_OVER_SFX.load();
            GAME_OVER_SFX.play();
        }
    }

    if (!params.zen) {
        const elLives = document.getElementById("lives");

        elLives.lastChild.style.animation = "lose_life 0.3s ease-out";
        elLives.lastChild.onanimationend = () => {
            elLives.removeChild(elLives.lastChild);
            if (!lives) {
                elLives.style.display = "none";
                document.getElementById("streak_progress").style.display =
                    "none";
            }
        };
    }
}

function revealPopularity(
    sideNum,
    animation = false,
    correct = false,
    forceShow = false
) {
    if (sideNum === 2) {
        const elGuessBtns = document.getElementsByClassName("guess_btn");

        elGuessBtns[0].style.display = elGuessBtns[1].style.display = "none";

        document.getElementById("right_progress").style.display = "initial";
    }

    const $elPopularity = $(`#${sideNum === 1 ? "left" : "right"}_popularity`),
        $elBar = $(`#${sideNum === 1 ? "left" : "right"}_bar`),
        onRevealComplete = () => {
            if (correct) {
                if (params.playSFX) {
                    CORRECT_SFX.volume = linearVolume / 2;
                    CORRECT_SFX.load();
                    CORRECT_SFX.play();
                }

                $elPopularity[0].style.animation = "bump 0.25s linear";
                $elPopularity[0].onanimationend = () => {
                    $elPopularity[0].style.animation = "initial";
                };
            }
        };

    $elPopularity.text("?");
    $elBar.css({
        transform: "rotate(45deg)",
        borderBottomColor: "initial",
        borderRightColor: "initial",
    });

    if (params.hidePopularity && !forceShow) {
        onRevealComplete();
        return;
    }

    const popularity = (
        mode === "songs"
            ? sideNum === 1
                ? trackData1
                : trackData2
            : mode === "albums"
            ? sideNum === 1
                ? albumData1
                : albumData2
            : sideNum === 1
            ? artistData1
            : artistData2
    ).popularity;

    if (!animation) {
        const barColor = getBarColor(popularity);

        $elBar.css({
            transform: "rotate(" + (45 + popularity * 1.8) + "deg)",
            borderBottomColor: barColor,
            borderRightColor: barColor,
        });
        $elPopularity.text(popularity);
    } else {
        $({ p: 0 }).animate(
            { p: popularity },
            {
                duration: POPULARITY_ANIMATION_DURATION * 1000,
                easing: "swing",
                step: (p) => {
                    const barColor = getBarColor(p);

                    $elBar.css({
                        transform: "rotate(" + (45 + p * 1.8) + "deg)",
                        borderBottomColor: barColor,
                        borderRightColor: barColor,
                    });
                    $elPopularity.text(p | 0);
                },
                complete: onRevealComplete,
            }
        );
    }
}

async function getRandomTrackData() {
    let trackData, invalidForSoundOnly;

    while (true) {
        if (!urlsLeft.length) throw "out of urls";
        try {
            trackData = await getData(getRandomUrl());
        } catch {
            continue;
        }

        invalidForSoundOnly =
            !trackData.preview_url ||
            (trackData.explicit && params.muteExplicit);

        if (trackData.popularity && (!params.soundOnly || !invalidForSoundOnly))
            break;
    }

    return trackData;
}

async function getRandomAlbumData() {
    let albumData, invalidForSoundOnly, validPreviewTracks;

    do {
        if (!urlsLeft.length) throw "out of urls";
        albumData = await getData(getRandomUrl());
        validPreviewTracks = albumData.tracks.items.filter(
            (track) =>
                track.preview_url && (!track.explicit || !params.muteExplicit)
        );

        invalidForSoundOnly = params.soundOnly && !validPreviewTracks.length;
    } while (!albumData.popularity || invalidForSoundOnly);

    if (validPreviewTracks.length) {
        const previewTrack =
            validPreviewTracks[
                Math.floor(Math.random() * validPreviewTracks.length)
            ];
        albumData.preview_track = previewTrack;
    } else albumData.preview_track = null;

    albumData.explicit = albumData.tracks.items.some((track) => track.explicit);

    return albumData;
}

async function getRandomArtistData() {
    let artistData, topTracks, invalidForSoundOnly;

    do {
        if (!urlsLeft.length) throw "out of urls";
        artistData = await getData(getRandomUrl());
        topTracks = await getData(
            `https://api.spotify.com/v1/artists/${artistData.id}/top-tracks?market=US`
        );
        topTracks = topTracks.filter(
            (track) =>
                track.preview_url &&
                track.artists[0].id === artistData.id &&
                (!params.muteExplicit || !track.explicit)
        );

        invalidForSoundOnly = params.soundOnly && !topTracks.length;
    } while (!artistData.popularity || invalidForSoundOnly);

    if (topTracks.length) {
        const previewTrack =
            topTracks[Math.floor(Math.random() * topTracks.length)];
        artistData.preview_track = previewTrack;
    } else artistData.preview_track = null;

    return artistData;
}

function nextRound() {
    const elVs = document.getElementById("vs");
    const elLeftHalf = document.getElementById("left_half");
    const elSlideHalves = document.getElementsByClassName("slide_half");
    const elGuessBtns = document.getElementsByClassName("guess_btn");
    const elRightProgress = document.getElementById("right_progress");
    const body = document.body;

    trackData1 = trackData2;
    trackData2 = trackDataTmp;

    albumData1 = albumData2;
    albumData2 = albumDataTmp;

    artistData1 = artistData2;
    artistData2 = artistDataTmp;

    elVs.style.animation = "vs_away 0.25s";

    const elLeftHalfClone = elLeftHalf.cloneNode(true);
    elLeftHalfClone.style.position = "fixed";
    elLeftHalfClone.style.zIndex = -1;
    body.appendChild(elLeftHalfClone);

    setTimeout(() => {
        elVs.style.display = "none";

        golden = false;
        updateSide(1);
        revealPopularity(1);
        golden =
            params.golds && !params.hardcore && Math.random() < GOLDEN_CHANCE;
        if (golden && params.playSFX) {
            GOLD_APPEAR_SFX.volume = linearVolume / 2;
            GOLD_APPEAR_SFX.load();
            GOLD_APPEAR_SFX.play();
        }
        updateSide(2, false);

        if (window.matchMedia("(orientation:portrait)").matches) {
            elSlideHalves[0].style.animation =
                elSlideHalves[1].style.animation = `slide_down_up ${SLIDE_HALVES_DURATION}s ease`;
            elSlideHalves[2].style.animation = `slide_up ${SLIDE_HALVES_DURATION}s ease`;
        } else {
            elSlideHalves[0].style.animation =
                elSlideHalves[1].style.animation = `slide_right_left ${SLIDE_HALVES_DURATION}s ease`;
            elSlideHalves[2].style.animation = `slide_left ${SLIDE_HALVES_DURATION}s ease`;
        }
        elSlideHalves[0].onanimationend = () => {
            elSlideHalves[0].style.animation = "initial";
        };
        elSlideHalves[1].onanimationend = () => {
            elSlideHalves[1].style.animation = "initial";
        };
        elSlideHalves[2].onanimationend = () => {
            elSlideHalves[2].style.animation = "initial";
        };

        elGuessBtns[0].style.display = elGuessBtns[1].style.display = "initial";
        document.getElementById("right_progress").style.display = "none";

        setTimeout(() => {
            elLeftHalfClone.remove();
            elVs.style.display = "flex";
            elVs.style.animation = "vs_back 0.25s";
        }, SLIDE_HALVES_DURATION * 1000);
    }, 0.25 * 1000);
}

function notEnoughResults() {
    alert("Not enough valid results");

    restart();
}

function noMoreItems() {
    alert("No more items");

    showRestart();
}

function gameOver() {
    if (params.soundOnly) {
        updateSide(1, true);
        updateSide(2, true);
    }
    if (params.hidePopularity) {
        revealPopularity(1, true, false, true);
        revealPopularity(2, true, false, true);
    }
    showRestart();
}

function showRestart() {
    document.getElementById("vs_container").style.display = "none";
    document.getElementById("restart").style.display = "initial";
}

function restart() {
    score = 0;
    document.getElementById("current_score").innerText = 0;

    const elGuessBtns = document.getElementsByClassName("guess_btn");

    elGuessBtns[0].style.display = elGuessBtns[1].style.display = "initial";
    document.getElementById("right_progress").style.display = "none";

    document.getElementById("track_player").src = "";

    const elHalves = document.getElementsByClassName("half"),
        elScore = document.getElementById("score");

    elHalves[0].style.display =
        elHalves[1].style.display =
        elScore.style.display =
            "none";

    document.getElementsByTagName("body")[0].className = "";

    document.getElementById("vs_container").style.display =
        document.getElementById("restart").style.display =
        document.getElementById("source").style.display =
        document.getElementById("top_info_container").style.display =
        document.getElementById("streak_progress").style.display =
        document.getElementById("user_action").style.display =
        document.getElementById("play_btn").style.display =
        document.getElementById("params").style.display =
        document.getElementById("modes").style.display =
            null;
    if (!signedIn)
        document.getElementById("sign_in_tutorial").style.display = null;
}

function toggleMute() {
    if (linearVolume > 0) {
        prevVolume = linearVolume;

        setVolume(0);
    } else setVolume(prevVolume);
}

function setVolume(newVolume) {
    const $elTrackPlayer = $("#track_player"),
        elMuteBtn = document.getElementById("mute_btn"),
        elAlbumArt1Btn = document.getElementById("album_art_1_btn"),
        elAlbumArt2Btn = document.getElementById("album_art_2_btn");

    if (newVolume === 0) {
        $elTrackPlayer[0].muted = true;
        elAlbumArt1Btn.classList.add("album_art_muted");
        elAlbumArt2Btn.classList.add("album_art_muted");
    } else {
        $elTrackPlayer[0].muted = false;
        elAlbumArt1Btn.classList.remove("album_art_muted");
        elAlbumArt2Btn.classList.remove("album_art_muted");
    }

    linearVolume = newVolume;
    volume = newVolume ** 2.75;

    document.getElementById("volume_slider").value = linearVolume * 100;
    localStorage.setItem("volume", linearVolume);

    $elTrackPlayer.stop();
    $elTrackPlayer[0].volume = volume;

    if (
        (window
            .getComputedStyle(document.documentElement)
            .getPropertyValue("--mobile") === "true" &&
            linearVolume > 0) ||
        linearVolume > 2 / 3
    )
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"></path><path d="M11.5 13.614a5.752 5.752 0 000-11.228v1.55a4.252 4.252 0 010 8.127v1.55z"></path></svg>';
    else if (linearVolume > 1 / 3)
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 6.087a4.502 4.502 0 000-8.474v1.65a2.999 2.999 0 010 5.175v1.649z"></path></svg>';
    else if (linearVolume > 0)
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"></path></svg>';
    else
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M13.86 5.47a.75.75 0 00-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 008.8 6.53L10.269 8l-1.47 1.47a.75.75 0 101.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 001.06-1.06L12.39 8l1.47-1.47a.75.75 0 000-1.06z"></path><path d="M10.116 1.5A.75.75 0 008.991.85l-6.925 4a3.642 3.642 0 00-1.33 4.967 3.639 3.639 0 001.33 1.332l6.925 4a.75.75 0 001.125-.649v-1.906a4.73 4.73 0 01-1.5-.694v1.3L2.817 9.852a2.141 2.141 0 01-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694V1.5z"></path></svg>';

    document.documentElement.style.setProperty(
        "--pulse_size",
        linearVolume === 0 ? 1 : 0.025 * volume + 1.025
    );
    document.documentElement.style.setProperty(
        "--volume_slider_offset",
        linearVolume * 100 + "%"
    );
    document.documentElement.style.setProperty(
        "--volume_slider_thumb_margin",
        2 * linearVolume - 1 + "dvh"
    );
}

function getParamKey() {
    let d = {
        mode,
        hardcore: params.hardcore,
        hidePopularity: params.hidePopularity,
        soundOnly: params.soundOnly,
    };
    if (params[mode].use === "search") {
        if (mode === "songs") d.difficulty = params[mode].difficulty;
        d.identifier = getQueryString(params[mode].query);
    } else if (params[mode].use === "user_playlist")
        d.identifier = `spotify:playlist:${params[mode].userPlaylistId}`;
    else if (params[mode].use === "featured_playlist")
        d.identifier = `spotify:playlist:${params[mode].featuredPlaylistId}`;
    else if (params[mode].use === "uri") d.identifier = params[mode].uri;
    else d.identifier = params[mode].use;

    return JSON.stringify(d);
}

function changeParams(newParams) {
    if (newParams.userPlaylistId !== undefined)
        document.getElementById("use_user_playlist").click();
    else if (newParams.featuredPlaylistId !== undefined)
        document.getElementById("use_featured_playlist").click();
    else if (newParams.query !== undefined)
        document.getElementById("use_search").click();
    else if (newParams.uri !== undefined)
        document.getElementById("use_uri").click();

    if (
        newParams.query &&
        newParams.query.years &&
        newParams.query.years === "-"
    )
        newParams.query.years = "";

    if (newParams.golds !== undefined) {
        params.golds = newParams.golds;
        delete newParams.golds;

        if (params.golds) {
            params.hardcore = false;
            document.getElementById("hardcore").checked = false;
        }
    } else if (newParams.hardcore !== undefined) {
        params.hardcore = newParams.hardcore;
        delete newParams.hardcore;

        if (params.hardcore) {
            params.zen = false;
            document.getElementById("zen").checked = false;
            params.golds = false;
            document.getElementById("golden_lives").checked = false;
        }
    } else if (newParams.hidePopularity !== undefined) {
        params.hidePopularity = newParams.hidePopularity;
        delete newParams.hidePopularity;
    } else if (newParams.soundOnly !== undefined) {
        params.soundOnly = newParams.soundOnly;
        delete newParams.soundOnly;
    } else if (newParams.zen !== undefined) {
        params.zen = newParams.zen;
        delete newParams.zen;

        if (params.zen) {
            params.hardcore = false;
            document.getElementById("hardcore").checked = false;
        }
    } else if (newParams.muteExplicit !== undefined) {
        params.muteExplicit = newParams.muteExplicit;
        delete newParams.muteExplicit;
    } else if (newParams.playSFX !== undefined) {
        params.playSFX = newParams.playSFX;
        delete newParams.playSFX;
    }

    params[mode] = { ...params[mode], ...newParams };

    localStorage.setItem("params", JSON.stringify(params));

    updatePlayValidity();
    updateHighScore();
}

function validYearsString(yearsString) {
    if (!yearsString) return true;

    const years = yearsString.split("-"),
        fromYear = parseInt(years[0]),
        toYear = parseInt(years[1]);

    return 0 <= fromYear && fromYear <= toYear && toYear <= CURR_YEAR;
}

function updatePlayValidity(forceDisable = false) {
    const elPlayBtn = document.getElementById("play_btn"),
        elAdvancedParams = document.getElementById("advanced_params");

    if (
        !forceDisable &&
        ((params[mode].use === "user_playlist" &&
            params[mode].userPlaylistId) ||
            (params[mode].use === "featured_playlist" &&
                params[mode].featuredPlaylistId) ||
            params[mode].use === "liked" ||
            params[mode].use === "top" ||
            (params[mode].use === "search" &&
                (mode === "albums"
                    ? params[mode].query.years
                    : params[mode].query.genres.length > 0)) ||
            (params[mode].use === "uri" &&
                (mode === "songs"
                    ? ALBUM_ARTIST_PLAYLIST_URI_REGEX
                    : ARTIST_URI_REGEX
                ).test(params[mode].uri)))
    ) {
        elPlayBtn.disabled = false;
        elPlayBtn.className = "valid_play_btn";
        document.getElementById("toggle_advanced_params").disabled = false;
    } else {
        if (
            !elAdvancedParams.style.visibility ||
            elAdvancedParams.style.visibility === "hidden"
        )
            toggleAdvancedParams();

        elPlayBtn.disabled = true;
        elPlayBtn.className = "";
        document.getElementById("toggle_advanced_params").disabled = true;
    }
}

function clearUriSearch() {
    document.getElementById("uri").value = "";
    document.getElementById("uri_search").value = "";
}

function updateUriPlaceholders() {
    if (mode === "artists") return;

    const elUri = document.getElementById("uri");

    if (mode === "albums") {
        elUri.placeholder = "spotify:artist:0gxyHStUsqpMadRV0Di1Qt";
        return;
    }

    switch (params[mode].uriSearch.type) {
        case "album":
            elUri.placeholder = "spotify:album:5Z9iiGl2FcIfa3BMiv6OIw";
            break;
        case "artist":
            elUri.placeholder = "spotify:artist:0gxyHStUsqpMadRV0Di1Qt";
            break;
        case "playlist":
            elUri.placeholder = "spotify:playlist:37i9dQZF1DZ06evO05tE88";
            break;
    }
}

function updateParamValidity() {
    const elUseLiked = document.getElementById("use_liked"),
        elUseTop = document.getElementById("use_top"),
        elUseLikedLabel = document.getElementById("use_liked_label"),
        elUseTopLabel = document.getElementById("use_top_label"),
        elUseUriLabel = document.getElementById("use_uri_label");

    elUseLikedLabel.style.color = elUseLiked.disabled = null;

    elUseTopLabel.style.color = elUseTop.disabled = null;

    document.querySelectorAll(".hide_songs").forEach((el) => {
        el.style.display = null;
    });

    document.querySelectorAll(".hide_albums").forEach((el) => {
        if (el.id !== "genre_tutorial" && el.id !== "artist_tutorial")
            el.style.display = null;
    });

    document.querySelectorAll(".hide_artists").forEach((el) => {
        if (el.id !== "genre_tutorial" && el.id !== "artist_tutorial")
            el.style.display = null;
    });

    elUseUriLabel.innerText = "Album/Artist/Playlist URI";

    updateUriPlaceholders();

    if (!signedIn) {
        elUseLikedLabel.style.color = "gray";
        elUseLiked.disabled = true;

        elUseTopLabel.style.color = "gray";
        elUseTop.disabled = true;

        if (
            params[mode].use === "user_playlist" ||
            params[mode].use === "liked" ||
            params[mode].use === "top"
        )
            document.getElementById("use_search").click();
    }

    if (mode === "songs") {
        document.querySelectorAll(".hide_songs").forEach((el) => {
            el.style.display = "none";
        });
        document.getElementById("use_search_label").textContent = "Genre";
        document.getElementById("genres").setAttribute("multiple", "true");
        document.getElementById("genres").setAttribute("size", "8");
        if (
            mode === "songs" &&
            localStorage.getItem("show_genre_tutorial") !== "false"
        )
            document.getElementById("genre_tutorial").style.display = null;
        if (
            mode === "songs" &&
            localStorage.getItem("show_artist_tutorial") !== "false"
        )
            document.getElementById("artist_tutorial").style.display = null;
    } else if (mode === "albums") {
        elUseUriLabel.innerText = "Artist URI";

        document.querySelectorAll(".hide_albums").forEach((el) => {
            el.style.display = "none";
        });

        document.getElementById("use_search_label").textContent = "Years";

        // if (
        //     params[mode].use === "user_playlist" ||
        //     params[mode].use === "featured_playlist" ||
        //     params[mode].use === "top"
        // )
        //     document.getElementById("use_search").click();
    } else if (mode === "artists") {
        document.querySelectorAll(".hide_artists").forEach((el) => {
            el.style.display = "none";
        });
        document.getElementById("use_search_label").textContent = "Genre";
        document.getElementById("genres").removeAttribute("multiple");
        document.getElementById("genres").removeAttribute("size");

        // if (
        //     params[mode].use === "user_playlist" ||
        //     params[mode].use === "liked" ||
        //     params[mode].use === "featured_playlist" ||
        //     params[mode].use === "uri"
        // )
        //     document.getElementById("use_search").click();
    }
}

function updateHighScore() {
    if (params.zen) {
        document.getElementById("high_score").style.visibility = "hidden";
    } else {
        document.getElementById("high_score").style.visibility = "visible";
        paramKey = getParamKey();
        document.getElementById("current_high_score").innerText =
            "High: " + (highScores[paramKey] ?? 0);
    }
}

// function allYears() {
//     const elFromYear = document.getElementById("from_year"),
//         elToYear = document.getElementById("to_year");
//     elFromYear.max = CURR_YEAR;
//     elToYear.min = 1000;
//     elFromYear.value = 1000;
//     elToYear.value = CURR_YEAR;
//     changeParams({
//         query: { ...params[mode].query, years: `1000-${CURR_YEAR}` },
//     });
// }

function randomUserPlaylist() {
    const elUserPlaylist = document.getElementById("user_playlist");

    if (elUserPlaylist.length === 1) return;

    elUserPlaylist.selectedIndex = Math.floor(
        Math.random() * (elUserPlaylist.length - 1) + 1
    );
    changeParams({ userPlaylistId: elUserPlaylist.value });
}

function randomFeaturedPlaylist() {
    const elFeaturedPlaylist = document.getElementById("featured_playlist");

    if (elFeaturedPlaylist.length === 1) return;

    elFeaturedPlaylist.selectedIndex = Math.floor(
        Math.random() * (elFeaturedPlaylist.length - 1) + 1
    );
    changeParams({ featuredPlaylistId: elFeaturedPlaylist.value });
}

// function resetGenre() {
//     const elGenres = document.getElementById("genres");
//     elGenres.selectedIndex = 0;
//     changeParams({
//         query: { ...params[mode].query, genres: DEFAULT_PARAMS[mode].genres },
//     });
// }

function hideGenreTutorial() {
    document.getElementById("genre_tutorial").style.display = "none";
    localStorage.setItem("show_genre_tutorial", "false");
}

function hideArtistTutorial() {
    document.getElementById("artist_tutorial").style.display = "none";
    localStorage.setItem("show_artist_tutorial", "false");
}

function toggleAdvancedParams() {
    const elAdvancedParams = document.getElementById("advanced_params"),
        elResetParams = document.getElementById("reset_params");

    if (
        !elAdvancedParams.style.visibility ||
        elAdvancedParams.style.visibility === "hidden"
    ) {
        elAdvancedParams.style.visibility = "visible";
        elResetParams.style.visibility = "visible";
        document.getElementById("toggle_advanced_params").innerText =
            "Hide Advanced";
    } else {
        elAdvancedParams.style.visibility = "hidden";
        elResetParams.style.visibility = "hidden";
        document.getElementById("toggle_advanced_params").innerText =
            "Show Advanced";
    }

    localStorage.setItem(
        "advanced_params_visibility",
        elAdvancedParams.style.visibility
    );
}

function signOut() {
    localStorage.setItem("signed_in", false);
    location.reload();
}

function signIn(showDialog = false) {
    window.location = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join(
        "%20"
    )}&response_type=token&show_dialog=${showDialog}`;
}

function resetParams() {
    changeParams({
        ...DEFAULT_PARAMS[mode],
        golds: params.golds,
        hardcore: params.hardcore,
        hidePopularity: params.hidePopularity,
        soundOnly: params.soundOnly,
        zen: params.zen,
    });

    updateParams();
    updateUriPlaceholders();
}

function changeMode(newMode) {
    mode = newMode;
    localStorage.setItem("mode", mode);

    updateParams();
    updateParamValidity();
    updatePlayValidity();
    updateHighScore();
}

async function uriSearch(clear = false) {
    const elUri = document.getElementById("uri");

    elUri.value = "";
    elUri.oninput();

    if (clear || !params[mode].uriSearch.q) return;

    const elUriSearch = document.getElementById("uri_search"),
        type = mode === "songs" ? params[mode].uriSearch.type : "artist",
        searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            params[mode].uriSearch.q
        )}&type=${type}&market=US&offset=0`,
        data = await getData(searchUrl, false),
        item = data[Object.keys(data)[0]].items[0];

    elUriSearch.value = item?.name ?? elUriSearch.value;
    elUriSearch.oninput();

    elUri.value = item?.uri ?? "";
    elUri.oninput();

    if (type === "artist" && elUri.value) hideArtistTutorial();
}
