(function() {
	if (location.pathname === '/app/profile')
		$('li.profile-nav').addClass('active');
	if (location.pathname === '/app/library')
		$('li.library-nav').addClass('active');
	if (location.pathname === '/app/search')
		$('li.library-nav').addClass('active');

	$(document).ready(function() {
		if ($('#lang-choice').data('user-lang') === 'EN')
			$('#EN').attr('disabled', true);
		if ($('#lang-choice').data('user-lang') === 'FR')
			$('#FR').attr('disabled', true);
	});

	var query = "";

	$('#search-field').on('input change', function() {
		if ($(this).val().length > 0) {
			$('#search-btn').removeAttr('disabled');
			$('#search-yts').removeAttr('disabled');
			$('#search-tpb').removeAttr('disabled');
			query = lib.protectEntry($(this).val());
		} else {
			$('#search-btn').attr('disabled', true);
			$('#search-yts').attr('disabled', true);
			$('#search-tpb').attr('disabled', true);
		}
	});

	$('#search-form').on('submit', function(e) {
		e.preventDefault();

		var btn = $(this).find("button[type=submit]:focus");
		switch (btn[0].id){
			case "search-btn":
				search = "yts";
				break;
			case "search-yts":
				search = "yts";
				break;
			case "search-tpb":
				search = "tpb";
				break;
		}
		if (query && query.length > 0)
		window.location = '/app/search/' + query;
	});

	$('#lang-choice > button').on('click', function() {
		var self = this;

		$.post('/api/user/lang/set', { lang : $(self).data('lang') })
			.done(function(data) {
				if (data.state === 'success') {
					$('#lang-choice > button').removeAttr('disabled');
					$(self).attr('disabled', true);
				}
			});
	});

})();
