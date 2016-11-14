var forgotPassword = function(req, res, next) {
	//console.log(req.session);
	res.render('forgot-password', {
		isApp : false,
		title : 'Hypertube - Forgot Password'
	});
};

module.exports = forgotPassword;
