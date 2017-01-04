(function () {
	var skip = 0,
		limit = 18,
		sort = 'movie.title',
		order = 1,
		genres = 'All',
		notDetected = true;

	$('.poster').on({
		'mouseover' : function() {
			$(this).children('.resolutions').removeClass('hidden');
		},
		'mouseout' : function() {
			$(this).children('.resolutions').addClass('hidden');
		}
	});

	function getMovies(skip, limit, sort, order, genres) {
		$.post('/api/library/movies/get', {
			skip : skip,
			limit : limit,
			sort : sort,
			order : order,
			genres: genres
		}).done(function(data) {
			if (data.state === 'success') {
				$.each(data.movies, function(index, movie) {
					$('#getMovies').append('<div class="col-md-4 col-sm-6 col-xs-12"><div class="movie" id="' + movie.torrent.id + '"><div class="poster" style="background-image: url(' + movie.movie.poster + ');"><div class="resolutions hidden"></div></div><div class="movie-infos"><h4><a href="/app/player/' + movie.torrent.id + '">' + movie.movie.title + '</a> (' + movie.movie.year + ')</h4><small class="movie-basics text-muted"><span class="rated">' + movie.movie.rated + '</span>' + movie.movie.runtime + ' min' + ' - ' + movie.movie.genres + '</small><p class="imdb-rating"><strong>IMDB Rating: ' + movie.movie.imdb.rating + '</strong>/10 (' + movie.movie.imdb.votes + ')</p><p class="plot"><em>' + '<small class="movie-basics text-muted">' + movie.torrent.name + '</small>' + '</div></div></div>');
			
					// $.each(movie.movie.resolutions, function(index, resolution) {
					// 	$('#getMovies #' + movie.movie._id + ' .resolutions').append('<a href="/player/html5/' + movie.movie._id + '/' + resolution.resolution + '" type="button" class="btn btn-resolution btn-sm"><i class="fa fa-play-circle" aria-hidden="true"></i> <strong>' + resolution.resolution + '</strong> <em>(' + resolution.seeds + ')</em></a>');
					// });
				});

			} else {
				console.log('No more movies found.');
				// $(window).off('scroll');
				// notDetected = false;
			}
		});
	}

	$(document).ready(function() {
		$('#getMovies').empty();
		getMovies(skip, limit, sort, order, genres);
		skip += 18;
	});

	$("select[name='genres']").change( function(){
			genres = $("select[name='genres'] > option:selected").val();
			$('#getMovies').empty();
			getMovies(skip, limit, sort, order, genres);
			skip += 18;
	});

	$('#filter-a-z').on('click', function() {
		$('#filters > button').each(function() {
			$(this).removeClass('btn-primary').addClass('btn-default');
		});
		$(this).removeClass('btn-default').addClass('btn-primary');
		sort = 'movie.title';
		skip = 0;
		order = 1;
		$('#getMovies').empty();
		getMovies(skip, limit, sort, order, genres);
		skip += 18;
	});

	$('#filter-z-a').on('click', function() {
		$('#filters > button').each(function() {
			$(this).removeClass('btn-primary').addClass('btn-default');
		});
		$(this).removeClass('btn-default').addClass('btn-primary');
		sort = 'movie.title';
		skip = 0;
		order = -1;
		$('#getMovies').empty();
		getMovies(skip, limit, sort, order, genres);
		skip += 18;
	});

	$('#filter-note').on('click', function() {
		$('#filters > button').each(function() {
			$(this).removeClass('btn-primary').addClass('btn-default');
		});
		$(this).removeClass('btn-default').addClass('btn-primary');
		sort = 'movie.imdb.rating';
		skip = 0;
		order = -1;
		$('#getMovies').empty();
		getMovies(skip, limit, sort, order, genres);
		skip += 18;
	});

	$('#filter-year').on('click', function() {
		$('#filters > button').each(function() {
			$(this).removeClass('btn-primary').addClass('btn-default');
		});
		$(this).removeClass('btn-default').addClass('btn-primary');
		sort = 'movie.year';
		skip = 0;
		order = -1;
		$('#getMovies').empty();
		getMovies(skip, limit, sort, order, genres);
		skip += 18;
	});

	// $(window).on('scroll', function() {
	// 	if($(window).scrollTop() + $(window).height() > $(document).height() - .001 * $(document).height() && notDetected) {
	// 		notDetected = false;
	// 		getMovies(skip, limit);
	// 		skip += 18;
	// 		notDetected = true;
	// 	}
	// });

})();
