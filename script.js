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

const _token = hash.access_token;

if (!_token) {
    window.location = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join(
        "%20"
    )}&response_type=token`;
}

let params,
    userData,
    trackData1,
    trackData2,
    albumCover,
    trackDataTmp,
    fadeInNext,
    urlsLeft,
    volume,
    highScore,
    score = 0,
    prevVolume = (2 / 3) * MAX_VOLUME,
    muted = false;

// $(document).tooltip({show: null});

getUserData().then((data) => {
    userData = data;

    document.getElementById("user_image_container").innerHTML = userData.images
        .length
        ? `<img id="user_image" src="${userData.images[0].url}" />`
        : '<svg id="default_user_image" viewBox="0 0 18 20"><path d="M15.216 13.717L12 11.869C11.823 11.768 11.772 11.607 11.757 11.521C11.742 11.435 11.737 11.267 11.869 11.111L13.18 9.57401C14.031 8.58001 14.5 7.31101 14.5 6.00001V5.50001C14.5 3.98501 13.866 2.52301 12.761 1.48601C11.64 0.435011 10.173 -0.0879888 8.636 0.0110112C5.756 0.198011 3.501 2.68401 3.501 5.67101V6.00001C3.501 7.31101 3.97 8.58001 4.82 9.57401L6.131 11.111C6.264 11.266 6.258 11.434 6.243 11.521C6.228 11.607 6.177 11.768 5.999 11.869L2.786 13.716C1.067 14.692 0 16.526 0 18.501V20H1V18.501C1 16.885 1.874 15.385 3.283 14.584L6.498 12.736C6.886 12.513 7.152 12.132 7.228 11.691C7.304 11.251 7.182 10.802 6.891 10.462L5.579 8.92501C4.883 8.11101 4.499 7.07201 4.499 6.00001V5.67101C4.499 3.21001 6.344 1.16201 8.699 1.00901C9.961 0.928011 11.159 1.35601 12.076 2.21501C12.994 3.07601 13.5 4.24301 13.5 5.50001V6.00001C13.5 7.07201 13.117 8.11101 12.42 8.92501L11.109 10.462C10.819 10.803 10.696 11.251 10.772 11.691C10.849 12.132 11.115 12.513 11.503 12.736L14.721 14.585C16.127 15.384 17.001 16.884 17.001 18.501V20H18.001V18.501C18 16.526 16.932 14.692 15.216 13.717Z"></path></svg>';
    document.getElementById("user_display_name").innerText =
        userData.display_name;
});

window.onload = () => {
    params = JSON.parse(localStorage.getItem("params")) ?? DEFAULT_PARAMS;

    Promise.all([getGenres(), getUserPlaylists(), getFeaturedPlaylists()]).then(
        (values) => {
            const elGenre = document.getElementById("genre");

            elGenre.innerHTML = "<option selected></option>";

            if (!values[0].genres.length)
                document.getElementById("genre_random").disabled = true;
            else {
                for (const genre of values[0].genres)
                    elGenre.add(
                        new Option(
                            genre
                                .split("-")
                                .map(
                                    (s) =>
                                        s.charAt(0).toUpperCase() +
                                        s.substring(1)
                                )
                                .join(" "),
                            genre
                        )
                    );

                if (!values[0].genres.includes(params.query.genre))
                    params.query.genre = DEFAULT_PARAMS.query.genre;
            }

            const elUserPlaylist = document.getElementById("user_playlist");

            elUserPlaylist.innerHTML = "<option selected></option>";

            if (!values[1].items.length)
                document.getElementById("user_playlist_random").disabled = true;
            else {
                for (const userPlaylist of values[1].items)
                    elUserPlaylist.add(
                        new Option(userPlaylist.name, userPlaylist.id)
                    );

                if (
                    !values[1].items.some(
                        (userPlaylist) =>
                            userPlaylist.id === params.userPlaylistId
                    )
                )
                    params.userPlaylistId = DEFAULT_PARAMS.userPlaylistId;
            }

            document.getElementById("use_featured_playlist_label").innerText =
                values[2].message;

            const elFeaturedPlaylist =
                document.getElementById("featured_playlist");

            elFeaturedPlaylist.innerHTML = "<option selected></option>";

            if (!values[2].playlists.items.length)
                document.getElementById(
                    "featured_playlist_random"
                ).disabled = true;
            else {
                for (const featuredPlaylist of values[2].playlists.items)
                    elFeaturedPlaylist.add(
                        new Option(featuredPlaylist.name, featuredPlaylist.id)
                    );

                if (
                    !values[2].playlists.items.some(
                        (featuredPlaylist) =>
                            featuredPlaylist.id === params.featuredPlaylistId
                    )
                )
                    params.featuredPlaylistId =
                        DEFAULT_PARAMS.featuredPlaylistId;
            }

            updateParams();
        }
    );

    setVolume(Number(localStorage.getItem("volume") ?? DEFAULT_VOLUME));

    highScore = Number(localStorage.getItem("highScore") ?? 0);
    document.getElementById("current_high_score").innerText =
        "High: " + highScore;

    document.getElementById("mute_explicit").checked = params.muteExplicit;
    document.getElementById("sound_only").checked = params.soundOnly;

    updatePlayValidity();

    const advancedParamsVisibility =
        document.getElementById("advanced_params").style.visibility;

    if (
        localStorage.getItem("advanced_params_visibility") === "visible" &&
        (!advancedParamsVisibility || advancedParamsVisibility === "hidden")
    )
        toggleAdvancedParams();
};

function updateParams() {
    document.getElementById("genre").value = params.query.genre;
    document.getElementById("user_playlist").value = params.userPlaylistId;
    document.getElementById("featured_playlist").value =
        params.featuredPlaylistId;

    const elFromYear = document.getElementById("from_year"),
        elToYear = document.getElementById("to_year");

    elToYear.max = CURR_YEAR;

    document.getElementById("album_playlist_uri").value =
        params.albumPlaylistURI;

    const elMaxSearchResults = document.getElementById("max_search_results");

    elMaxSearchResults.value = params.maxSearchResults;
    elMaxSearchResults.nextElementSibling.innerText = `Max Search Results (${params.maxSearchResults})`;

    const years = params.query.year.split("-");

    elFromYear.value = years[0];
    elToYear.value = years[1] ?? "";
    elFromYear.max = elToYear.value;
    elToYear.min = elFromYear.value;

    switch (params.use) {
        case "search":
            document.getElementById("use_search").checked = true;
            break;
        case "album_playlist":
            document.getElementById("use_album_playlist").checked = true;
            break;
        case "user_playlist":
            document.getElementById("use_user_playlist").checked = true;
            break;
        case "featured_playlist":
            document.getElementById("use_featured_playlist").checked = true;
            break;
        case "liked_songs":
            document.getElementById("use_liked_songs").checked = true;
            break;
        case "top_songs":
            document.getElementById("use_top_songs").checked = true;
            break;
    }
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
        "rgba(0, 0, 0, 0))"
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
        "rgba(0, 0, 0, 0))"
    );
}

function trackPlayerTimeUpdated(currentTime) {
    if (volume === 0) return;

    if (fadeInNext && 0 <= currentTime && currentTime < SAMPLE_FADE_DURATION)
        fadeIn();
    else if (
        !fadeInNext &&
        SAMPLE_DURATION - SAMPLE_FADE_DURATION <= currentTime &&
        currentTime < SAMPLE_DURATION
    )
        fadeOut();
}

function fadeIn() {
    const $elTrackPlayer = $("#track_player");

    $elTrackPlayer.stop();
    $elTrackPlayer.animate(
        { volume },
        (SAMPLE_FADE_DURATION - $elTrackPlayer[0].currentTime) * 1000
    );

    fadeInNext = false;
}

function fadeOut() {
    const $elTrackPlayer = $("#track_player");

    $elTrackPlayer.stop();
    $elTrackPlayer.animate(
        { volume: 0 },
        (SAMPLE_DURATION - $elTrackPlayer[0].currentTime) * 1000
    );

    fadeInNext = true;
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
            url: "https://api.spotify.com/v1/browse/featured-playlists?locale=en&limit=50",
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
    document.getElementById("play_btn").style.display = document.getElementById(
        "params"
    ).style.display = "none";

    urlsLeft = [];
    if (await loadUrls()) return;

    try {
        [trackData1, trackData2] = await Promise.all([
            getRandomTrackData(),
            getRandomTrackData(),
        ]);
    } catch (e) {
        return notEnoughResults();
    }

    document.getElementsByTagName("body")[0].className = "adaptive";

    const elHalves = document.getElementsByClassName("half"),
        elScore = document.getElementById("score");

    elHalves[0].style.display = elHalves[1].style.display = "flex";
    elScore.style.display = "initial";
    document.getElementById("vs_container").style.display = "flex";
    document.getElementById("change_user").style.display = "none";
    document.getElementById("spotify").style.display = "flex";
    document.getElementById("source").style.display = "flex";

    updateSide(1);
    revealTrackPopularity(1, true);
    updateSide(2);
}

async function loadUrls() {
    switch (params.use) {
        case "user_playlist": {
            const userPlayListData = await getData(
                    `https://api.spotify.com/v1/playlists/${params.userPlaylistId}?fields=external_urls%2Cimages%2Cname%2Ctracks(total)`,
                    false
                ),
                maxOffset = userPlayListData.tracks.total;

            const elSourceImg = document.getElementById("source_img");

            document.getElementById("source").href =
                userPlayListData.external_urls.spotify;
            document.getElementById("source_img_search").style.display = "none";
            elSourceImg.style.display = "initial";
            elSourceImg.src = userPlayListData.images[0].url;
            document.getElementById("source_text").innerText = `${
                userPlayListData.name.length >= 20
                    ? userPlayListData.name.substring(0, 19) + "..."
                    : userPlayListData.name
            } (${maxOffset})`;

            for (let offset = 0; offset < maxOffset; ++offset)
                urlsLeft.push(
                    `https://api.spotify.com/v1/playlists/${params.userPlaylistId}/tracks?fields=items&limit=1&offset=${offset}`
                );
            break;
        }
        case "featured_playlist": {
            const featuredPlayListData = await getData(
                    `https://api.spotify.com/v1/playlists/${params.featuredPlaylistId}?fields=external_urls%2Cimages%2Cname%2Ctracks(total)`,
                    false
                ),
                maxOffset = featuredPlayListData.tracks.total;

            const elSourceImg = document.getElementById("source_img");

            document.getElementById("source").href =
                featuredPlayListData.external_urls.spotify;
            document.getElementById("source_img_search").style.display = "none";
            elSourceImg.style.display = "initial";
            elSourceImg.src = featuredPlayListData.images[0].url;
            document.getElementById("source_text").innerText = `${
                featuredPlayListData.name.length >= 20
                    ? featuredPlayListData.name.substring(0, 19) + "..."
                    : featuredPlayListData.name
            } (${maxOffset})`;

            for (let offset = 0; offset < maxOffset; ++offset)
                urlsLeft.push(
                    `https://api.spotify.com/v1/playlists/${params.featuredPlaylistId}/tracks?fields=items&limit=1&offset=${offset}`
                );
            break;
        }
        case "liked_songs": {
            const maxOffset = (
                await getData(
                    `https://api.spotify.com/v1/me/tracks?limit=1`,
                    false
                )
            ).total;

            const elSourceImg = document.getElementById("source_img");

            document.getElementById("source").href =
                "https://open.spotify.com/collection/tracks";
            document.getElementById("source_img_search").style.display = "none";
            elSourceImg.style.display = "initial";
            elSourceImg.src =
                "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png";
            document.getElementById(
                "source_text"
            ).innerText = `Liked Songs (${maxOffset})`;

            for (let offset = 0; offset < maxOffset; ++offset)
                urlsLeft.push(
                    `https://api.spotify.com/v1/me/tracks?limit=1&offset=${offset}`
                );
            break;
        }
        case "top_songs": {
            const maxOffset = (
                await getData(
                    `https://api.spotify.com/v1/me/top/tracks?limit=1`,
                    false
                )
            ).total;

            const elSourceImg = document.getElementById("source_img");

            document.getElementById("source").href =
                "https://open.spotify.com/collection";
            document.getElementById("source_img_search").style.display = "none";
            elSourceImg.style.display = "initial";
            elSourceImg.src =
                "https://play-lh.googleusercontent.com/OO06tTnQyEckM3dUDbHqmWXpI-7IbYlodDxVR7L4buzOX6KQvAeTJEV_Q45cznM63mJ-";
            document.getElementById(
                "source_text"
            ).innerText = `Top Songs (${maxOffset})`;

            for (let offset = 0; offset < maxOffset; ++offset)
                urlsLeft.push(
                    `https://api.spotify.com/v1/me/top/tracks?limit=1&offset=${offset}`
                );
            break;
        }
        case "album_playlist": {
            const albumPlaylistURIParts = params.albumPlaylistURI.split(":"),
                albumPlaylistString = albumPlaylistURIParts[1],
                albumPlaylistId = albumPlaylistURIParts[2];

            let albumPlaylistData,
                isAlbum = false;

            if (albumPlaylistString === "album") {
                try {
                    albumPlaylistData = await getData(
                        `https://api.spotify.com/v1/albums/${albumPlaylistId}`,
                        false
                    );
                } catch {
                    alert("Invalid album ID");
                    return true;
                }
                albumCover = albumPlaylistData.images[0].url;
                isAlbum = true;
            } else if (albumPlaylistString === "playlist") {
                try {
                    albumPlaylistData = await getData(
                        `https://api.spotify.com/v1/playlists/${albumPlaylistId}?fields=external_urls%2Cimages%2Cname%2Ctracks(total)`,
                        false
                    );
                } catch {
                    alert("Invalid playlist ID");
                    return true;
                }
            } else {
                alert("Invalid URI (format: spotify:album/playlist:id)");
                return true;
            }

            const maxOffset = albumPlaylistData.tracks.total;

            const elSourceImg = document.getElementById("source_img");

            document.getElementById("source").href =
                albumPlaylistData.external_urls.spotify;
            document.getElementById("source_img_search").style.display = "none";
            elSourceImg.style.display = "initial";
            elSourceImg.src = albumPlaylistData.images[0].url;
            document.getElementById("source_text").innerText = `${
                albumPlaylistData.name.length >= 20
                    ? albumPlaylistData.name.substring(0, 19) + "..."
                    : albumPlaylistData.name
            } (${maxOffset})`;

            for (let offset = 0; offset < maxOffset; ++offset)
                urlsLeft.push(
                    isAlbum
                        ? `https://api.spotify.com/v1/albums/${albumPlaylistId}/tracks?limit=1&offset=${offset}`
                        : `https://api.spotify.com/v1/playlists/${albumPlaylistId}/tracks?fields=items&limit=1&offset=${offset}`
                );
            break;
        }
        case "search": {
            const queryString = encodeURIComponent(
                    Object.keys(params.query)
                        .filter((key) => params.query[key])
                        .map((key) => `${key}:"${params.query[key]}"`)
                        .join("+")
                ),
                maxOffset = (
                    await getData(
                        `https://api.spotify.com/v1/search?q=${queryString}&type=track&limit=1`,
                        false
                    )
                ).tracks.total,
                lastOffset = Math.min(maxOffset, params.maxSearchResults);

            document.getElementById("source_img").style.display = "none";
            document.getElementById("source_img_search").style.display =
                "initial";

            document.getElementById("source").href =
                "https://open.spotify.com/search/" + queryString + "/tracks";
            document.getElementById("source_text").innerText =
                JSON.stringify(params.query) ===
                JSON.stringify(DEFAULT_PARAMS.query)
                    ? `Last Decade (${lastOffset})`
                    : `Custom Search (${lastOffset})`;

            for (let offset = 0; offset < lastOffset; ++offset)
                urlsLeft.push(
                    `https://api.spotify.com/v1/search?q=${queryString}&type=track&limit=1&offset=${offset}`
                );
            break;
        }
    }
}

function getData(url, returnFirstTrack = true) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url,
            type: "GET",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
            success: (data) => {
                if (!returnFirstTrack) return resolve(data);

                const trackData =
                    data.tracks?.items[0] ??
                    data.items?.[0].track ??
                    data.items?.[0];

                if (trackData && trackData.preview_url && trackData.popularity)
                    resolve(trackData);
                else {
                    $.ajax({
                        url:
                            "https://api.spotify.com/v1/tracks/" + trackData.id,
                        type: "GET",
                        beforeSend: (xhr) => {
                            xhr.setRequestHeader(
                                "Authorization",
                                "Bearer " + _token
                            );
                        },
                        success: (trackData) => {
                            resolve(trackData);
                        },
                    });
                }
            },
            error: reject,
        });
    });
}

function getRandomUrl() {
    const index = Math.floor(Math.random() * urlsLeft.length),
        url = urlsLeft[index],
        lastUrl = urlsLeft.pop();

    if (index !== urlsLeft.length) urlsLeft[index] = lastUrl;

    return url;
}

function getBarColor(p) {
    return `hsl(${p * 3.3}, 100%, 50%)`;
}

function updateSide(sideNum) {
    const trackData = sideNum === 1 ? trackData1 : trackData2,
        noAudio =
            (params.muteExplicit && trackData.explicit) ||
            !trackData.preview_url,
        elAlbumArtBtn = document.getElementById(`album_art_${sideNum}_btn`),
        elTrackPlayer = document.getElementById("track_player");

    if (noAudio) {
        elAlbumArtBtn.style.opacity = 0.5;
        elAlbumArtBtn.disabled = true;
        elAlbumArtBtn.className = "";
        elAlbumArtBtn.style.animation = "initial";
    } else {
        elAlbumArtBtn.style.opacity = 1;
        elAlbumArtBtn.disabled = false;
        elAlbumArtBtn.className = "album_art_hover";
    }

    if (sideNum === 2 && !noAudio) playTrack(2);
    else elTrackPlayer.src = "";

    const elHalf = document.getElementById(
            `${sideNum === 1 ? "left" : "right"}_half`
        ),
        elAlbumArt = document.getElementById(`album_art_${sideNum}`),
        albumArtUrl = trackData.album?.images[0].url ?? albumCover;

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

    if (!params.soundOnly) {
        if (sideNum === 1 && score > 0) {
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
    if (!params.soundOnly) elAlbumArt.src = albumArtUrl;
    else {
        elAlbumArt.style.visibility = "hidden";
        elAlbumArtBtn.style.outline = "0.25vh solid #fff";
    }

    const elTrackTitle = document.getElementById(`track_title_${sideNum}`),
        elTrackInfo = document.getElementById(
            `${sideNum === 1 ? "left" : "right"}_track_info`
        );

    elTrackTitle.innerText = !params.soundOnly ? trackData.name : "";
    elTrackTitle.href = !params.soundOnly
        ? trackData.external_urls.spotify
        : "";

    const trackTitleWidth = elTrackTitle.scrollWidth,
        trackInfoWidth = elTrackInfo.offsetWidth,
        gradientWidth = elTrackRightGradient.offsetWidth,
        threeHalvesVh = 0.015 * document.documentElement.clientHeight;

    elTrackTitle.style.animation = "initial";
    if (trackTitleWidth > trackInfoWidth - threeHalvesVh - gradientWidth) {
        const titleMarqueeProperty = `--marquee_title_${sideNum}_distance`,
            titleMarqueeDistance =
                trackTitleWidth -
                (trackInfoWidth - threeHalvesVh - gradientWidth);
        document.documentElement.style.setProperty(
            titleMarqueeProperty,
            `${-titleMarqueeDistance}px`
        );

        const titleMarqueeDuration = titleMarqueeDistance / 20,
            titleAnimation = `${titleMarqueeDuration}s linear infinite alternate marquee_title_${sideNum}`;

        elTrackTitle.style.animation = titleAnimation;
        elTrackTitle.onanimationiteration = () => {
            elTrackTitle.style.animationPlayState = "paused";
            setTimeout(() => {
                elTrackTitle.style.animationPlayState = "running";
            }, MARQUEE_PAUSE_DURATION * 1000);
        };
    }

    const elArtist = document.getElementById(`artist_${sideNum}`);

    elArtist.innerHTML = "";

    if (!params.soundOnly) {
        for (let i = 0; i < trackData.artists.length; ++i) {
            const artist = trackData.artists[i],
                elA = document.createElement("a");

            elA.innerText = artist.name;
            elA.href = artist.external_urls.spotify;
            elA.target = "_blank";
            elA.className = "artist_link";
            elA.draggable = false;

            elArtist.appendChild(elA);

            if (i != trackData.artists.length - 1) {
                const elTextNode = document.createTextNode(", ");

                elArtist.appendChild(elTextNode);
            }
        }
    }

    const artistWidth = elArtist.scrollWidth;

    elArtist.style.animation = "initial";
    if (artistWidth > trackInfoWidth - threeHalvesVh - gradientWidth) {
        const artistMarqueeProperty = `--marquee_artist_${sideNum}_distance`,
            artistMarqueeDistance =
                artistWidth - (trackInfoWidth - threeHalvesVh - gradientWidth);
        document.documentElement.style.setProperty(
            artistMarqueeProperty,
            `${-artistMarqueeDistance}px`
        );

        const artistMarqueeDuration = artistMarqueeDistance / 20,
            artistAnimation = `${artistMarqueeDuration}s linear infinite alternate marquee_artist_${sideNum}`;

        elArtist.style.animation = artistAnimation;
        elArtist.onanimationiteration = () => {
            elArtist.style.animationPlayState = "paused";
            setTimeout(() => {
                elArtist.style.animationPlayState = "running";
            }, MARQUEE_PAUSE_DURATION * 1000);
        };
    }

    const elLikeBtn = document.getElementById(`like_btn_${sideNum}`);

    hasTrackSaved(trackData.id).then((trackSaved) => {
        if (trackSaved[0])
            elLikeBtn.innerHTML =
                '<svg class="liked_svg" viewBox="0 0 16 16"><path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"></path></svg>';
        else
            elLikeBtn.innerHTML =
                '<svg viewBox="0 0 16 16"><path d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"></path></svg>';
    });
}

function clickTrack(elAlbumArtBtn, sideNum) {
    const elTrackPlayer = document.getElementById("track_player"),
        trackData = sideNum === 1 ? trackData1 : trackData2;

    if (elTrackPlayer.src === trackData.preview_url) {
        elTrackPlayer.src = "";
        elAlbumArtBtn.onmouseout = () => {
            if (elTrackPlayer.src !== trackData.preview_url)
                elAlbumArtBtn.className = "album_art_hover";
            elAlbumArtBtn.onmouseout = () => {};
        };
        elAlbumArtBtn.style.animation = "initial";
    } else {
        if (volume === 0) toggleMute();

        playTrack(sideNum);
    }
}

function playTrack(sideNum) {
    const elTrackPlayer = document.getElementById("track_player");

    elTrackPlayer.src = (sideNum === 1 ? trackData1 : trackData2).preview_url;
    elTrackPlayer.volume = 0;
    fadeInNext = true;

    const elAlbumArtBtn = document.getElementById(`album_art_${sideNum}_btn`),
        elAlbumArtBtnOther = document.getElementById(
            `album_art_${sideNum === 1 ? 2 : 1}_btn`
        );

    elAlbumArtBtn.className = "";
    elAlbumArtBtn.style.animation =
        "pulse var(--pulse_duration) infinite ease-in-out";

    const trackDataOther = sideNum === 1 ? trackData2 : trackData1;

    if (
        trackDataOther.preview_url &&
        !(params.muteExplicit && trackDataOther.explicit)
    )
        elAlbumArtBtnOther.className = "album_art_hover";

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

function likeTrack(elLikeBtn, sideNum) {
    const trackData = sideNum === 1 ? trackData1 : trackData2;

    if (
        elLikeBtn.firstChild.className &&
        elLikeBtn.firstChild.className.baseVal === "liked_svg"
    )
        $.ajax({
            url: "https://api.spotify.com/v1/me/tracks?ids=" + trackData.id,
            type: "DELETE",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
            success: () => {
                elLikeBtn.style.animation = "unlike 0.2s ease-in";
                setTimeout(() => {
                    elLikeBtn.innerHTML =
                        '<svg viewBox="0 0 16 16"><path d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"></path></svg>';
                }, 0.2 * 1000);
            },
        });
    else
        $.ajax({
            url: "https://api.spotify.com/v1/me/tracks?ids=" + trackData.id,
            type: "PUT",
            beforeSend: (xhr) => {
                xhr.setRequestHeader("Authorization", "Bearer " + _token);
            },
            success: () => {
                elLikeBtn.style.animation = "like 0.1s ease-in";
                setTimeout(() => {
                    elLikeBtn.innerHTML =
                        '<svg class="liked_svg" viewBox="0 0 16 16"><path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"></path></svg>';
                }, 0.1 * 1000);
            },
        });
}

function checkGuess(higher) {
    const correct = higher
        ? trackData2.popularity >= trackData1.popularity
        : trackData2.popularity <= trackData1.popularity;

    revealTrackPopularity(2, true, correct);

    let checkPromises = [
        new Promise((resolve) =>
            setTimeout(
                resolve,
                (POPULARITY_ANIMATION_DURATION + SHOW_POPULARITY_DURATION) *
                    1000
            )
        ),
    ];

    if (correct)
        checkPromises.push(
            new Promise(async (resolve) => {
                trackDataTmp = await getRandomTrackData();
                resolve();
            })
        );

    Promise.all(checkPromises)
        .then(correct ? nextRound : gameOver)
        .catch(noMoreTracks);
}

function revealTrackPopularity(sideNum, animation = false, correct = false) {
    const $elPopularity = $(`#${sideNum === 1 ? "left" : "right"}_popularity`),
        $elBar = $(`#${sideNum === 1 ? "left" : "right"}_bar`);

    if (sideNum === 2) {
        const elGuessBtns = document.getElementsByClassName("guess_btn");

        elGuessBtns[0].style.display = elGuessBtns[1].style.display = "none";

        document.getElementById("right_progress").style.display = "initial";
    }

    const trackData = sideNum === 1 ? trackData1 : trackData2;

    if (!animation) {
        const barColor = getBarColor(trackData.popularity);

        $elBar.css({
            transform: "rotate(" + (45 + trackData.popularity * 1.8) + "deg)",
            borderBottomColor: barColor,
            borderRightColor: barColor,
        });
        $elPopularity.text(trackData.popularity);
    } else {
        $({ p: 0 }).animate(
            { p: trackData.popularity },
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
                complete: () => {
                    if (correct) {
                        $elPopularity[0].style.animation = "bump 0.25s linear";
                        $elPopularity[0].onanimationend = () => {
                            $elPopularity[0].style.animation = "initial";
                        };
                    }
                },
            }
        );
    }
}

async function getRandomTrackData() {
    let trackData, invalidForSoundOnly;

    do {
        if (!urlsLeft.length) throw "out of urls";
        trackData = await getData(getRandomUrl());
        invalidForSoundOnly =
            !trackData.preview_url ||
            (trackData.explicit && params.muteExplicit);
    } while (
        !trackData.popularity ||
        (params.soundOnly && invalidForSoundOnly)
    );

    return trackData;
}

function nextRound() {
    const elCurrentScore = document.getElementById("current_score"),
        elCurrentHighScore = document.getElementById("current_high_score");

    ++score;
    elCurrentScore.style.animation = "bump 0.25s linear";
    elCurrentScore.onanimationend = () => {
        elCurrentScore.style.animation = "initial";
    };
    setTimeout(() => {
        elCurrentScore.innerText = score;
    }, 0.125 * 1000);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        elCurrentHighScore.style.animation = "bump 0.25s linear";
        elCurrentHighScore.onanimationend = () => {
            elCurrentHighScore.style.animation = "initial";
        };
        setTimeout(() => {
            elCurrentHighScore.innerText = "High: " + highScore;
        }, 0.125 * 1000);
    }

    trackData1 = trackData2;
    trackData2 = trackDataTmp;

    const elVs = document.getElementById("vs");

    elVs.style.animation = "vs_away 0.25s";

    setTimeout(() => {
        elVs.style.display = "none";

        const elLeftHalfClone = document
            .getElementById("left_half")
            .cloneNode(true);

        elLeftHalfClone.style.position = "fixed";
        elLeftHalfClone.style.zIndex = -1;

        updateSide(1);
        revealTrackPopularity(1);
        updateSide(2);

        document.getElementsByTagName("body")[0].appendChild(elLeftHalfClone);

        const elSlideHalves = document.getElementsByClassName("slide_half");

        if (window.matchMedia("(max-width: 950px)").matches) {
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

        const elGuessBtns = document.getElementsByClassName("guess_btn");

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
    alert("Not enough results with current criteria");

    restart();
}

function noMoreTracks() {
    alert("No more tracks with current criteria");

    showRestart();
}

function gameOver() {
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

    document.getElementById("vs_container").style.display = "none";
    document.getElementById("restart").style.display = "none";
    document.getElementById("source").style.display = "none";
    document.getElementById("spotify").style.display = "none";
    document.getElementById("change_user").style.display = "initial";
    document.getElementById("play_btn").style.display = "flex";
    document.getElementById("params").style.display = "initial";
}

function toggleMute() {
    if (volume > 0) {
        prevVolume = volume;

        setVolume(0);
    } else {
        setVolume(prevVolume);
    }
}

function setVolume(newVolume) {
    const $elTrackPlayer = $("#track_player"),
        currVolume = $elTrackPlayer[0].volume,
        oldVolume = volume,
        elMuteBtn = document.getElementById("mute_btn");

    volume = newVolume;
    document.getElementById("volume_slider").value =
        (volume / MAX_VOLUME) * 100;
    localStorage.setItem("volume", volume);

    if (!fadeInNext && currVolume < oldVolume) {
        $elTrackPlayer.stop();

        if (currVolume < volume) fadeIn();
        else $elTrackPlayer[0].volume = volume;
    } else if (fadeInNext && currVolume < oldVolume && currVolume > volume) {
        $elTrackPlayer.stop();

        $elTrackPlayer[0].volume = volume;

        fadeOut();
    } else if (currVolume === oldVolume) $elTrackPlayer[0].volume = volume;

    if (volume / MAX_VOLUME > 2 / 3) {
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"></path><path d="M11.5 13.614a5.752 5.752 0 000-11.228v1.55a4.252 4.252 0 010 8.127v1.55z"></path></svg>';
    } else if (volume / MAX_VOLUME > 1 / 3) {
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 6.087a4.502 4.502 0 000-8.474v1.65a2.999 2.999 0 010 5.175v1.649z"></path></svg>';
    } else if (volume > 0) {
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"></path></svg>';
    } else {
        elMuteBtn.innerHTML =
            '<svg id="mute_img" viewBox="0 0 16 16"><path d="M13.86 5.47a.75.75 0 00-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 008.8 6.53L10.269 8l-1.47 1.47a.75.75 0 101.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 001.06-1.06L12.39 8l1.47-1.47a.75.75 0 000-1.06z"></path><path d="M10.116 1.5A.75.75 0 008.991.85l-6.925 4a3.642 3.642 0 00-1.33 4.967 3.639 3.639 0 001.33 1.332l6.925 4a.75.75 0 001.125-.649v-1.906a4.73 4.73 0 01-1.5-.694v1.3L2.817 9.852a2.141 2.141 0 01-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694V1.5z"></path></svg>';
    }

    document.documentElement.style.setProperty(
        "--pulse_size",
        volume === 0 ? 1 : (0.025 * volume) / MAX_VOLUME + 1.025
    );
    document.documentElement.style.setProperty(
        "--volume_slider_offset",
        (volume / MAX_VOLUME) * 100 + "%"
    );
    document.documentElement.style.setProperty(
        "--volume_slider_thumb_margin",
        (2 * volume) / MAX_VOLUME - 1 + "vh"
    );
}

function changeParams(newParams) {
    if (newParams.userPlaylistId !== undefined)
        document.getElementById("use_user_playlist").click();
    else if (newParams.featuredPlaylistId !== undefined)
        document.getElementById("use_featured_playlist").click();
    else if (
        newParams.query !== undefined ||
        newParams.maxSearchResults !== undefined
    )
        document.getElementById("use_search").click();
    else if (newParams.albumPlaylistURI !== undefined)
        document.getElementById("use_album_playlist").click();

    if (newParams.query && newParams.query.year && newParams.query.year === "-")
        newParams.query.year = "";

    params = { ...params, ...newParams };

    localStorage.setItem("params", JSON.stringify(params));

    updatePlayValidity();
}

function validYearString(yearString) {
    if (!yearString) return true;

    const years = yearString.split("-"),
        fromYear = parseInt(years[0]),
        toYear = parseInt(years[1]);

    return 0 <= fromYear && fromYear <= toYear && toYear <= CURR_YEAR;
}

function updatePlayValidity() {
    const elPlayBtn = document.getElementById("play_btn");

    if (
        (params.use === "user_playlist" && params.userPlaylistId) ||
        (params.use === "featured_playlist" && params.featuredPlaylistId) ||
        params.use === "liked_songs" ||
        params.use === "top_songs" ||
        (params.use === "search" &&
            Object.values(params.query).some((val) => val) &&
            validYearString(params.query.year)) ||
        (params.use === "album_playlist" && params.albumPlaylistURI)
    ) {
        elPlayBtn.disabled = false;
        elPlayBtn.className = "valid_play_btn";
        document.getElementById("toggle_advanced_params").disabled = false;
    } else {
        elPlayBtn.disabled = true;
        elPlayBtn.className = "";
        document.getElementById("toggle_advanced_params").disabled = true;
    }
}

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

function randomGenre() {
    const elGenre = document.getElementById("genre");

    if (elGenre.length === 1) return;

    elGenre.selectedIndex = Math.floor(
        Math.random() * (elGenre.length - 1) + 1
    );
    changeParams({ query: { ...params.query, genre: elGenre.value } });
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

function changeUser() {
    window.location = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join(
        "%20"
    )}&response_type=token&show_dialog=true`;
}

function clearSearch() {
    changeParams({
        query: { genre: "", year: "" },
    });
    updateParams();
}

function resetParams() {
    changeParams({
        ...DEFAULT_PARAMS,
        muteExplicit: params.muteExplicit,
        soundOnly: params.soundOnly,
    });
    updateParams();
}
