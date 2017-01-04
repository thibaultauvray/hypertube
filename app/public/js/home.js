(function () {
	$('#register').on({
		'mouseover' : function() {
			$(this).removeClass('btn-link').addClass('btn-primary');
			$('#login').removeClass('btn-primary').addClass('btn-link');
		},
		'mouseout' : function() {
			$(this).removeClass('btn-primary').addClass('btn-link');
			$('#login').removeClass('btn-link').addClass('btn-primary');
		}
	});
})();