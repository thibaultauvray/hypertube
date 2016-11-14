var resetPassword = function(req, res, next) {
	//console.log(req.session);
	res.render('reset-password', {
		isApp : false,
		title : 'Hypertube - Reset Password',
		username : req.params.username,
		token : req.params.token
	});
};

module.exports = resetPassword;
