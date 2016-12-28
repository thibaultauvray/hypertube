var lib = {
	protectEntry : function(message) {
		// Return a the same string with escaped "<script>" tags to avoid code injection
		message = message.replace(/&/g, '&amp;');
		message = message.replace(/</g, '&lt;');
		message = message.replace(/>/g, '&gt;');
		return (message);
	},

	isValidName : function(name) {
		// A valid firstname and lastname should only contain alphabetic characters and special unicode locale characters
		var regex = /^([a-zA-Z\-èêéàôîïùñç]{2,17})$/;
		return regex.test(name);
	},

	isValidEmail : function(email) {
		// This function check the entry is a real mail address
		var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return regex.test(email);
	},

	isValidUsername : function(login) {
		// A valid username can only contain alpahnumeric characters, "-" and "_"
		var regex = /^([a-zA-Z\-0-9_]{4,17})$/;
		return regex.test(login);
	},

	isValidPassword : function(password) {
		// This function check if a password entered by a user is not a simple word without almost one number
		var lowercase = /^(?=.*[a-z]).+$/,
			number = /^(?=.*[0-9]).+$/;

		if (password.length > 4 && password.length < 17 && number.test(password) && lowercase.test(password))
			return (true);
		return (false);
	},

	hasValidExtension : function(file) {
		var allowedTypes = ['png', 'jpg', 'jpeg', 'gif'],
			fileType = file.name.split('.').pop().toLowerCase();

		if (allowedTypes.indexOf(fileType) !== -1)
			return (true);
		return(false);
	}
};

$( function() {
	if (window.location.href.indexOf("library") != -1 || window.location.href.indexOf("search") != -1) {
		function hideNshow() {
			$(".movie-infos").each(function (i, v) {
				note = $(v).find("p > strong").text().split(" ")[2];
				if (note == "null" || note == "N/A")
					note = 0;
				date = $(v).find("h4").text().split("(")[1].slice(0, -1);
				noteMin = parseInt($("#amount").val().split(" ")[0]);
				noteMax = parseInt($("#amount").val().split(" ")[3]);
				dateMin = parseInt($("#amount-year").val().split(" ")[0]);
				dateMax = parseInt($("#amount-year").val().split(" ")[2]);
				if ((note >= noteMin && note <= noteMax) && (date >= dateMin && date <= dateMax))
					$(this).parent().parent().show();
				else {
					$(this).parent().parent().hide();
				}
			});
		}

		$("#slider-range").slider({
			range: true,
			min: 0,
			max: 10,
			values: [5, 10],
			slide: function (event, ui) {
				$("#amount").val(ui.values[0] + " ★ - " + ui.values[1] + " ★");
				hideNshow();
			}
		});
		$("#year-range").slider({
			range: true,
			min: 1960,
			max: new Date().getFullYear(),
			values: [2006, new Date().getFullYear()],
			slide: function (event, ui) {
				$("#amount-year").val(ui.values[0] + " - " + ui.values[1]);
				hideNshow();
			}
		});
		$("#amount").val($("#slider-range").slider("values", 0) + " ★ - " + $("#slider-range").slider("values", 1) + " ★");
		$("#amount-year").val($("#year-range").slider("values", 0) + " - " + $("#year-range").slider("values", 1));
		$(document).ready( hideNshow() );
	}
} );